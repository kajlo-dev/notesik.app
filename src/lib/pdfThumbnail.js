import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

// Miniaturka dla ręcznie wgranego pliku PDF (nie ma jej z góry wygenerowanej przez
// sync-programs.mjs) - renderuje stronę 1 wprost w przeglądarce i przycina do kwadratu
// od góry, tak samo jak miniaturki generowane po stronie serwera.
export async function renderPdfThumbnailDataUrl(source, { width = 300 } = {}) {
  const data = source instanceof ArrayBuffer ? new Uint8Array(source) : source
  const doc = await pdfjsLib.getDocument({ data }).promise
  const page = await doc.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const scale = width / viewport.width
  const scaledViewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = scaledViewport.width
  canvas.height = scaledViewport.height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise

  const size = Math.min(canvas.width, canvas.height)
  const square = document.createElement('canvas')
  square.width = size
  square.height = size
  square.getContext('2d').drawImage(canvas, 0, 0, canvas.width, size, 0, 0, size, size)
  return square.toDataURL('image/jpeg', 0.85)
}
