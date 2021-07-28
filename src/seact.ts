const TEXT_ELEMENT = 'TEXT_ELEMENT' as const
type SFiberCommonProperties = {
  dom?: Container | null
  parent?: HTMLFiberElement
  child?: SFiber
  sibling?: SFiber
  props: {
    children: SFiber[]
  }
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

  const isProperty = (key: string) => key !== 'children'
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      // @ts-ignore TODO
      dom[name] = fiber.props[name]
    })
  return dom
}

function render(element: SFiber, container: Container): void {
  nextUnitOfWork = {
    dom: container,
    // @ts-ignore 型がハマらない
    props: {
      children: [element],
    },
  }
}

let nextUnitOfWork: SFiber | null | undefined = null

function workLoop(deadline: any): void {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }
  // NOTE: https://github.com/microsoft/TypeScript/issues/40807
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(fiber: SFiber): SFiber | undefined {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  if (fiber.parent && fiber.parent.dom) {
    fiber.parent.dom.appendChild(fiber.dom)
  }

  const elements = fiber.props.children
  let prevSibling: SFiber | null = null

  // NOTE: create a newFiber for each child
  for (let index = 0; index < elements.length; index++) {
    const element = elements[index]
    const newFiber: SFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    }
    if (index === 0) {
      fiber.child = newFiber
    } else if (prevSibling) {
      prevSibling.sibling = newFiber
    } else {
      UNREACHED()
    }

    prevSibling = newFiber
  }

  if (fiber.child) {
    return fiber.child
  }
  let nextFiber: SFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    if (nextFiber.parent) {
      nextFiber = nextFiber.parent
    } else {
      UNREACHED()
    }
  }
}

export const Seact = {
  render,
}
