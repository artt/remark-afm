import { visit } from 'unist-util-visit'
import { h } from 'hastscript'

export default function foo() {
  return (tree) => {
    visit(tree, (node) => {
      if (['textDirective', 'leafDirective', 'containerDirective'].includes(node.type)) {
        const data = node.data || (node.data = {})
        const hast = h(node.name, node.attributes)
        if (['tip', 'info', 'note', 'warning', 'danger'].includes(node.name)) {
          if (node.children && node.children[0].data?.directiveLabel) {
            node.children[0].data.hName = 'AlertTitle'
            node.children[0].data.hProperties = { type: node.name }
          }
          else {
            node.children.unshift({
              type: 'paragraph',
              data: {
                hName: 'AlertTitle',
                hProperties: { type: node.name }
              },
              children: [],
            })
          }
          data.hName = 'blockquote'
          data.hProperties = { className: [`alert-${node.name}`] }
          // data.hName = hast.tagName
          // data.hProperties = hast.properties
        }
      }
    })
  }
}
