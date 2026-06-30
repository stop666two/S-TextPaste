const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'frontend', 'dist')
const PUBLIC = path.join(ROOT, 'worker', 'public')

if (!fs.existsSync(DIST)) {
  console.error('ERROR: frontend/dist not found. Run build first.')
  process.exit(1)
}

if (fs.existsSync(PUBLIC)) fs.rmSync(PUBLIC, { recursive: true, force: true })
fs.mkdirSync(PUBLIC, { recursive: true })

function copy(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name)
    e.isDirectory() ? copy(s, d) : fs.copyFileSync(s, d)
  }
}
copy(DIST, PUBLIC)
const n = (d) => { let c = 0; for (const e of fs.readdirSync(d, { withFileTypes: true })) c += e.isDirectory() ? n(path.join(d, e.name)) : 1; return c }
console.log(`Copied ${n(PUBLIC)} files to worker/public/`)
