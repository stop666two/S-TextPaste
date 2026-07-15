#!/usr/bin/env node
// S-TextPaste CLI 一键部署脚本
// 自动检查登录 → 检查/创建 Worker → 检查/创建 D1 → 构建 → 部署
// 用法: node scripts/deploy.js

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const TOML = path.join(ROOT, 'wrangler.toml')
const NAME = 's-textpaste'
const DB_NAME = 's-textpaste-db'

function run(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT
  const stdio = opts.silent ? ['pipe', 'pipe', 'pipe'] : 'inherit'
  try {
    const out = execSync(cmd, { cwd, stdio, encoding: 'utf-8', timeout: opts.timeout || 60000 })
    return { ok: true, out: (out || '').trim() }
  } catch (e) {
    if (opts.silent) {
      const err = e
      return { ok: false, out: err.stdout || '', err: err.stderr || '' }
    }
    throw e
  }
}

function readToml() {
  return fs.readFileSync(TOML, 'utf-8')
}

function writeToml(c) {
  fs.writeFileSync(TOML, c)
}

function tomlSetDbId(toml, id) {
  return toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${id}"`)
}

function tomlGetDbId(toml) {
  const m = toml.match(/database_id\s*=\s*"([^"]+)"/)
  return m && /^[0-9a-f-]{20,}$/.test(m[1]) ? m[1] : null
}

function printBanner() {
  console.log(`
  ╔══════════════════════════════════════╗
  ║        S-TextPaste 一键部署          ║
  ║     Cloudflare Workers CLI 自动部署   ║
  ╚══════════════════════════════════════╝
  `)
}

function printDone() {
  console.log(`
  ╔══════════════════════════════════════╗
  ║  ✅ 部署成功！                        ║
  ║                                      ║
  ║  访问地址:                            ║
  ║  https://${NAME}.xxx.workers.dev      ║
  ║                                      ║
  ║  管理面板:                            ║
  ║  https://dash.cloudflare.com         ║
  ╚══════════════════════════════════════╝
  `)
}

// ===== Main =====

printBanner()

// ---- Step 1: 检查 Wrangler 登录 ----
console.log('[1/6] 检查 Cloudflare 登录状态...\n')

const whoami = run('npx wrangler whoami 2>&1', { silent: true })
if (!whoami.ok || whoami.out.includes('not logged in') || whoami.out.includes('You must be logged in')) {
  console.log('  ! 未登录 Cloudflare，请登录:\n')
  run('npx wrangler login')
  console.log('')
} else {
  const m = whoami.out.match(/邮箱|Email|email|user.*?(\S+@\S+)/i)
  if (m) console.log(`  ✓ 已登录: ${m[1]}\n`)
  else console.log(`  ✓ 已登录\n`)
}

// ---- Step 2: 检查/创建 D1 数据库 ----
console.log('[2/6] 检查 D1 数据库...\n')

let toml = readToml()
let dbId = tomlGetDbId(toml)

if (dbId) {
  console.log(`  ✓ 数据库 ID 已配置: ${dbId}\n`)
} else {
  // 查找是否已有同名数据库
  const list = run('npx wrangler d1 list --json 2>&1', { silent: true })
  let existingDb = null

  if (list.ok && list.out) {
    try {
      const dbs = JSON.parse(list.out)
      const arr = Array.isArray(dbs) ? dbs : (dbs.result || [])
      existingDb = arr.find(d => d.name === DB_NAME)
    } catch { /* ignore */ }
  }

  if (existingDb) {
    dbId = existingDb.uuid
    toml = tomlSetDbId(toml, dbId)
    writeToml(toml)
    console.log(`  ✓ 发现已有数据库 ${DB_NAME}，已自动连接 (ID: ${dbId})\n`)
  } else {
    console.log(`  ! 未找到数据库 ${DB_NAME}，正在创建...\n`)
    const created = run(`npx wrangler d1 create ${DB_NAME} 2>&1`, { silent: true })
    if (!created.ok) {
      console.error(`  ✗ 创建失败: ${created.out || created.err}`)
      process.exit(1)
    }
    // 从输出中提取 database_id
    const idMatch = created.out.match(/database_id\s*=\s*"([^"]+)"/) || created.out.match(/"[0-9a-f-]{36}"/i)
    if (!idMatch) {
      console.error('  ✗ 无法获取数据库 ID，输出:\n' + created.out)
      process.exit(1)
    }
    dbId = idMatch[1].replace(/"/g, '')
    toml = tomlSetDbId(toml, dbId)
    writeToml(toml)
    console.log(`  ✓ 数据库 ${DB_NAME} 创建成功 (ID: ${dbId})\n`)
  }
}

// ---- Step 3: 检查 Worker 是否存在 ----
console.log('[3/6] 检查 Worker 部署状态...\n')

// 用 wrangler deploy --dry-run 不能检测是否存在，改用 wrangler tail --help 等方式
// 直接用 wrangler versions list 或尝试部署（它会自动覆盖）
const existingWorker = run(`npx wrangler deploy --dry-run 2>&1`, { silent: true })
// 不依赖输出，直接部署时会自动覆盖

// ---- Step 4: 安装前端依赖 ----
console.log('[4/6] 安装前端依赖...\n')
run('cd frontend && npm install --silent', { timeout: 120000 })

// ---- Step 5: 构建前端 ----
console.log('[5/6] 构建前端...\n')
run('npx tsc --noEmit && npx vite build', { cwd: path.join(ROOT, 'frontend'), timeout: 120000 })

// ---- Step 6: 部署到 Cloudflare Workers ----
console.log('[6/6] 部署到 Cloudflare Workers...\n')
console.log('  Worker 已存在则自动覆盖，无需手动操作\n')

const deploy = run('npx wrangler deploy 2>&1', { silent: true })
if (!deploy.ok) {
  console.error(`  ✗ 部署失败:\n${deploy.out}\n${deploy.err}`)
  process.exit(1)
}

// 提取部署 URL
const urlMatch = deploy.out.match(/(https:\/\/[^\s]+\.workers\.dev)/i)
const url = urlMatch ? urlMatch[1] : `https://${NAME}.xxx.workers.dev`

console.log(`  ${deploy.out.split('\n').filter(l => l.trim()).slice(-3).join('\n')}\n`)

printDone()
console.log(`  部署 URL: ${url}\n`)
