#!/usr/bin/env node
// Auto-detect existing D1 databases and set database_id in wrangler.toml
// The [[d1_databases]] binding must already exist in wrangler.toml

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const toml = path.join(__dirname, '..', 'wrangler.toml')
let config = fs.readFileSync(toml, 'utf-8')

// Skip if database_id is already a real UUID
const match = config.match(/database_id\s*=\s*"([^"]+)"/)
if (match && /^[0-9a-f-]{20,}$/.test(match[1])) {
  console.log('[setup-d1] database_id already set:', match[1])
  process.exit(0)
}

// Find wrangler and list databases
const bins = ['npx wrangler', './node_modules/.bin/wrangler', 'wrangler']
let dbs = []
for (const bin of bins) {
  try {
    const out = execSync(`${bin} d1 list --json 2>/dev/null`, {
      encoding: 'utf-8', timeout: 20000, stdio: ['pipe', 'pipe', 'ignore']
    })
    const parsed = JSON.parse(out)
    dbs = Array.isArray(parsed) ? parsed : (parsed.result || [])
    break
  } catch { continue }
}

if (dbs.length === 0) {
  console.log('[setup-d1] No D1 databases found. Create one: wrangler d1 create s-textpaste-db')
  process.exit(0)
}

const target = dbs.find(d => d.name === 's-textpaste-db')
if (!target) {
  console.log('[setup-d1] Database "s-textpaste-db" not found. Available:', dbs.map(d => d.name).join(', '))
  process.exit(0)
}

const id = target.uuid
config = config.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${id}"`)
fs.writeFileSync(toml, config)
console.log(`[setup-d1] Set database_id = "${id}" in wrangler.toml`)
