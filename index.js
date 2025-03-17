import { visit } from 'unist-util-visit'
// import { h } from 'hastscript'


function processAlertBlocks(node) {
  const data = node.data || (node.data = {})
  if (node.children && node.children[0].data?.directiveLabel) {
    // with title node
    if (node.children[0].children.length === 0) {
      // if title is empty, then remove this node
      node.children.shift()
    }
    else {
      // if title is not empty, then convert to a div
      node.children[0].data.hName = 'div'
      node.children[0].data.hProperties = { class: "alert-title" }
    }
  }
  else {
    // without title node
    node.children.unshift({
      type: 'paragraph',
      data: {
        hName: 'div',
        hProperties: { class: "alert-title" }
      },
      children: [ { type: 'text', value: node.name.charAt(0).toUpperCase() + node.name.slice(1) } ],
    })
  }
  data.hName = 'blockquote'
  data.hProperties = { className: [`alert-${node.name}`] }
  if (node.attributes.id) {
    data.hProperties.id = node.attributes.id
  }
  // data.hName = hast.tagName
  // data.hProperties = hast.properties
}

export default function foo() {
  return async (tree) => {

    visit(tree, (node, index, parent) => {

      /*
      containerDirectives (:::+) include
      - alert types (tip, info, note, warning, danger)
      - figure
      */
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

      if (node.type === "leafDirective") {

      }

      // if (
      //   node.type === 'containerDirective' ||
      //   node.type === 'leafDirective' ||
      //   node.type === 'textDirective'
      // ) {
      //   const data = node.data || (node.data = {})
      //   const hast = h(node.name, node.attributes || {})

      //   data.hName = hast.tagName
      //   data.hProperties = hast.properties
      // }

      /*
      textDirectives (:) include
      - source (for figures)
      - standard html tags: abbr, h1-h6
      - in progress: citet, citep
      */
      if (node.type === "textDirective") {
        // default processor
        if (node.name === "source" || node.name === "note") {
          // check if the node's parent is a figure
          if (parent.type === "containerDirective" && parent.name === "figure") {
            const data = node.data || (node.data = {})
            data.hName = 'FigNote'
            data.hProperties = {
              className: ["fignote"],
              type: node.name,
            }
          }
        }
        if (node.name === "abbr") {
          const data = node.data || (node.data = {})
          data.hName = 'abbr'
          data.hProperties = {
            title: node.attributes.title,
          }
        }
      }

      // for raw images, convert the wrapping element to figure
      if (node.type === "paragraph" && node.children?.length === 1) {
        const child = node.children[0]
        if (child.type === "image") {
          tree.children.splice(index, 1, {
            type: 'figure',
            data: {
              hName: "figure",
            },
            children: [child],
          })
        }
      }

      // kbd
      if (node.type === "mdxJsxTextElement" && node.name === "kbd" && node.data?._mdxExplicitJsx) {
        node.name = "span"
        node.attributes = [
          {
            type: 'mdxJsxAttribute',
            name: 'class',
            value: 'kbd-container',
          },
        ]
        const keys = node.children[0].value.split("+")
        // convert each into <kbd> element, join with ' + '
        node.children = keys.map((key) => {
          return {
            type: 'mdxJsxTextElement',
            name: 'kbd',
            attributes: [],
            children: [
              {
                type: 'text',
                value: key,
              },
            ],
          }
        }).reduce((prev, curr) => {
          if (prev.length === 0) {
            return [curr]
          }
          return [...prev, { type: 'text', value: ' + ' }, curr]
        }, [])

      }
    })

  }
}
