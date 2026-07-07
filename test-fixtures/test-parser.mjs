import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { extractDaysFromDoc } from '../src/lib/pdfParseCore.js'
import fs from 'node:fs'

const file = process.argv[2]
const data = new Uint8Array(fs.readFileSync(file))
const doc = await getDocument({ data }).promise
const meta = await doc.getMetadata()
const { days, type } = await extractDaysFromDoc(doc)

console.log('title:', meta?.info?.Title)
console.log('type:', type)
console.log('days:', days.length)
console.log(JSON.stringify(days, null, 2))
