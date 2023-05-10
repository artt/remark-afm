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

  const commonOptions = {
    lang,
    // lineOptions,
  }

  const highlightedDark = highlighter.codeToHtml(node.value, {
    ...commonOptions,
    theme: darkTheme,
  }).replace(`class="shiki`, `class="shiki shiki-dark`)
  const highlightedLight = highlighter.codeToHtml(node.value, {
    ...commonOptions,
    theme: lightTheme,
  }).replace(`class="shiki`, `class="shiki shiki-light"`)

  node.type = 'html'
  node.value = highlightedDark + "\n" + highlightedLight
}

export default function foo() {
  return async (tree) => {
    const highlighter = await shiki.getHighlighter({ themes: [darkTheme, lightTheme] })
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
      if (node.type === "code") {
        processCode(node, highlighter)
        console.log(node)
      }
    })
  }
}
