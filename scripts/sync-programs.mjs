// Pobiera aktualną listę programów kongresów i zgromadzeń obwodowych (PL) z jw.org i kopiuje
// pliki PDF do public/programs/, razem z indeksem public/programs/index.json.
//
// Powód: oficjalne API metadanych (GETPUBMEDIALINKS) ma nagłówek CORS "*" i można je odpytywać
// wprost z przeglądarki, ale sam plik PDF (host jw-cdn.org) już nie ma nagłówków CORS - ten
// skrypt działa poza przeglądarką (w GitHub Actions), więc CORS go nie dotyczy, i zapisuje
// PDF-y do repozytorium, skąd serwuje je GitHub Pages jako pliki tego samego pochodzenia.
import fs from 'node:fs/promises'
import { renderPdfThumbnail } from './renderThumbnail.mjs'

const LIST_URL = 'https://www.jw.org/pl/biblioteka/programy/'
const API_URL = 'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS'
const OUT_DIR = new URL('../public/programs/', import.meta.url)

function classify(pub) {
  const p = pub.toLowerCase()
  if (p.startsWith('co-pgm')) return 'kongres'
  if (p.startsWith('ca-copgm') || p.startsWith('ca-brpgm')) return 'zgromadzenie'
  return null
}

async function fetchPubCodes() {
  const res = await fetch(LIST_URL)
  if (!res.ok) throw new Error(`Nie udało się pobrać listy programów: HTTP ${res.status}`)
  const html = await res.text()
  const matches = [...html.matchAll(/pub=([a-z0-9-]+)/gi)].map((m) => m[1])
  return [...new Set(matches)].filter((pub) => classify(pub))
}

async function fetchMediaInfo(pub) {
  const url = `${API_URL}?output=json&pub=${pub}&fileformat=PDF&alllangs=0&langwritten=P&txtCMSLang=P`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const file = data?.files?.P?.PDF?.[0]
  if (!file) return null
  return {
    pub: data.pub,
    title: data.pubName,
    url: file.file.url,
    modifiedDatetime: file.file.modifiedDatetime,
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const pubCodes = await fetchPubCodes()
  console.log(`Znaleziono ${pubCodes.length} kandydujących publikacji: ${pubCodes.join(', ')}`)

  const index = []
  for (const pub of pubCodes) {
    const info = await fetchMediaInfo(pub)
    if (!info) {
      console.warn(`Pominięto ${pub}: brak danych z API`)
      continue
    }
    const fileName = `${info.pub}_P.pdf`
    const pdfRes = await fetch(info.url)
    if (!pdfRes.ok) {
      console.warn(`Pominięto ${pub}: nie udało się pobrać PDF (HTTP ${pdfRes.status})`)
      continue
    }
    const buffer = Buffer.from(await pdfRes.arrayBuffer())
    await fs.writeFile(new URL(fileName, OUT_DIR), buffer)

    let thumbFile = null
    const thumbBuffer = await renderPdfThumbnail(new Uint8Array(buffer))
    if (thumbBuffer) {
      thumbFile = `${info.pub}_thumb.jpg`
      await fs.writeFile(new URL(thumbFile, OUT_DIR), thumbBuffer)
    }

    index.push({
      pub: info.pub,
      title: info.title,
      type: classify(pub),
      file: `programs/${fileName}`,
      thumb: thumbFile ? `programs/${thumbFile}` : null,
      modifiedDatetime: info.modifiedDatetime,
    })
    console.log(`OK: ${info.pub} - ${info.title}${thumbFile ? '' : ' (bez miniaturki)'}`)
  }

  index.sort((a, b) => (b.modifiedDatetime || '').localeCompare(a.modifiedDatetime || ''))
  await fs.writeFile(new URL('index.json', OUT_DIR), `${JSON.stringify(index, null, 2)}\n`)
  console.log(`Zapisano indeks z ${index.length} programami.`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
