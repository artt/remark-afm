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

// thanks largely to this https://www.hoeser.dev/blog/2023-02-01-syntax-highlight/
function processCode(node, highlighter) {

  const ignoreUnknownLanguage = false
  const lang =
    ignoreUnknownLanguage && !loadedLanguages.includes(node.lang)
      ? null
      : node.lang

  // const lineOptions = parseMeta(node.meta, node)

  let tokenizedDark = highlighter.codeToThemedTokens(node.value, lang, darkTheme)
  let tokenizedLight = highlighter.codeToThemedTokens(node.value, lang, lightTheme)

  // extract commands from tokenized code

  const isTokenComment = (token) => {
    return (token.explanation || []).some((explanation) =>
      explanation.scopes.some((scope) => scope.scopeName.startsWith('comment.'))
    )
  }

  const extractCommandsFromLine = (line) => {
    const shikierCommandsExtractor = /\[sh!(?<commands>[^\]]*)\]/g;
    const commands = []
    for (const token of line.filter(isTokenComment)) {
      const match = shikierCommandsExtractor.exec(token.content);
      if (match) {
        let offset = 0
        // remove the entire comment token from the line
        // unless the comment contains other stuff
        const newContent = token.explanation[token.explanation.length - 1].content.replace(shikierCommandsExtractor, '').trim()
        if (newContent !== '') {
          // the comment contains other stuff
          line.splice(line.findIndex((t) => t === token), 1, {
            ...token,
            content: token.content.replace(shikierCommandsExtractor, '').trimRight()
          })
        }
        else {
          // just commands in the comment
          // so we can just remove the entire comment token
          line.splice(line.findIndex((t) => t === token), 1)
          // check if there's other non-empty tokens in this line
          // if not then remove the line by replacing it with [ null ]
          // this line will be removed later on
          // we also want to apply the command to the next line, if not otherwise specified
          if (line.every(t => t.content.trim() === "")) {
            line.splice(0, line.length, null)
            offset = 1
          }
        }
        commands.push(...match?.groups?.commands.trim().split(/\s+/).map(command => {
          if (!command.includes('=')) {
            return `${command}=${offset}`
          }
          return command
        }))
      }
    }
    return commands
  }

  const resolveCommandShortcuts = (command) => { 
    return (
      {
        '++': 'add',
        '--': 'remove',
        '~~': 'highlight',
        '**': 'focus',
      }[command] || command
    )
  }

  let lineCommands = Array.from(Array(tokenizedDark.length), () => [])
  const lineOptions = []

  /*
  Given command like `highlight=1,3-5`, returns the command and applicable line numbers: { command: 'highlight', lineOffsets: [1, 3, 4, 5] }
  Written by Copilot
  */
  const processRawCommands = (commands) => {
    const lineOffsets = []
    const command = commands.split('=')[0]
    const rawLineOffsets = commands.split('=')[1]
    rawLineOffsets.split(',').forEach((rawLineOffset) => {
      if (rawLineOffset.includes('-')) {
        const [start, end] = rawLineOffset.split('-').map(Number)
        for (let i = start; i <= end; i++) {
          lineOffsets.push(i)
        }
      }
      else {
        lineOffsets.push(Number(rawLineOffset))
      }
    })
    return { command, lineOffsets }
  }

  tokenizedDark.forEach((line, lineIndex) => {
    const commands = extractCommandsFromLine(line)
    if (commands.length > 0) {
      const commandsWithOffset = commands.map(processRawCommands)
      commandsWithOffset.forEach(({ command, lineOffsets }) => {
        lineOffsets.forEach((lineOffset) => {
          if (lineCommands[lineIndex + lineOffset]) {
            lineCommands[lineIndex + lineOffset].push(command)
          }
        })
      })
    }
  })
  // also run on light theme just to remove "command" comments
  tokenizedLight.forEach((line) => {
    extractCommandsFromLine(line)
  })

  // get index of lines that are null
  const nullLineIndices = []
  tokenizedDark.forEach((line, index) => {
    if (line[0] === null) {
      nullLineIndices.push(index)
    }
  })

  tokenizedDark = tokenizedDark.filter((line, lineIndex) => !nullLineIndices.includes(lineIndex))
  tokenizedLight = tokenizedLight.filter((line, lineIndex) => !nullLineIndices.includes(lineIndex))
  lineCommands = lineCommands.filter((line, lineIndex) => !nullLineIndices.includes(lineIndex))

  lineCommands.forEach((commands, lineIndex) => {
    lineOptions.push({
      line: lineIndex + 1,
      classes: commands.map(command => `sh--${resolveCommandShortcuts(command)}`)
    })
  })

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
      }

      // unwrap paragraphs from stuff that are not necessary
      // figure

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
        
    })

  }
}
