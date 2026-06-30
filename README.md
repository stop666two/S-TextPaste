# S-TextPaste

> 绝密级零信任端到端加密文本分享 · Triple-Envelope Post-Quantum Encryption

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/stop666two/S-TextPaste)

---

## 一键部署

点击上方按钮，自动完成：克隆 → 安装依赖 → 构建 → 部署。部署后访问分配的 `*.workers.dev` 域名即可。

> D1 数据库在初次部署后需手动创建，见下方说明。

## D1 数据库设置（一次性）

```bash
npx wrangler d1 create s-textpaste-db
# 将返回的 database_id 填入 wrangler.toml 的 database_id 字段
npx wrangler deploy
```

---

## 本地开发

```bash
# 终端 1 - 后端
cd worker && node server.js

# 终端 2 - 前端
cd frontend && npm install && npm run dev
```

打开 http://localhost:3000

---

## 安全架构

```
密码 → SHA-256+MD5 12轮链式KDF → 512-bit 密钥
     → SHA-256+MD5 24轮链式KDF(A) → 1024-bit PQ密钥1
     → SHA-256+MD5 24轮链式KDF(B) → 1024-bit PQ密钥2
            ↓
  明文 → DEK(AES-GCM) → Key2(AES-GCM) → Key1(AES-GCM) → encrypted_payload
            ↓
  HMAC-SHA-256(7轮KDF, 全载荷) → 防篡改标签
```

---

## 项目结构

```
├── src/              # Worker 源码 (Hono + D1 + API)
├── frontend/         # React 18 + TypeScript + Vite
│   └── src/crypto.ts # 全部加密逻辑 (客户端)
├── worker/           # 本地开发服务器
│   └── server.js     # 本地模拟 API
├── scripts/          # 构建脚本
├── wrangler.toml     # Cloudflare Workers 配置
└── package.json      # 依赖 + 构建命令
```

---

## 技术栈

React 18 · TypeScript · Vite · CodeMirror 6 · marked · Mermaid · KaTeX · highlight.js · Hono · Cloudflare Workers · D1
