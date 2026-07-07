import { jsPDF } from 'jspdf'
import robotoRegularUrl from '../assets/fonts/Roboto-Regular.ttf?url'
import robotoBoldUrl from '../assets/fonts/Roboto-Bold.ttf?url'

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

function addWrappedText(doc, text, x, y, maxWidth, pageHeight) {
  const lines = doc.splitTextToSize(text, maxWidth)
  for (const line of lines) {
    if (y > pageHeight - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
    doc.text(line, x, y)
    y += LINE_HEIGHT
  }
  return y
}

// Eksportuje notatki programu jako jeden ciągły dokument PDF, w kolejności programu -
// punkt programu (godzina + tytuł) jako nagłówek, notatka użytkownika pod spodem.
export async function exportProgramNotesToPdf(program) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await registerPolishFont(doc)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - MARGIN * 2
  let y = MARGIN

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(16)
  y = addWrappedText(doc, program.title, MARGIN, y, maxWidth, pageHeight)
  y += 4

  for (const day of program.days) {
    if (day.dayName) {
      if (y > pageHeight - MARGIN - 10) {
        doc.addPage()
        y = MARGIN
      }
      doc.setFont('Roboto', 'bold')
      doc.setFontSize(13)
      y = addWrappedText(doc, day.dayName, MARGIN, y, maxWidth, pageHeight)
      y += 2
    }

    for (const section of day.sections) {
      for (const item of section.items) {
        const hasNote = item.note && item.note.trim().length > 0
        if (y > pageHeight - MARGIN - 14) {
          doc.addPage()
          y = MARGIN
        }
        doc.setFont('Roboto', 'bold')
        doc.setFontSize(11)
        const heading = item.label ? `${item.time} ${item.label}: ${item.title}` : `${item.time} ${item.title}`
        y = addWrappedText(doc, heading, MARGIN, y, maxWidth, pageHeight)

        doc.setFont('Roboto', 'normal')
        doc.setFontSize(10)
        if (hasNote) {
          y = addWrappedText(doc, item.note.trim(), MARGIN, y, maxWidth, pageHeight)
        } else {
          doc.setTextColor(150)
          y = addWrappedText(doc, '(brak notatki)', MARGIN, y, maxWidth, pageHeight)
          doc.setTextColor(0)
        }
        y += 3
      }
    }
  }

  const fileName = `${program.title.replace(/[^\p{L}\p{N}]+/gu, '_')}_notatki.pdf`
  doc.save(fileName)
}
