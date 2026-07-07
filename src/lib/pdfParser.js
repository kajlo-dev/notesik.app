import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { extractDaysFromDoc } from './pdfParseCore.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

export async function parsePdfFile(source, { titleHint } = {}) {
  const data = source instanceof ArrayBuffer ? new Uint8Array(source) : source
  const doc = await pdfjsLib.getDocument({ data }).promise

  let title = titleHint || null
  if (!title) {
    try {
      const meta = await doc.getMetadata()
      title = meta?.info?.Title || null
    } catch {
      title = null
    }
  }

  const { days, type } = await extractDaysFromDoc(doc)

  return {
    title: title || (type === 'kongres' ? 'Program kongresu' : 'Program zgromadzenia'),
    type,
    days,
  }
}
