# S-TextPaste

> 绝密级零信任端到端加密文本分享 · Triple-Envelope Post-Quantum Encryption

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/stop666two/S-TextPaste)

---

## 一键部署

点击上方按钮，Cloudflare 自动：
1. Fork 仓库 → 安装依赖 → 构建前端
2. 引导创建 D1 数据库 → 自动填入配置
3. 部署 Worker → 分配 `*.workers.dev` 域名

部署后即可使用。D1 数据库在部署向导中自动创建。

---

## 本地开发

```bash
# 终端 1 — 后端 API 模拟
node worker/server.js                    # http://localhost:8787

# 终端 2 — 前端
cd frontend && npm install && npm run dev # http://localhost:3000
```

---

## 加密架构

```
密码 ──→ derive512 (12轮 SHA-256⊕MD5 链式)          = 512-bit  基础密钥
     ──→ derive1024A (24轮 SHA→MD5 链式)             = 1024-bit PQ密钥A
     ──→ derive1024B (24轮 MD5→SHA 链式, 完全逆向)   = 1024-bit PQ密钥B
     ──→ deriveHMAC (7轮 独立链式)                    = 256-bit  HMAC密钥

明文 → 随机DEK(AES-GCM) → KeyA(AES-GCM) → KeyB(AES-GCM) → encrypted_payload
                                                              ↓
                                               HMAC-SHA-256(全载荷) = 防篡改
```

每一轮同时使用 SHA-256 和 MD5，链式迭代，三个密钥完全不同的推导路径。

---

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/paste` | 创建粘贴 |
| GET | `/api/paste/:id` | 获取粘贴 |
| POST | `/api/paste/:id/view` | 记录查看 |
| DELETE | `/api/paste/:id` | 删除 (需 `X-Delete-Token`) |

> GET 响应仅返回 `encrypted_payload` 和生命周期字段，salt / mode / hint 全部嵌入密文内。

---

## 项目结构

```
├── src/                       # Worker 源码 (API)
│   ├── index.ts               # Hono 入口
│   └── routes/api.ts          # REST API (D1)
├── frontend/                  # React 前端
│   ├── src/crypto.ts          # 全部加密逻辑
│   ├── pages/                 # CreatePage / ReadPage / ViewPage
│   ├── components/            # Editor / Dashboard / Layout
│   └── i18n/                  # 中/English
├── worker/server.js           # 本地 API 模拟
├── wrangler.toml              # Cloudflare Workers 配置
└── package.json
```

---

## 安全

- AES-256-GCM · HMAC-SHA-256 · CSP · HTTPS
- 32字符随机ID · 速率限制 · 删除令牌哈希
- content 不在 URL 中 · React Router state 内存传递
