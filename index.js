import { visit } from 'unist-util-visit'
import { h } from 'hastscript'

export default function foo() {
  return (tree) => {
    visit(tree, (node) => {
      if (['textDirective', 'leafDirective', 'containerDirective'].includes(node.type)) {
        const data = node.data || (node.data = {})
        const hast = h(node.name, node.attributes)
        if (['tip'].includes(node.name)) {
          if (node.children && node.children[0].data?.directiveLabel) {
            node.children[0].data.hName = 'h5'
          }
          console.log(node.children[0])
          console.log(hast)
          data.hName = 'blockquote'
          data.hProperties = { className: [`alert-${node.name}`] }
          // data.hName = hast.tagName
          // data.hProperties = hast.properties
        }
      }
    })
  }
}
