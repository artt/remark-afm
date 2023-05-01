import { visit } from 'unist-util-visit'
import { h } from 'hastscript'

export default function foo() {
  return (tree) => {
    visit(tree, (node) => {
      if (['textDirective', 'leafDirective', 'containerDirective'].includes(node.type)) {
        console.log('Directive found: ', node)
        const data = node.data || (node.data = {})
        const hast = h(node.name, node.attributes)
        if (['note', 'tip'].includes(data.hName)) {
          data.hName = 'div'
          data.hProperties = { className: ['alert', data.hName] }
          // data.hName = hast.tagName
          // data.hProperties = hast.properties
        }
      }
    })
  }
}
