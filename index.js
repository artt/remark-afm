import { visit } from 'unist-util-visit'
import { h } from 'hastscript'

export default function foo() {
  return (tree) => {
    visit(tree, (node) => {
      if (['textDirective', 'leafDirective', 'containerDirective'].includes(node.type)) {
        const data = node.data || (node.data = {})
        const hast = h(node.name, node.attributes)
        console.log(data, hast)
        if (['note', 'tip'].includes(node.name)) {
          data.hName = 'div'
          data.hProperties = { className: ['alert', `alert-${node.name}`] }
          // data.hName = hast.tagName
          // data.hProperties = hast.properties
        }
      }
    })
  }
}
