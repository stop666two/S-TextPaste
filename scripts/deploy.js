// S-TextPaste Deploy Script
// Builds frontend + deploys to Cloudflare Workers

const { execSync } = require('child_process')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

console.log('=== S-TextPaste Deploy to Cloudflare Workers ===\n')

// Step 1: Build
console.log('[1/2] Building...')
execSync('node scripts/build.js', { cwd: ROOT, stdio: 'inherit' })

// Step 2: Deploy
console.log('\n[2/2] Deploying to Cloudflare Workers...')
execSync('npx wrangler deploy', { cwd: path.join(ROOT, 'worker'), stdio: 'inherit' })

console.log('\n  Deployment complete!')
console.log('  Your S-TextPaste is now live on Cloudflare Workers.\n')
