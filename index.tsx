import { createElement, render, useState } from './src/seact.js'

type Props = {
  name: string
}
const container = document.getElementById('root')

const updateValue = (e: any) => {
  rerender(e.target.value)
}

function Counter() {
  const [state, setState] = useState(0)
  return (
    <div onClick={() => setState((c: number) => c + 1)}>
      <h3>Your counter</h3>
      <div>Counter: {state}</div>
    </div>
  )
}
const Piyo = (props: Props) => (
  <div>
    <h3>My name is {props.name}</h3>
  </div>
)

const rerender = (value: string) => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
      <Piyo name={value} />
      <Counter />
    </div>
  )
  render(element, container as HTMLElement)
}

if (container) {
  rerender('World')
} else {
  console.warn('No container')
}
