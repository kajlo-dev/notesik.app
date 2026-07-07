// Renderuje miniaturkę okładki (strona 1 PDF-u) programu. Okładki tych PDF-ów są złożone z
// kilku kafelków obrazu (nie jednego pliku), więc trzeba je poskładać ręcznie: pdf.js daje
// listę operacji rysowania strony (getOperatorList) - śledzimy macierz przekształcenia (CTM)
// przez save/restore/transform, żeby wiedzieć, gdzie na stronie wylądować każdy obraz, i
// rysujemy je na jednym płótnie w prawidłowych miejscach. Tekst tytułu (wektorowy) pomijamy -
// liczy się sama ilustracja tła.
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from 'canvas'

function multiply(m1, m2) {
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ]
}

function transformPoint(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

function tileToCanvas(img) {
  const { width, height, data: pixels, kind } = img
  const c = createCanvas(width, height)
  const ctx = c.getContext('2d')
  const imgData = ctx.createImageData(width, height)
  if (kind === 3 || pixels.length === width * height * 4) {
    imgData.data.set(pixels)
  } else if (kind === 1) {
    for (let p = 0, q = 0; p < pixels.length; p++, q += 4) {
      imgData.data[q] = imgData.data[q + 1] = imgData.data[q + 2] = pixels[p]
      imgData.data[q + 3] = 255
    }
  } else {
    for (let p = 0, q = 0; p < pixels.length; p += 3, q += 4) {
      imgData.data[q] = pixels[p]
      imgData.data[q + 1] = pixels[p + 1]
      imgData.data[q + 2] = pixels[p + 2]
      imgData.data[q + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)
  return c
}

async function compositeCoverPage(page, targetWidth) {
  const [pageX0, pageY0, pageX1, pageY1] = page.view
  const pageWidth = pageX1 - pageX0
  const pageHeight = pageY1 - pageY0
  const scale = targetWidth / pageWidth
  const targetHeight = Math.round(pageHeight * scale)

  const composite = createCanvas(targetWidth, targetHeight)
  const cctx = composite.getContext('2d')
  cctx.fillStyle = '#ffffff'
  cctx.fillRect(0, 0, targetWidth, targetHeight)

  const opList = await page.getOperatorList()
  const opNames = Object.fromEntries(Object.entries(OPS).map(([k, v]) => [v, k]))
  let ctm = [1, 0, 0, 1, 0, 0]
  const stack = []

  for (let i = 0; i < opList.fnArray.length; i++) {
    const name = opNames[opList.fnArray[i]]
    const args = opList.argsArray[i]
    if (name === 'save') stack.push(ctm)
    else if (name === 'restore') ctm = stack.pop() || ctm
    else if (name === 'transform') ctm = multiply(args, ctm)
    else if (name === 'paintImageXObject') {
      // page.objs.get(id) rzuca, jeśli obraz jeszcze się dekoduje - poczekaj na niego zamiast
      // wywalać całą miniaturkę (getOperatorList() kończy się, zanim wszystkie obrazy są gotowe).
      const img = await new Promise((resolve) => page.objs.get(args[0], resolve))
      if (!img || img.width < 20 || img.height < 20) continue
      const corners = [
        transformPoint(ctm, 0, 0),
        transformPoint(ctm, 1, 0),
        transformPoint(ctm, 0, 1),
        transformPoint(ctm, 1, 1),
      ]
      const xs = corners.map((c) => c[0])
      const ys = corners.map((c) => c[1])
      const minX = Math.min(...xs) - pageX0
      const maxX = Math.max(...xs) - pageX0
      const minY = Math.min(...ys) - pageY0
      const maxY = Math.max(...ys) - pageY0
      const destX = minX * scale
      const destW = (maxX - minX) * scale
      const destY = (pageHeight - maxY) * scale
      const destH = (maxY - minY) * scale
      if (destW < 1 || destH < 1) continue
      try {
        const tileCanvas = tileToCanvas(img)
        cctx.drawImage(tileCanvas, 0, 0, img.width, img.height, destX, destY, destW, destH)
      } catch {
        // pomiń kafelek, którego nie da się zdekodować - miniaturka i tak będzie użyteczna
      }
    }
  }
  return composite
}

// Zwraca bufor JPEG kwadratowej miniaturki (kadr od góry strony) albo null, jeśli się nie uda.
export async function renderPdfThumbnail(pdfBytes, { width = 400 } = {}) {
  try {
    const doc = await getDocument({ data: pdfBytes }).promise
    const page = await doc.getPage(1)
    const composite = await compositeCoverPage(page, width)
    const size = Math.min(composite.width, composite.height)
    const square = createCanvas(size, size)
    square.getContext('2d').drawImage(composite, 0, 0, composite.width, size, 0, 0, size, size)
    return square.toBuffer('image/jpeg', { quality: 0.85 })
  } catch (err) {
    console.warn('Nie udało się wyrenderować miniaturki:', err.message)
    return null
  }
}
