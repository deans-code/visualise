/**
 * Reads the profile app's catalogue (values, skills, categories, definitions) and writes
 * catalogue/catalogue.json, the snapshot the server seeds its dictionary from.
 *
 *   npm run import-catalogue [-- <path to profile app's src/data>]
 *
 * The path may also come from CATALOGUE_PATH. Default: ../profile/src/data
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildCatalogue, type ProfileData } from '../shared/catalogue'

const dataDir = resolve(process.argv[2] ?? process.env.CATALOGUE_PATH ?? '../profile/src/data')
const load = (rel: string) => import(pathToFileURL(resolve(dataDir, rel)).href)

const [values, skills, vdef, tdef, edef, idef, adef] = await Promise.all([
  load('values.ts'),
  load('skills.ts'),
  load('definitions/values.ts'),
  load('definitions/technical.ts'),
  load('definitions/engineering.ts'),
  load('definitions/interpersonal.ts'),
  load('definitions/ai.ts'),
])

const data: ProfileData = {
  VALUE_CATEGORIES: values.VALUE_CATEGORIES,
  CATALOGS: skills.CATALOGS,
  VALUE_DEFINITIONS: vdef.VALUE_DEFINITIONS,
  SKILL_DEFINITIONS: {
    technical: tdef.TECHNICAL_DEFINITIONS,
    engineering: edef.ENGINEERING_DEFINITIONS,
    interpersonal: idef.INTERPERSONAL_DEFINITIONS,
    ai: adef.AI_DEFINITIONS,
  },
}

const catalogue = buildCatalogue(data)
const out = resolve('catalogue/catalogue.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(catalogue, null, 2) + '\n')

const missing = catalogue.terms.filter((t) => !t.definition)
console.log(`Wrote ${catalogue.terms.length} terms to ${out} (${missing.length} without a definition)`)
if (missing.length) console.log('Missing definitions:', missing.map((t) => t.name).join(', '))
