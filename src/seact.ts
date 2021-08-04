const TEXT_ELEMENT = 'TEXT_ELEMENT' as const
const UPDATE_EFFECT_TAG = 'UPDATE' as const
const PLACEMENT_EFFECT_TAG = 'PLACEMENT' as const
const DELETION_EFFECT_TAG = 'DELETION' as const
type EFFECT_TAG =
  | typeof UPDATE_EFFECT_TAG
  | typeof PLACEMENT_EFFECT_TAG
  | typeof DELETION_EFFECT_TAG

type SFiberCommonProperties = {
  dom?: DOMElement
  parent?: HTMLFiberElement
  child?: SFiber
  sibling?: SFiber
  props: {
    children: SFiber[]
  }
  alternate?: SFiber
  effectTag?: EFFECT_TAG
  hooks?: any[]
}

type TextFiberElement = {
  type: string
  props: {
    nodeValue?: string
  }
} & SFiberCommonProperties
type HTMLFiberElement = {
  type: string | Function
} & SFiberCommonProperties

type SFiber = TextFiberElement | HTMLFiberElement

type DOMElement = HTMLElement | Text

// same as UNREACHED macro in Rust
function UNREACHED(): Error {
  throw new Error('UNREACHED!')
}

function createTextElement(text: string): TextFiberElement {
  return {
    type: TEXT_ELEMENT,
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

export function createElement(
  type: string,
  props?: Record<string, string> | null,
  ...children: any[]
): SFiber {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === 'object' ? child : createTextElement(child),
      ),
    },
  }
}

export function useState<State = any>(initialState: State): [State, Function] {
  type Action = (prevState: State) => State
  const oldHook = wipFiber?.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state :initialState,
    queue: [] as Action[],
  }
  const actions = oldHook ? oldHook.queue as Action[] : [] as Action[]
  actions.forEach(action=> {
    hook.state = action(hook.state)
  });
  const setState = (action: Action) => {
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot?.dom,
      // @ts-ignore
      props: currentRoot?.props,
      alternate: currentRoot,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipFiber?.hooks?.push(hook)
  hookIndex++
  return [hook.state, setState]
}

function createDom(fiber: SFiber): HTMLElement | Text {
  const dom =
    fiber.type === TEXT_ELEMENT
      ? document.createTextNode('')
      // NOTE: createDom function caller guard fiber.type as string
      : document.createElement(fiber.type as string)

  updateDom(dom, {}, fiber.props)
  return dom
}

type GeneralProps = Record<string, any>
const isEvent = (key: string) => key.startsWith('on')
const isProperty = (key: string) => key !== 'children' && !isEvent(key)
const isNew = (prev: GeneralProps, next: GeneralProps) => (key: string) =>
  prev[key] !== next[key]
const isGone = (prev: GeneralProps, next: GeneralProps) => (key: string) =>
  !(key in next)

function updateDom(
  dom: DOMElement,
  prevProps: GeneralProps,
  nextProps: GeneralProps,
) {
  // Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Remove old props
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      // @ts-ignore DOM assignment
      dom[name] = ''
    })

  // Set new or changed props
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      // @ts-ignore DOM assignment
      dom[name] = nextProps[name]
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}

function commitDeletion(fiber: SFiber | undefined, domParent: DOMElement) {
  if (!fiber) {
    UNREACHED()
    return
  }

  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

function commitWork(fiber: SFiber | undefined) {
  if (!fiber) {
    return
  }
  if (fiber.parent) {
    let domParentFiber: HTMLFiberElement = fiber.parent
    while (!domParentFiber.dom) {
      // @ts-ignore parent always exist
      domParentFiber = domParentFiber.parent
    }
    const domParent = domParentFiber.dom
    if (fiber.effectTag === PLACEMENT_EFFECT_TAG && fiber.dom) {
      domParent.appendChild(fiber.dom)
    } else if (fiber.effectTag === UPDATE_EFFECT_TAG && fiber.dom) {
      if (fiber.alternate) {
        updateDom(fiber.dom, fiber.alternate.props, fiber.props)
      } else {
        UNREACHED()
      }
    } else if (fiber.effectTag === DELETION_EFFECT_TAG && fiber.dom) {
      commitDeletion(fiber, domParent)
    }
  } 
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}
function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot?.child)
  currentRoot = wipRoot
  wipRoot = undefined
}

function reconcileChildren(wipFiber: SFiber, elements: SFiber[]) {
  let index: number = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling: SFiber | undefined = undefined
  // NOTE: create a newFiber for each child
  while (index < elements.length || oldFiber) {
    const element = elements[index]
    let newFiber: SFiber | undefined = undefined
    const sameType = oldFiber && element && element.type == oldFiber.type

    // Update existing element props
    if (sameType && oldFiber && element) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: UPDATE_EFFECT_TAG,
      }
    }
    // Create new element
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: undefined,
        parent: wipFiber,
        alternate: undefined,
        effectTag: PLACEMENT_EFFECT_TAG,
      }
    }
    // Remove existing element
    if (oldFiber && !sameType) {
      oldFiber.effectTag = DELETION_EFFECT_TAG
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }
    // NOTE: newFiber is child if the first child and is sibling otherwise
    if (index === 0) {
      wipFiber.child = newFiber
    } else if (prevSibling) {
      prevSibling.sibling = newFiber
    } else {
      UNREACHED()
    }

    prevSibling = newFiber
    index++
  }
}

function updateFunctionComponent(fiber: SFiber) {
  if (!(fiber.type instanceof Function)) {
    UNREACHED()
    return
  }
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = []
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function updateHostComponent(fiber: SFiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

function performUnitOfWork(fiber: SFiber): SFiber | undefined {
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  if (fiber.child) {
    return fiber.child
  }
  let nextFiber: SFiber | undefined = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

function workLoop(deadline: any): void {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
  // NOTE: https://github.com/microsoft/TypeScript/issues/40807
  requestIdleCallback(workLoop)
}

/**
 * Global Vars
 */
let nextUnitOfWork: SFiber | undefined = undefined
let currentRoot: SFiber | undefined = undefined
let wipRoot: SFiber | undefined = undefined
let deletions: SFiber[] = []
let wipFiber: SFiber | undefined = undefined
let hookIndex: number = 0

// main loop
requestIdleCallback(workLoop)

export function render(element: SFiber, container: DOMElement): void {
  // @ts-ignore
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}
