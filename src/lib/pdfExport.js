import { jsPDF } from 'jspdf'
import robotoRegularUrl from '../assets/fonts/Roboto-Regular.ttf?url'
import robotoBoldUrl from '../assets/fonts/Roboto-Bold.ttf?url'
import { isNonNoteItem } from './itemCategory'

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
  const [regularBuf, boldBuf] = await Promise.all([
    fetch(robotoRegularUrl).then((r) => r.arrayBuffer()),
    fetch(robotoBoldUrl).then((r) => r.arrayBuffer()),
  ])
  doc.addFileToVFS('Roboto-Regular.ttf', arrayBufferToBase64(regularBuf))
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', arrayBufferToBase64(boldBuf))
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
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

  note(value, placeholder) {
    const trimmed = (value || '').trim()
    if (trimmed) {
      this.text(trimmed, { gapAfter: 3 })
    } else {
      this.text(placeholder, { gapAfter: 3, color: 150 })
    }
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
            cursor.note(sub.note, '(brak notatki)')
          })
        } else {
          cursor.note(item.note, '(brak notatki)')
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
      cursor.note(q.note, '(brak odpowiedzi)')
    }
  }

  const fileName = `${program.title.replace(/[^\p{L}\p{N}]+/gu, '_')}_notatki.pdf`
  doc.save(fileName)
}
