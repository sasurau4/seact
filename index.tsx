import { createElement, render, useState } from './src/seact.js'

type Props = {
  name: string
}
const container = document.getElementById('root')

function Counter() {
  const [state, setState] = useState(0)
  return (
    <div>
      <h3>Your counter</h3>
      <div>Count: {state}</div>
      <div>
        <button onClick={() => setState((c: number) => c + 1)}>
          increment
        </button>
      </div>
      <div>
        <button onClick={() => setState((c: number) => c - 1)}>
          decrement
        </button>
      </div>
    </div>
  )
}

type IntroduceProps = {
  initialName: string
}
function Introduce(props: IntroduceProps) {
  const [name, setName] = useState(props.initialName)
  return (
    <div>
      <input
        onInput={(e) => {
          // @ts-ignore
          setName(() => e.target.value)
        }}
        value={name}
      />
      <Piyo name={name} />
    </div>
  )
}

const Piyo = (props: Props) => (
  <div>
    <h3>My name is {props.name}</h3>
  </div>
)

function App() {
  return (
    <div>
      <h1>This is Seact!!!</h1>
      <Introduce initialName="your name" />
      <Counter />
    </div>
  )
}
// This is needed for current seact because no root createElement is not supported
const element = <App />

if (container) {
  render(element, container as HTMLElement)
} else {
  console.warn('No container')
}
