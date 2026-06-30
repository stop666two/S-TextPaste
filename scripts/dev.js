// S-TextPaste Local Dev Script
// Starts both frontend dev server and local API server

const { spawn } = require('child_process')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

console.log('=== S-TextPaste Local Development ===\n')

// Start backend API server
const backend = spawn('node', ['server.js'], {
  cwd: path.join(ROOT, 'worker'),
  stdio: 'inherit',
  shell: true
})
console.log('[backend] Starting API server on :8787...')

// Start frontend dev server
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(ROOT, 'frontend'),
  stdio: 'inherit',
  shell: true
})
console.log('[frontend] Starting Vite dev server on :3000...')

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...')
  backend.kill()
  frontend.kill()
  process.exit(0)
})

process.on('SIGTERM', () => {
  backend.kill()
  frontend.kill()
  process.exit(0)
})
