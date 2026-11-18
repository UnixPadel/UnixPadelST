// Yayın öncesi dil kontrolü. Hata varsa yayın durur; koda gömülü Türkçe yalnız uyarıdır.
// Lokal kullanım: npm run check:i18n
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const web = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = join(web, '..')
const src = join(web, 'src')
const require = createRequire(import.meta.url)
const ts = require('typescript')

const errors = []
const warnings = []
const fail = (title, items) => { if (items.length) errors.push({ title, items }) }

const flatten = (value, prefix = '', out = {}) => {
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (item && typeof item === 'object') flatten(item, path, out)
    else out[path] = String(item)
  }
  return out
}
const readLocale = (lang) => flatten(JSON.parse(readFileSync(join(src, 'i18n', 'locales', `${lang}.json`), 'utf8')))
const tr = readLocale('tr')
const en = readLocale('en')
const trKeys = Object.keys(tr)
const enKeys = Object.keys(en)

const walk = (dir, accept, skip = new Set(), out = []) => {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) { if (!skip.has(entry.name)) walk(path, accept, skip, out) }
    else if (accept(entry.name)) out.push(path)
  }
  return out
}

// ── Anahtar ve metin yapısı ──
fail('EN dosyasında eksik anahtar', trKeys.filter((key) => !(key in en)))
fail('TR dosyasında eksik anahtar', enKeys.filter((key) => !(key in tr)))
const shared = trKeys.filter((key) => key in en)
const tokens = (text, pattern) => (text.match(pattern) ?? []).map((token) => token.replace(/\s/g, '')).sort().join('|')
fail('Yer tutucusu farklı metin', shared.filter((key) => tokens(tr[key], /\{\{[^}]+\}\}/g) !== tokens(en[key], /\{\{[^}]+\}\}/g)))
fail('HTML etiketi farklı metin', shared.filter((key) => tokens(tr[key], /<\/?[a-zA-Z0-9]+[^>]*>/g) !== tokens(en[key], /<\/?[a-zA-Z0-9]+[^>]*>/g)))
fail('Boş çeviri', [...trKeys.filter((key) => !tr[key].trim()).map((key) => `tr:${key}`), ...enKeys.filter((key) => !en[key].trim()).map((key) => `en:${key}`)])
fail('Çoğul çifti eksik', enKeys.filter((key) => key.endsWith('_one') && !(`${key.slice(0, -4)}_other` in en)))

const TURKISH_IN_EN_ALLOWED = new Set(['addStock.gumrukIdaresiPh'])
fail('EN metninde Türkçe harf', enKeys.filter((key) => /[çğıöşüÇĞİÖŞÜ]/.test(en[key]) && !TURKISH_IN_EN_ALLOWED.has(key)))
const BANNED = /(^|[^\p{L}])(optimize|entegre|sinerji|kesintisiz|mükemmel çözüm|dijital dünya|harmanla\p{L}*|gerçekleştirilmektedir|temin edilmektedir|başarıyla|lütfen|please|successfully)(?=$|[^\p{L}])/iu
fail('Sözlükte yasak kelime', [
  ...trKeys.filter((key) => BANNED.test(tr[key])).map((key) => `tr:${key}`),
  ...enKeys.filter((key) => BANNED.test(en[key])).map((key) => `en:${key}`),
])

// ── Sunucu hata kodları ──
const hasError = (locale, code) => `apiErrors.${code}` in locale || `apiErrors.${code}_other` in locale
const codes = new Set(['notFound', 'unauthorized', 'unknown'])
const CODE_PATTERNS = [
  /new\s+(?:BusinessException|UnauthorizedException)\s*\((?:[^;]*?)"\s*,\s*(?:code\s*:\s*)?"([a-zA-Z0-9]+)"\s*(?:,|\))/g,
  /FailCode\(\s*"([a-zA-Z0-9]+)"/g,
  /\(\s*"((?:claude|gemini)[A-Z][A-Za-z]*)"\s*,\s*\$?"/g,
  /return\s+"((?:claude|gemini)[A-Z][A-Za-z]*)"\s*;/g,
  /HataKodu:\s*(?:ex\.Code\s*\?\?\s*)?"([a-zA-Z0-9]+)"/g,
  /TestResultDto\(\s*false\s*,\s*"([a-zA-Z0-9]+)"/g,
  /DraftWarningDto\(\s*"([a-zA-Z0-9]+)"/g,
  /\n\s*"([a-zA-Z0-9]+)",\s*\r?\n\s*\$"/g,
]
const skipBuild = new Set(['bin', 'obj', 'Migrations'])
for (const project of ['CrmModern.API', 'CrmModern.Core', 'CrmModern.Infrastructure']) {
  for (const file of walk(join(repo, project), (name) => name.endsWith('.cs'), skipBuild)) {
    const text = readFileSync(file, 'utf8')
    for (const pattern of CODE_PATTERNS) for (const match of text.matchAll(pattern)) codes.add(match[1])
  }
}
fail('Çevirisi olmayan sunucu hata kodu', [...codes].filter((code) => !hasError(tr, code) || !hasError(en, code)))

// ── Kodda kullanılan anahtarlar ve gömülü metin ──
const VISIBLE_ATTRIBUTE = /^(title|label|placeholder|aria-label|hint|emptyMessage|description|header|alt|subtitle|message)$/
const TURKISH = /[çğıöşüÇĞİÖŞÜ]/
const keyExists = (key) => [key, `${key}_one`, `${key}_other`].some((item) => item in tr && item in en)
const missingKeys = new Set()
const hardcoded = []
const sourceFiles = walk(src, (name) => /\.tsx?$/.test(name) && !name.endsWith('.d.ts'))
for (const file of sourceFiles) {
  const rel = relative(web, file).replace(/\\/g, '/')
  if (rel.startsWith('src/data/')) continue
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const line = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
  const note = (node, text) => hardcoded.push(`${rel}:${line(node)} ${text.trim().replace(/\s+/g, ' ').slice(0, 70)}`)
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
      const callee = node.expression
      const isT = (ts.isIdentifier(callee) && callee.text === 't')
        || (ts.isPropertyAccessExpression(callee) && callee.name.text === 't')
      const key = node.arguments[0].text
      if (isT && key.includes('.') && !keyExists(key)) missingKeys.add(key)
    }
    if (ts.isJsxText(node) && TURKISH.test(node.text)) note(node, node.text)
    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(source)
      const value = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer
      if (name === 'i18nKey' && value && ts.isStringLiteralLike(value) && !keyExists(value.text)) missingKeys.add(value.text)
      if (VISIBLE_ATTRIBUTE.test(name) && value && ts.isStringLiteralLike(value) && TURKISH.test(value.text)) note(node, value.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}
fail('Kodda kullanılan ama dosyada olmayan anahtar', [...missingKeys])
if (hardcoded.length) warnings.push({ title: 'Koda gömülü olabilecek Türkçe metin', items: hardcoded })

// ── Tutar girişi kabul senaryoları ──
const numberSource = ts.transpileModule(readFileSync(join(src, 'lib', 'number.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const numberModule = { exports: {} }
new Function('module', 'exports', 'require', numberSource)(numberModule, numberModule.exports, () => ({
  appLang: () => 'tr',
  appLocale: (lang) => (lang === 'en' ? 'en-GB' : 'tr-TR'),
}))
const { parseDecimal, formatDecimalInput } = numberModule.exports
const NUMBER_CASES = [
  ['tr', '1.234,56', 1234.56], ['tr', '1,5', 1.5], ['tr', '1.500', 1500], ['tr', '1,500', 1.5], ['tr', '12.5', 12.5],
  ['tr', '1.000.000', 1000000], ['en', '1,234.56', 1234.56], ['en', '1.5', 1.5], ['en', '1,500', 1500], ['en', '1.500', 1.5],
  ['en', '12,500', 12500], ['en', '1,000,000', 1000000], ['en', '1,5', 1.5], ['tr', '0.125', 0.125], ['en', '0.125', 0.125],
  ['tr', '', ''], ['en', '.', ''], ['tr', ',', ''],
]
fail('Tutar girişi yanlış okunuyor', NUMBER_CASES.filter(([lang, text, expected]) => parseDecimal(text, lang) !== expected)
  .map(([lang, text, expected]) => `${lang} "${text}" → ${parseDecimal(text, lang)} (beklenen ${expected})`))
fail('Tutar gösterimi geri okunamıyor', ['tr', 'en'].flatMap((lang) => [1234.5, 1.125, 1500]
  .filter((value) => parseDecimal(formatDecimalInput(value, lang), lang) !== value).map((value) => `${lang} ${value}`)))

// ── Sonuç ──
const inActions = Boolean(process.env.GITHUB_ACTIONS)
for (const { title, items } of warnings) {
  if (inActions) console.log(`::warning title=i18n::${title}: ${items.length}`)
  console.warn(`⚠  ${title}: ${items.length}`)
  items.slice(0, 20).forEach((item) => console.warn(`   ${item}`))
}
for (const { title, items } of errors) {
  if (inActions) console.log(`::error title=i18n::${title}: ${items.length}`)
  console.error(`✖  ${title}: ${items.length}`)
  items.slice(0, 40).forEach((item) => console.error(`   ${item}`))
}
if (errors.length) process.exit(1)
console.log(`✓  ${basename(fileURLToPath(import.meta.url))}: ${trKeys.length} anahtar, ${codes.size} sunucu kodu, ${NUMBER_CASES.length} tutar senaryosu`)
