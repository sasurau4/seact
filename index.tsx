import { Seact, createElement } from './src/seact.js'
// const element = Seact.createElement(
//   'div',
//   { id: 'foo' },
//   Seact.createElement('a', null, 'bar'),
//   Seact.createElement('b'),
// )

const element: any = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
)

const container = document.getElementById('root')
if (container) {
  Seact.render(element, container)
} else {
  console.warn('No container')
}
// ReactDOM.render(element, container)
