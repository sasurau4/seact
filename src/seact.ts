const TEXT_ELEMENT = 'TEXT_ELEMENT' as const
type TextElement = {
  type: typeof TEXT_ELEMENT
  props: {
    nodeValue: string
    children: never[]
  }
}
type DomElement = {
  type: string
  props: {
    nodeValue?: string
    children: SElement[]
  }
}

type SElement = TextElement | DomElement

function createTextElement(text: string): TextElement {
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
): SElement {
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

function render(element: SElement, container: HTMLElement | Text) {
  const dom =
    element.type === TEXT_ELEMENT
      ? document.createTextNode('')
      : document.createElement(element.type)

  const isProperty = (key: string) => key !== 'children'
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      // @ts-ignore TODO
      dom[name] = element.props[name]
    })
  element.props.children.forEach((child) => {
    render(child, dom)
  })

  container.appendChild(dom)
}

export const Seact = {
  render,
}
