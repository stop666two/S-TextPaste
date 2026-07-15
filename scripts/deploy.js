#!/usr/bin/env node
// S-TextPaste CLI 一键部署脚本
// 自动完成：检测/创建 D1 → 构建前端 → 部署到 Cloudflare Workers
// 用法: node scripts/deploy.js

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const TOML = path.join(ROOT, 'wrangler.toml')

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`)
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts })
}

function readToml() {
  return fs.readFileSync(TOML, 'utf-8')
}

function writeToml(content) {
  fs.writeFileSync(TOML, content)
}

function getDbId(content) {
  const m = content.match(/database_id\s*=\s*"([^"]+)"/)
  return m && /^[0-9a-f-]{20,}$/.test(m[1]) ? m[1] : null
}

function setDbId(content, id) {
  return content.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${id}"`)
}

console.log(`
  ╔══════════════════════════════════════╗
  ║     S-TextPaste CLI 一键部署         ║
  ╚══════════════════════════════════════╝
`)

// Step 1: Check D1 database
console.log('[1/4] 检查 D1 数据库绑定...\n')

let toml = readToml()
let dbId = getDbId(toml)

if (dbId) {
  console.log(`  ✓ 数据库 ID 已配置: ${dbId}\n`)
} else {
  console.log('  ! 未检测到 database_id，尝试自动获取...\n')

  // Try to find existing database
  let dbs = []
  try {
    const out = execSync('npx wrangler d1 list --json 2>/dev/null', {
      cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 15000
    })
    dbs = JSON.parse(out)
    if (!Array.isArray(dbs)) dbs = dbs.result || []
  } catch { /* wrangler not available */ }

  const existing = dbs.find((d: any) => d.name === 's-textpaste-db')

  if (existing) {
    dbId = existing.uuid
    toml = setDbId(toml, dbId)
    writeToml(toml)
    console.log(`  ✓ 发现已有数据库，ID: ${dbId}\n`)
  } else {
    // Create new database
    console.log('  ! 未找到 s-textpaste-db，正在创建...\n')
    try {
      const out = execSync('npx wrangler d1 create s-textpaste-db 2>&1', {
        cwd: ROOT, encoding: 'utf-8', timeout: 30000
      })
      const m = out.match(/database_id\s*=\s*"([^"]+)"/) || out.match(/uuid["':\s]+([0-9a-f-]{36})/i)
      if (m) {
        dbId = m[1]
        toml = setDbId(toml, dbId)
        writeToml(toml)
        console.log(`  ✓ 数据库创建成功，ID: ${dbId}\n`)
      } else {
        console.error('  ✗ 创建失败，请手动执行: npx wrangler d1 create s-textpaste-db')
        process.exit(1)
      }
    } catch (e: any) {
      console.error(`  ✗ 创建失败: ${e.message}`)
      console.error('  请手动执行: npx wrangler d1 create s-textpaste-db')
      process.exit(1)
    }
  }
}

// Step 2: Build frontend
console.log('[2/4] 构建前端...\n')
run('node scripts/build.js')

// Step 3: Deploy to Cloudflare Workers
console.log('[3/4] 部署到 Cloudflare Workers...\n')
try {
  run('npx wrangler deploy')
} catch (e: any) {
  console.error(`\n  ✗ 部署失败: ${e.message}`)
  console.error('  请确认: 1) 已运行 npx wrangler login  2) 网络正常')
  process.exit(1)
}

console.log(`
  ╔══════════════════════════════════════╗
  ║  ✅ 部署成功！                        ║
  ║                                      ║
  ║  访问 Workers 域名查看:               ║
  ║  https://s-textpaste.用户名.workers.dev ║
  ╚══════════════════════════════════════╝
`)
