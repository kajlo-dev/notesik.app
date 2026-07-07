import { jsPDF } from 'jspdf'
import robotoRegularUrl from '../assets/fonts/Roboto-Regular.ttf?url'
import robotoBoldUrl from '../assets/fonts/Roboto-Bold.ttf?url'
import robotoItalicUrl from '../assets/fonts/Roboto-Italic.ttf?url'
import robotoBoldItalicUrl from '../assets/fonts/Roboto-BoldItalic.ttf?url'
import { isNonNoteItem } from './itemCategory'
import { parseHtmlToRuns, hasNoteContent } from './richText'

const MARGIN = 15
const LINE_HEIGHT = 6

function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

// Standardowe fonty jsPDF (Helvetica itp.) nie obsługują polskich znaków diakrytycznych
// (ą, ć, ę, ł, ń, ó, ś, ź, ż) - trzeba osadzić font z pełnym pokryciem Latin Extended-A.
async function registerPolishFont(doc) {
  const variants = [
    ['normal', robotoRegularUrl, 'Roboto-Regular.ttf'],
    ['bold', robotoBoldUrl, 'Roboto-Bold.ttf'],
    ['italic', robotoItalicUrl, 'Roboto-Italic.ttf'],
    ['bolditalic', robotoBoldItalicUrl, 'Roboto-BoldItalic.ttf'],
  ]
  const buffers = await Promise.all(variants.map(([, url]) => fetch(url).then((r) => r.arrayBuffer())))
  variants.forEach(([style, , fileName], i) => {
    doc.addFileToVFS(fileName, arrayBufferToBase64(buffers[i]))
    doc.addFont(fileName, 'Roboto', style)
  })
}

function fontStyleFor(run) {
  if (run.bold && run.italic) return 'bolditalic'
  if (run.bold) return 'bold'
  if (run.italic) return 'italic'
  return 'normal'
}

class PdfCursor {
  constructor(doc) {
    this.doc = doc
    this.pageWidth = doc.internal.pageSize.getWidth()
    this.pageHeight = doc.internal.pageSize.getHeight()
    this.maxWidth = this.pageWidth - MARGIN * 2
    this.y = MARGIN
  }

  ensureSpace(minHeight) {
    if (this.y > this.pageHeight - MARGIN - minHeight) {
      this.doc.addPage()
      this.y = MARGIN
    }
  }

  text(value, { font = 'normal', size = 10, gapAfter = 0, color = 0 } = {}) {
    this.doc.setFont('Roboto', font)
    this.doc.setFontSize(size)
    this.doc.setTextColor(color)
    const lines = this.doc.splitTextToSize(value, this.maxWidth)
    for (const line of lines) {
      this.ensureSpace(LINE_HEIGHT)
      this.doc.text(line, MARGIN, this.y)
      this.y += LINE_HEIGHT
    }
    this.doc.setTextColor(0)
    this.y += gapAfter
  }

  // Renderuje HTML notatki (z RichNoteEditor) zachowując pogrubienie/kursywę/podkreślenie/
  // kolor - każdy "przebieg" tekstu o innym stylu trzeba układać i mierzyć osobno, bo jsPDF
  // nie ma wbudowanego układania mieszanego formatowania w jednym akapicie.
  richNote(html, placeholder) {
    if (!hasNoteContent(html)) {
      this.text(placeholder, { gapAfter: 3, color: 150 })
      return
    }
    const runs = parseHtmlToRuns(html)
    const paragraphs = [[]]
    for (const run of runs) {
      const parts = run.text.split('\n')
      parts.forEach((part, i) => {
        if (i > 0) paragraphs.push([])
        if (part) paragraphs[paragraphs.length - 1].push({ ...run, text: part })
      })
    }

    const size = 10
    for (const paragraph of paragraphs) {
      if (paragraph.length === 0) continue
      let x = MARGIN
      this.ensureSpace(LINE_HEIGHT)
      for (const run of paragraph) {
        const font = fontStyleFor(run)
        this.doc.setFont('Roboto', font)
        this.doc.setFontSize(run.sizePt || size)
        this.doc.setTextColor(run.color || 0)
        const words = run.text.split(/(\s+)/).filter((w) => w.length > 0)
        for (const word of words) {
          const wordWidth = this.doc.getTextWidth(word)
          if (x + wordWidth > MARGIN + this.maxWidth && word.trim()) {
            x = MARGIN
            this.y += LINE_HEIGHT
            this.ensureSpace(LINE_HEIGHT)
          }
          this.doc.text(word, x, this.y)
          if (run.underline && word.trim()) {
            this.doc.line(x, this.y + 0.8, x + wordWidth, this.y + 0.8)
          }
          x += wordWidth
        }
      }
      this.doc.setTextColor(0)
      this.y += LINE_HEIGHT
    }
    this.y += 3
  }
}

// Eksportuje notatki programu jako jeden ciągły dokument PDF, w kolejności programu -
// punkt programu (godzina + tytuł) jako nagłówek, notatka użytkownika pod spodem. Pieśni,
// muzyka i modlitwy są pomijane (nie mają pola notatki w aplikacji).
export async function exportProgramNotesToPdf(program) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await registerPolishFont(doc)
  const cursor = new PdfCursor(doc)

  cursor.text(program.title, { font: 'bold', size: 16, gapAfter: 4 })

  for (const day of program.days) {
    if (day.dayName) {
      cursor.ensureSpace(10)
      cursor.text(day.dayName, { font: 'bold', size: 13, gapAfter: 2 })
    }

    for (const section of day.sections) {
      for (const item of section.items) {
        if (isNonNoteItem(item)) continue
        cursor.ensureSpace(14)
        const heading = item.label ? `${item.time} ${item.label}: ${item.title}` : `${item.time} ${item.title}`
        cursor.text(heading, { font: 'bold', size: 11 })

        if (item.subitems.length > 0) {
          item.subitems.forEach((sub, i) => {
            cursor.text(`${i + 1}. ${sub.text}`, { font: 'bold', size: 10 })
            cursor.richNote(sub.note, '(brak notatki)')
          })
        } else {
          cursor.richNote(item.note, '(brak notatki)')
        }
      }
    }
  }

  if (program.reviewQuestions && program.reviewQuestions.length > 0) {
    cursor.ensureSpace(10)
    cursor.text('Pytania powtórkowe', { font: 'bold', size: 13, gapAfter: 2 })
    for (const q of program.reviewQuestions) {
      cursor.ensureSpace(14)
      cursor.text(`${q.number}. ${q.text}`, { font: 'bold', size: 11 })
      cursor.richNote(q.note, '(brak odpowiedzi)')
    }
  }

  const fileName = `${program.title.replace(/[^\p{L}\p{N}]+/gu, '_')}_notatki.pdf`
  doc.save(fileName)
}
