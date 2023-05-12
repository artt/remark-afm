import { visit } from 'unist-util-visit'
import { h } from 'hastscript'
import * as shiki from 'shiki'

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

const darkTheme = "dark-plus"
const lightTheme = "light-plus"

function processCode(node, highlighter) {
  const ignoreUnknownLanguage = false
  const lang =
    ignoreUnknownLanguage && !loadedLanguages.includes(node.lang)
      ? null
      : node.lang

  // const lineOptions = parseMeta(node.meta, node)

  const tokenizedDark = highlighter.codeToThemedTokens(node.value, lang, darkTheme)
  const tokenizedLight = highlighter.codeToThemedTokens(node.value, lang, lightTheme)

  const lineOptions = []

  const highlightedDark = shiki.renderToHtml(tokenizedDark, {
    lineOptions,
  }).replace(`class="shiki`, `class="shiki shiki-dark`)

  const highlightedLight = shiki.renderToHtml(tokenizedLight, {
    lineOptions,
  }).replace(`class="shiki`, `class="shiki shiki-light`)

  node.type = 'html'
  node.value = highlightedDark + "\n" + highlightedLight
}

export default function foo() {
  return async (tree) => {

    let printThis = false
    const highlighter = await shiki.getHighlighter({ themes: [darkTheme, lightTheme] })

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

      /*
      textDirectives (:) include
      - source (for figures)
      - standard html tags: abbr, h1-h6
      - in progress: citet, citep
      */
      if (node.type === "textDirective") {
        // default processor
        if (node.name === "source" || node.name === "note") {
          const data = node.data || (node.data = {})
          data.hName = 'FigNote'
          data.hProperties = {
            className: ["fignote", `fignote-${node.name}`],
            type: node.name,
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

      if (node.type === "code") {
        processCode(node, highlighter)
        printThis = true
      }


      // // wrap image in figure if not already wrapped
      // if (node.type === "image" && printThis) {
      //   if (parent.type !== "figure") {
      //     console.log(parent)
      //     parent.children.splice(index, 1, {
      //       type: "figure",
      //       data: {
      //         hName: "figure",
      //       },
      //       children: [node],
      //     })
      //   }
      // }

      // unwrap paragraphs from stuff that are not necessary
      // h[1-6]

      if (node.type === "paragraph" && node.children?.length === 1) {
        const child = node.children[0]
        if (/h[1-6]/.test(child.name)) {
          tree.children.splice(index, 1, {
            type: 'heading',
            depth: parseInt(child.name[1]),
            children: child.children,
          })
        }
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
        
    })

    
  }
}
