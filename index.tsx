import { createElement, render } from './src/seact.js'

type Props = {
  name: string
}
const container = document.getElementById('root')

const updateValue = (e: any) => {
  console.log(e)
  rerender(e.target.value)
}

const rerender = (value:string) => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
    </div>
  )
  render(element, container as HTMLElement)
}


if (container) {
  rerender("World")
} else {
  console.warn('No container')
}
// ReactDOM.render(element, container)
