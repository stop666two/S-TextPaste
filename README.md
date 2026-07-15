# S-TextPaste

> 零信任端到端加密文本分享服务。
> 所有加解密在浏览器完成，服务端仅存储密文，无法读取明文。

---

## 目录

- [CLI 一键部署](#cli-一键部署)
- [本地开发](#本地开发)
- [加密架构](#加密架构)
- [安全特性](#安全特性)
- [API 文档](#api-文档)
- [项目结构](#项目结构)
- [技术栈](#技术栈)

---

## CLI 一键部署

> Cloudflare 已逐步淘汰网页一键部署按钮，推荐使用 Wrangler CLI 部署。

### 前置要求

- Node.js 18+
- 拥有 [Cloudflare 账号](https://dash.cloudflare.com)
- 已登录 Wrangler（`npx wrangler login`）

### 方式一：全自动一键部署（推荐）

一行命令完成全部流程（创建 D1 → 构建 → 部署）：

```bash
npx wrangler login                # 首次需登录 Cloudflare
npx wrangler d1 create s-textpaste-db  # 创建数据库（仅首次）
node scripts/deploy.js            # 自动构建 + 部署
```

### 方式二：手动分步部署

```bash
# 1. 安装依赖
npm install

# 2. 构建前端
npm run build

# 3. 部署到 Cloudflare Workers
npm run deploy
```

> `npm run deploy` 会自动创建 D1 数据库绑定（如未配置），设置 `database_id`，构建前端并发布。

### D1 数据库设置（可选）

部署后如需添加 D1 持久化：

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
2. 选择 `s-textpaste` → 设置 → **D1 Database Bindings**
3. 变量名：`DB`，选择 `s-textpaste-db`
4. 或执行 `node scripts/setup-d1.js` 自动检测

## 本地开发

```bash
# 终端 1 — 后端 API
node worker/server.js              # http://localhost:8787

# 终端 2 — 前端开发服务器
cd frontend && npm install && npm run dev  # http://localhost:3000
```

### 生产构建

```bash
npm run build                      # 构建前端 → worker/public/
```

---

## 加密架构

### 密钥派生 (PBKDF2-HMAC-SHA256)

使用 **NIST 标准 PBKDF2**，通过浏览器原生 Web Crypto API 实现，无自定义密码学构造。

```
密码 + 随机盐 (32 字节)
    │
    └─→ PBKDF2-HMAC-SHA256 (100,000 轮迭代)
         │
         ├─ salt          → 256-bit AES 密钥 (单信封模式)
         ├─ salt+"env-A"  → 256-bit 第1层密钥 (双信封模式)
         ├─ salt+"env-B"  → 256-bit 第2层密钥 (双信封模式)
         └─ salt+"hmac"   → 256-bit HMAC 完整性密钥
```

### 单信封模式

```
明文
  → PBKDF2 派生密钥 ──AES-256-GCM──→ 密文
  → HMAC-SHA-256 全载荷签名           → 完整性标签
```

### 双信封模式（推荐）

```
明文
  → DEK(随机32字节) ──AES-256-GCM──→ CT1
  → 第1层密钥       ──AES-256-GCM──→ CT2 (加密 DEK)
  → 第2层密钥       ──AES-256-GCM──→ CT3 (加密 CT2)
  → HMAC-SHA-256 全载荷签名           → 完整性标签
```

两层独立派生的密钥包裹数据加密密钥 (DEK)，提供纵深防御。

### 非对称模式

```
RSA-OAEP (2048-bit, SHA-256) 加密 DEK
AES-256-GCM (DEK) 加密明文
私钥在浏览器中生成并仅展示一次，用户须自行保存。
```

---

## 安全特性

| 特性 | 实现 |
|------|------|
| 加密算法 | AES-256-GCM（认证加密） |
| 密钥派生 | PBKDF2-HMAC-SHA256（100,000 轮） |
| 完整性 | HMAC-SHA-256 + 常数时间比较 |
| 传输安全 | HTTPS + HSTS |
| 内容安全策略 | `default-src 'self'; script-src 'self' 'unsafe-inline'` |
| ID 空间 | 32 字符随机 (64^32 组合) |
| 速率限制 | 30 次/分钟/IP |
| 删除令牌 | SHA-256 哈希存储，常数时间验证 |
| 请求超时 | 30 秒 (AbortController) |
| 请求体限制 | 最大 5MB |
| 内容安全 | DOMPurify 消毒所有渲染的 Markdown |
| 内容隐私 | React Router state（内存传递），URL 不暴露明文 |
| 元数据 | 全部嵌入加密载荷内部 |
| 错误处理 | 全局 ErrorBoundary (React) + JSON 错误 (API) |
| 无障碍 | WCAG 焦点指示器、aria-label、skip-link |
| 暗色模式 | 系统检测 + 手动切换 + CSS 变量过渡 |
| 过期清理 | Cron 每 6 小时（过期/浏览上限/阅后即焚孤立记录） |

---

## API 文档

### POST `/api/paste` — 创建粘贴

**请求：**
```json
{
  "mode": "password",
  "encrypted_payload": "base64...",
  "hint": "可选提示文字",
  "salt": "base64...",
  "expires_in": 3600000,
  "max_views": 5,
  "burn_after_read": 1,
  "custom_id": "my-note",
  "pubkey_fingerprint": "ab:cd:ef:..."
}
```

**返回** `201`:
```json
{
  "id": "abc123...",
  "delete_token": "hex...",
  "expires_at": 1710000000000,
  "storage": "d1"
}
```

### GET `/api/paste/:id` — 获取粘贴

**返回：**
```json
{
  "encrypted_payload": "base64...",
  "expires_at": null,
  "view_count": 0,
  "max_views": -1,
  "burn_after_read": 0,
  "created_at": 1710000000000,
  "storage": "d1"
}
```

salt、mode、hint、algorithm 全部嵌入 `encrypted_payload` 内部。

### POST `/api/paste/:id/view` — 记录查看

触发浏览计数和阅后即焚逻辑。

**返回：**
```json
{
  "success": true,
  "view_count": 1,
  "burn_after_read": 0,
  "max_views": -1
}
```

### DELETE `/api/paste/:id` — 删除粘贴

**Headers**: `X-Delete-Token: <创建时返回的 token>`

---

## 项目结构

```
├── src/                         # Cloudflare Worker
│   ├── index.ts                 # Hono 入口 + 健康检查 + 错误处理
│   └── routes/api.ts            # REST API (D1 + 内存双模存储)
├── frontend/                    # React 18 + TypeScript
│   ├── src/
│   │   ├── crypto.ts            # 客户端加密 (PBKDF2 + AES-256-GCM)
│   │   ├── api.ts               # 类型化 API 客户端 (含超时)
│   │   ├── pages/
│   │   │   ├── CreatePage.tsx   # 编辑器 + 加密配置 + 密码强度
│   │   │   ├── ReadPage.tsx     # 解密表单 + 安全仪表盘
│   │   │   └── ViewPage.tsx     # Markdown 渲染 + 删除面板
│   │   ├── components/
│   │   │   ├── Layout.tsx       # 应用外壳 + 暗色模式 + 国际化 + 无障碍
│   │   │   ├── MarkdownEditor.tsx  # CodeMirror 6 + 实时预览
│   │   │   ├── SecurityDashboard.tsx  # 算法/密钥/完整性展示
│   │   │   ├── Disclaimer.tsx   # 法律免责声明弹窗
│   │   │   ├── LanguageSwitch.tsx
│   │   │   ├── MermaidRenderer.tsx
│   │   │   ├── KaTeXRenderer.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── i18n/                # 中/英文翻译
│   │   └── styles.css           # 完整样式表 (含暗色主题)
│   └── vite.config.ts
├── worker/
│   ├── server.js                # 本地开发 API 服务器 (Node.js)
│   ├── schema.sql               # D1 数据库表结构
│   └── public/                  # 构建产物 (自动生成)
├── scripts/                     # 构建与部署工具
├── wrangler.toml                # Workers 配置
└── package.json
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | React 18 + TypeScript (严格模式) |
| 构建工具 | Vite 5 (esbuild) |
| 编辑器 | CodeMirror 6 |
| Markdown | marked + highlight.js + Mermaid + KaTeX |
| 安全过滤 | DOMPurify |
| 加密 | Web Crypto API (PBKDF2 + AES-256-GCM + RSA-OAEP) |
| 运行时 | Cloudflare Workers |
| 框架 | Hono 4 |
| 数据库 | Cloudflare D1 (边缘 SQLite) |
| 部署 | Wrangler CLI |

---

## 免责声明

**S-TextPaste 完全免费开源**（MIT 许可证），严禁任何形式的倒卖、转售或收费分发。

**重要风险提示：**
- 本程序按"现状"提供，可能存在未知漏洞（bug），**严禁存储重要数据或敏感信息**
- **严禁长时间存储数据**，请在阅读后及时备份并删除
- 开发者不对因使用本程序导致的任何**数据丢失、数据泄露、数据损坏或任何损失**承担责任
- 您自行承担使用本服务的全部风险
- 详细条款见首次使用时的免责声明弹窗

---

## 许可证

MIT
