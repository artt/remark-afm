import { visit } from 'unist-util-visit'
import { h } from 'hastscript'

function processAlertBlocks(node) {
  const data = node.data || (node.data = {})
  if (node.children && node.children[0].data?.directiveLabel) {
    // with title node
    node.children[0].data.hName = 'AlertTitle'
    node.children[0].data.hProperties = { type: node.name }
  }
  else {
    // without title node
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

export default function foo() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type === "containerDirective") {
        if (['tip', 'info', 'note', 'warning', 'danger'].includes(node.name)) {
          processAlertBlocks(node)
          return
        }
        if (node.name === "figure") {
          const data = node.data || (node.data = {})
          data.hName = "figure"
          let children = []
          node.children.forEach((child) => {
            if (child.type === "paragraph") {
              children = children.concat(child.children)
            }
            else {
              children.push(child)
            }
          })
          node.children = children
        }
      }
      if (['textDirective', 'leafDirective', 'containerDirective'].includes(node.type)) {
        // default processor
        if (node.name === "source" || node.name === "note") {
          const data = node.data || (node.data = {})
          data.hName = 'FigNote'
          data.hProperties = {
            className: ["fignote", `fignote-${node.name}`],
            type: node.name,
          }
        }
      }
    })
  }
}
