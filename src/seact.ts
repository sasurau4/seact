const TEXT_ELEMENT = 'TEXT_ELEMENT' as const
const UPDATE_EFFECT_TAG = 'UPDATE' as const
const PLACEMENT_EFFECT_TAG = 'PLACEMENT' as const
const DELETION_EFFECT_TAG = 'DELETION' as const
type EFFECT_TAG =
  | typeof UPDATE_EFFECT_TAG
  | typeof PLACEMENT_EFFECT_TAG
  | typeof DELETION_EFFECT_TAG

type SFiberCommonProperties = {
  dom?: Container | null
  parent?: HTMLFiberElement
  child?: SFiber
  sibling?: SFiber
  props: {
    children: SFiber[]
  }
  alternate?: SFiber | null
  effectTag?: EFFECT_TAG
}

type TextFiberElement = {
  type: typeof TEXT_ELEMENT
  props: {
    nodeValue: string
  }
} & SFiberCommonProperties
type HTMLFiberElement = {
  type: string
} & SFiberCommonProperties

type SFiber = TextFiberElement | HTMLFiberElement

type Container = HTMLElement | Text

// same as UNREACHED macro in Rust
function UNREACHED(): Error {
  throw new Error('UNREACHED!')
}

function createTextElement(text: string): TextFiberElement {
  return {
    type: 'TEXT_ELEMENT',
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

function createDom(fiber: SFiber): HTMLElement | Text {
  const dom =
    fiber.type === TEXT_ELEMENT
      ? document.createTextNode('')
      : document.createElement(fiber.type)

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
  dom: Container,
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

function commitWork(fiber: SFiber | undefined) {
  if (!fiber) {
    return
  }
  if (fiber.parent && fiber.parent.dom) {
    const domParent = fiber.parent.dom
    if (fiber.effectTag === PLACEMENT_EFFECT_TAG && fiber.dom) {
      domParent.appendChild(fiber.dom)
    } else if (fiber.effectTag === UPDATE_EFFECT_TAG && fiber.dom) {
      if (fiber.alternate) {
      console.log("updateDom", fiber.type)
        updateDom(fiber.dom, fiber.alternate.props, fiber.props)
      } else {
        UNREACHED()
      }
    } else if (fiber.effectTag === DELETION_EFFECT_TAG && fiber.dom) {
      domParent.removeChild(fiber.dom)
    }
  } else {
    UNREACHED()
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}
function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot?.child)
  currentRoot = wipRoot
  wipRoot = null
}

function reconcileChildren(wipFiber: SFiber, elements: SFiber[]) {
  console.log("reconcile!")
  let index: number = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling: SFiber | undefined | null = null
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
        dom: null,
        parent: wipFiber,
        alternate: null,
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

function performUnitOfWork(fiber: SFiber): SFiber | undefined {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  const elements = fiber.props.children
  reconcileChildren(fiber, elements)

  if (fiber.child) {
    return fiber.child
  }
  let nextFiber: SFiber|undefined = fiber
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
let nextUnitOfWork: SFiber | null | undefined = null
let currentRoot: SFiber | null | undefined = null
let wipRoot: SFiber | null | undefined = null
let deletions: SFiber[] = []

// main loop
requestIdleCallback(workLoop)

export function render(element: SFiber, container: Container): void {
  wipRoot = {
    dom: container,
    // @ts-ignore 型がハマらない
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}
