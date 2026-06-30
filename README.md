# S-TextPaste

**零信任端到端加密文本分享** — Zero-trust end-to-end encrypted text sharing with post-quantum triple-envelope encryption.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/stop666two/S-TextPaste)

---

## 核心特性

| 特性 | 实现 |
|------|------|
| 密码派生密钥 | SHA-256 + MD5 交错，12轮链式迭代 → 512-bit |
| 后量子加密 (PQC) | 两个1024-bit KDF + 三重包络 AES-256-GCM |
| HMAC 完整性校验 | 7轮独立 KDF 派生 HMAC 密钥，防篡改 |
| 阅后即焚 | 解密成功后立即从服务器永久删除 |
| Markdown 编辑器 | CodeMirror 6 + 实时预览 + GFM |
| Mermaid 流程图 | 完整支持，异步渲染 |
| KaTeX 数学公式 | 行内 `$...$` + 块级 `$$...$$` |
| 代码语法高亮 | highlight.js，GitHub Dark 主题 |
| 暗黑模式 | 自动检测系统主题 |
| 中/英文切换 | localStorage 持久化 |
| 自定义短链接 | 8-64字符，支持 a-z A-Z 0-9 - _ |
| 链接爆破防护 | 32字符随机 ID + 速率限制 |

---

## 加密架构

```
┌─────────────────────────────────────┐
│           用户输入密码               │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│     derive512(pw, salt)  12轮 KDF    │  → 512-bit 密钥材料
│     derive1024A(pw, salt) 24轮 KDF   │  → 1024-bit PQ 密钥1
│     derive1024B(pw, salt) 24轮 KDF   │  → 1024-bit PQ 密钥2
│     deriveHMAC(pw, salt)  7轮 KDF    │  → HMAC 完整性密钥
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  三重包络加密 (Triple Envelope)      │
│                                     │
│  明文 ──DEK(random)──► AES-GCM ──┐  │
│                                  │  │
│  密文L1 ──Key2(1024bit)──► AES-GCM│  │
│                                  │  │
│  密文L2 ──Key1(1024bit)──► AES-GCM│  │
│                                  ▼  │
│               encrypted_payload     │
└─────────────────────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  HMAC-SHA-256(integrityKey, payload) │  → 防篡改标签
└─────────────────────────────────────┘
```

**每一轮 KDF 同时使用 SHA-256 和 MD5，链式迭代，不同密钥采用完全不同的推导路径。**

---

## 快速开始

### 本地开发

```bash
# 安装依赖
cd frontend && npm install

# 启动前端 (Vite, port 3000)
npm run dev

# 另一个终端: 启动后端模拟服务器 (port 8787)
cd worker && node server.js
```

或一键启动:
```bash
node scripts/dev.js
```

打开 http://localhost:3000

### 部署到 Cloudflare Workers

#### 方式一：一键部署按钮 (推荐)

点击上方 **Deploy to Cloudflare Workers** 按钮，自动完成：
1. 克隆仓库到你的 Cloudflare 账号
2. 创建 D1 数据库
3. 自动构建和部署

#### 方式二：命令行部署

```bash
git clone https://github.com/stop666two/S-TextPaste
cd S-TextPaste

# 创建 D1 数据库
npx wrangler d1 create s-textpaste-db
# 将返回的 database_id 填入 wrangler.toml

# 安装 + 构建 + 部署
npm install && npm run build && npm run deploy
```

---

## 项目结构

```
s-textpaste/
├── frontend/                  # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/        # MarkdownEditor, SecurityDashboard, Layout
│   │   ├── pages/             # CreatePage, ReadPage, ViewPage
│   │   ├── i18n/              # 中/英文翻译
│   │   ├── crypto.ts          # 全部加密逻辑 (客户端)
│   │   ├── api.ts             # API 客户端
│   │   └── styles.css         # 样式 + 暗黑模式 + 代码高亮主题
├── worker/                    # Cloudflare Workers
│   ├── src/
│   │   ├── index.ts           # Hono 应用 (API + 静态文件 + SPA)
│   │   ├── routes/api.ts      # REST API 路由
│   │   ├── db/pastes.ts       # D1 数据库操作
│   │   └── utils/crypto.ts    # 服务端加密工具
│   ├── server.js              # 本地开发模拟服务器
│   ├── schema.sql             # D1 建表语句
│   └── wrangler.toml          # Workers 配置
└── scripts/                   # 构建和部署脚本
    ├── build.js               # 构建脚本
    ├── deploy.js              # 部署脚本
    ├── deploy.sh              # Linux/Mac 部署脚本
    └── dev.js                 # 本地开发启动脚本
```

---

## API 接口

Base URL: `https://<your-worker>.workers.dev`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/paste` | 创建加密粘贴 | 无 |
| GET | `/api/paste/:id` | 获取粘贴元数据 | 无 |
| POST | `/api/paste/:id/view` | 记录查看 | 无 |
| DELETE | `/api/paste/:id` | 删除粘贴 | `X-Delete-Token` |
| GET | `/health` | 健康检查 | 无 |

### GET 返回示例
```json
{
  "encrypted_payload": "base64...",
  "expires_at": null,
  "view_count": 0,
  "max_views": -1,
  "burn_after_read": 0,
  "created_at": 1750000000000
}
```

> **安全设计**: salt、mode、hint、algorithm 等元数据全部嵌入 `encrypted_payload` 内，API 响应不泄露任何加密细节。

---

## 安全策略

- **零信任**: 服务端不可信。所有加解密在浏览器完成。
- **无明文记录**: Worker 日志不记录密码、密钥、明文。
- **AES-256-GCM**: 自带认证标签，防止密文篡改。
- **HMAC-SHA-256**: 完整载荷校验，任何篡改立即可检测。
- **密钥独立**: 加密密钥与 HMAC 密钥通过不同 KDF 路径推导，互不关联。
- **速率限制**: 每 IP 30次/分钟 (HTTP 429)。
- **链接爆破防护**: 32字符随机 ID (64^32 ≈ 6.2×10^57 种组合)。
- **CSP**: `default-src 'self'`，禁止外部脚本。
- **HTTPS**: Cloudflare Workers 默认强制 HTTPS。

---

## 威胁模型

| 攻击 | 防护 |
|------|------|
| 服务器被入侵 | 所有数据为 AES-256-GCM 密文 + HMAC，无法解密 |
| 中间人攻击 | HTTPS + HMAC 完整性校验 |
| 密文篡改 | HMAC-SHA-256 立即检测并拒绝 |
| 链接爆破 | 32字符 ID + 速率限制 |
| 量子计算攻击 | 24轮 1024-bit KDF 三重包络 |
| 侧信道攻击 | Web Crypto API 常数时间实现 |
| XSS | 严格 CSP 头 |
| CSRF | 删除令牌哈希验证 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18, TypeScript, Vite |
| 编辑器 | CodeMirror 6 |
| Markdown | marked + highlight.js + mermaid + KaTeX |
| 加密 | Web Crypto API (AES-256-GCM, HMAC-SHA-256, RSA-OAEP) |
| 后端 | Cloudflare Workers + Hono |
| 数据库 | Cloudflare D1 (SQLite) |
| 部署 | Wrangler CLI |

---

## 路线图

- [x] P0: AES-256-GCM 加解密 + 密码派生密钥
- [x] P1: 后量子三重包络 (24轮 1024-bit KDF)
- [x] P2: 对称/非对称模式 + 生命周期控制
- [x] P3: CodeMirror 6 + 实时预览 + Mermaid + KaTeX
- [x] P4: 暗黑模式 + 中英文切换 + 自定义链接
- [x] 安全加固: HMAC 校验 + 32字符 ID + 速率限制 + 载荷元数据隐藏
- [ ] P5: 第三方安全审计 + E2E 测试 + v1.0 发布

---

## License

MIT
