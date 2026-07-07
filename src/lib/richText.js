// Notatki są przechowywane jako HTML (produkowany przez document.execCommand w
// RichNoteEditor: <b>, <i>, <u>, <font size=".." color="..">). Te funkcje odczytują tę
// treść z powrotem - do sprawdzania "czy notatka jest pusta" i do eksportu PDF.

export function hasNoteContent(html) {
  if (!html) return false
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent.trim().length > 0
}

const FONT_SIZE_TO_PT = { 1: 8, 2: 9, 3: 10, 4: 12, 5: 14, 6: 17, 7: 20 }

// Zamienia HTML notatki na płaską listę fragmentów tekstu ze stylem (do renderowania w PDF,
// gdzie każdy przebieg trzeba narysować osobno z właściwym fontem/kolorem).
export function parseHtmlToRuns(html) {
  if (!html) return []
  const container = document.createElement('div')
  container.innerHTML = html
  const runs = []

  function walk(node, style) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) runs.push({ text: node.textContent, ...style })
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const tag = node.tagName.toLowerCase()
    const next = { ...style }
    if (tag === 'b' || tag === 'strong') next.bold = true
    if (tag === 'i' || tag === 'em') next.italic = true
    if (tag === 'u') next.underline = true
    if (tag === 'div' || tag === 'p' || tag === 'br') runs.push({ text: '\n', ...style })
    if (tag === 'font') {
      const color = node.getAttribute('color')
      const size = node.getAttribute('size')
      if (color) next.color = color
      if (size && FONT_SIZE_TO_PT[size]) next.sizePt = FONT_SIZE_TO_PT[size]
    }
    const styleAttr = node.getAttribute && node.getAttribute('style')
    if (styleAttr) {
      const colorMatch = styleAttr.match(/color:\s*([^;]+)/)
      if (colorMatch) next.color = colorMatch[1].trim()
    }

    for (const child of node.childNodes) walk(child, next)
  }

  for (const child of container.childNodes) walk(child, {})
  return runs
}
