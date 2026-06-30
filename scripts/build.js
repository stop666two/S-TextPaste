// S-TextPaste Build Script
// Builds the frontend and copies it to worker/public/

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const FRONTEND = path.join(ROOT, 'frontend')
const WORKER_PUBLIC = path.join(ROOT, 'worker', 'public')

console.log('=== S-TextPaste Build ===\n')

// Step 1: Install frontend dependencies if needed
if (!fs.existsSync(path.join(FRONTEND, 'node_modules'))) {
  console.log('[1/3] Installing frontend dependencies...')
  execSync('npm install', { cwd: FRONTEND, stdio: 'inherit' })
} else {
  console.log('[1/3] Frontend dependencies already installed')
}

// Step 2: Build frontend
console.log('\n[2/3] Building frontend...')
execSync('npx tsc --noEmit && npx vite build', { cwd: FRONTEND, stdio: 'inherit' })

// Step 3: Copy build output to worker/public/
console.log('\n[3/3] Copying build to worker/public/...')
const dist = path.join(FRONTEND, 'dist')
if (!fs.existsSync(dist)) {
  console.error('ERROR: Frontend build failed - dist/ not found')
  process.exit(1)
}

// Clean worker/public
if (fs.existsSync(WORKER_PUBLIC)) {
  fs.rmSync(WORKER_PUBLIC, { recursive: true, force: true })
}
fs.mkdirSync(WORKER_PUBLIC, { recursive: true })

// Copy all files
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
copyDir(dist, WORKER_PUBLIC)

// Count files
const countFiles = (dir) => {
  let n = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(path.join(dir, entry.name))
    else n++
  }
  return n
}
const fileCount = countFiles(WORKER_PUBLIC)

console.log(`\n  Build complete: ${fileCount} files in worker/public/`)
console.log('  Ready for deployment: npm run deploy\n')
