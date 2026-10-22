// Yayın öncesi kontrol: package.json sürümü için src/data/changelog.ts'te
// RELEASE_NOTES kaydı var mı? Yoksa yalnız UYARIR (yayın durmaz) — o sürümde
// "Neler Yeni" penceresi açılmaz. GitHub Actions'ta ::warning:: olarak görünür.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const version = process.env.CHECK_VERSION
  ?? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const changelog = readFileSync(join(root, 'src', 'data', 'changelog.ts'), 'utf8')
const escaped = version.replace(/\./g, '\\.')

if (!new RegExp(`versiyon:\\s*'${escaped}'`).test(changelog)) {
  const msg = `v${version} için sürüm notu yok (src/data/changelog.ts → RELEASE_NOTES). "Neler Yeni" penceresi bu sürümde açılmayacak.`
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Sürüm notu eksik::${msg}`)
  console.warn(`⚠  ${msg}`)
}
