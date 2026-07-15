export const en = {
  // Common
  appTitle: 'S-TextPaste',
  appDesc: 'Zero-trust end-to-end encrypted text sharing',
  create: 'Create',
  decrypt: 'Decrypt',
  delete: 'Delete',
  cancel: 'Cancel',
  save: 'Save',
  copy: 'Copy',
  share: 'Share',
  back: 'Back',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',

  // Navigation
  createPaste: 'Create Paste',
  readPaste: 'Read Paste',
  language: 'Language',

  // Editor
  writeMarkdown: 'Write your Markdown text here...',
  preview: 'Preview',
  editor: 'Editor',

  // Encryption config
  encryptionConfig: 'Encryption Configuration',
  encryptionMode: 'Encryption Mode',
  passwordMode: 'Password',
  symmetricMode: 'Symmetric Key',
  asymmetricMode: 'Asymmetric Key',

  // Password mode
  password: 'Password',
  confirmPassword: 'Confirm Password',
  passwordHint: 'Password Hint (optional)',
  passwordHintPlaceholder: 'A reminder for your password...',
  postQuantum: 'Double Envelope Encryption',
  postQuantumDesc: 'Enable dual-layer AES-256-GCM encryption for enhanced security',
  enterPassword: 'Enter password...',
  enterConfirmPassword: 'Confirm password...',

  // Symmetric mode
  symmetricKey: 'Symmetric Key',
  symmetricKeyPlaceholder: 'Enter your Base64 key or custom key...',
  symmetricKeyDesc: 'Provide a custom symmetric key directly (32 bytes for AES-256)',

  // Asymmetric mode
  publicKey: 'Public Key',
  privateKey: 'Private Key',
  publicKeyPlaceholder: 'Paste PEM or JWK public key...',
  privateKeyPlaceholder: 'Paste PEM or JWK private key...',
  uploadPublicKey: 'Upload Public Key File',
  uploadPrivateKey: 'Upload Private Key File',

  // Lifecycle
  lifecycle: 'Lifecycle Settings',
  expiration: 'Expiration',
  noExpiry: 'No expiry',
  expire1h: '1 hour',
  expire24h: '24 hours',
  expire7d: '7 days',
  expire30d: '30 days',
  maxViews: 'Max Views',
  maxViewsPlaceholder: 'Leave empty for unlimited',
  burnAfterRead: 'Burn After Reading',
  burnAfterReadDesc: 'Automatically delete after successful decryption',
  customId: 'Custom URL Slug',
  customIdPlaceholder: 'e.g., my-secret-note',

  // Create page
  creating: 'Encrypting & creating...',
  pasteCreated: 'Paste Created Successfully!',
  pasteUrl: 'Share URL',
  deleteToken: 'Delete Token',
  deleteTokenWarning: 'Save this token! You need it to delete the paste. It cannot be recovered.',
  deleteTokenHint: 'Enter the delete token saved when creating this paste to permanently delete it.',
  copyUrl: 'Copy URL',
  copyToken: 'Copy Token',

  // Read page
  decryptPassword: 'Enter Password',
  enterKey: 'Enter Key',
  hint: 'Hint',
  decrypting: 'Decrypting...',
  decryptionFailed: 'Decryption failed. Please check your password/key.',
  locked: 'Too many failed attempts. This paste is temporarily locked.',
  decryptFailed: 'Content not available. Please decrypt first.',
  pasteNotFound: 'Paste not found or has been deleted.',
  pasteExpired: 'This paste has expired.',
  maxViewsReached: 'Maximum view count reached.',

  // Security dashboard
  securityDashboard: 'Security Dashboard',
  encryptionAlgorithm: 'Encryption Algorithm',
  keyStrength: 'Key Strength',
  encryptionLayers: 'Encryption Layers',
  singleEnvelope: 'Single Layer',
  doubleEnvelope: 'Double Layer',
  yes: 'Yes',
  no: 'No',
  encryptionMode_label: 'Encryption Mode',
  dataIntegrity: 'Data Integrity',
  verified: 'Verified',
  notAvailable: 'N/A',
  expiresAt: 'Expires At',
  views: 'Views',

  // Security levels
  secure: 'Secure',
  verySecure: 'Very Secure',
  maximumSecure: 'Maximum Security',

  // Messages
  passwordsMismatch: 'Passwords do not match',
  passwordRequired: 'Password is required',
  keyRequired: 'Key is required',
  privateKeyRequired: 'Private key is required',
  invalidFormat: 'Invalid format',
  networkError: 'Network error, please try again',
  pasteDeleted: 'Paste deleted successfully',
  linkCopied: 'Link copied to clipboard',

  // Asymmetric
  privateKeySaved: 'PRIVATE KEY - Save this file!',
  privateKeySaveWarning: 'WARNING: This private key is generated in your browser and is shown only once. Save it securely before leaving this page. Without it, your paste cannot be decrypted.',

  // Notices
  freeNotice: 'Free & Open Source:',
  freeNoticeDesc: 'S-TextPaste is completely free. Resale is strictly prohibited. Do NOT store important data. See Disclaimer for details.',

  // Shortcuts
  ctrlEnterHint: 'Ctrl+Enter to create',

  // Disclaimer
  disagree: 'I Disagree',
  disclaimerRequired: 'You must agree to the terms to use this service.',

  // Accessibility
  skipToContent: 'Skip to content',
  switchDark: 'Switch to dark mode',
  switchLight: 'Switch to light mode',
};

export const zh = {
  // Common
  appTitle: 'S-TextPaste',
  appDesc: '零信任端到端加密文本分享服务',
  create: '创建',
  decrypt: '解密',
  delete: '删除',
  cancel: '取消',
  save: '保存',
  copy: '复制',
  share: '分享',
  back: '返回',
  loading: '加载中...',
  error: '错误',
  success: '成功',

  // Navigation
  createPaste: '创建粘贴',
  readPaste: '读取粘贴',
  language: '语言',

  // Editor
  writeMarkdown: '在此编写您的 Markdown 文本...',
  preview: '预览',
  editor: '编辑器',

  // Encryption config
  encryptionConfig: '加密配置',
  encryptionMode: '加密模式',
  passwordMode: '密码模式',
  symmetricMode: '对称密钥',
  asymmetricMode: '非对称密钥',

  // Password mode
  password: '密码',
  confirmPassword: '确认密码',
  passwordHint: '密码提示（可选）',
  passwordHintPlaceholder: '帮助您记住密码的提示...',
  postQuantum: '双信封加密',
  postQuantumDesc: '启用双层 AES-256-GCM 加密以增强安全性',
  enterPassword: '输入密码...',
  enterConfirmPassword: '确认密码...',

  // Symmetric mode
  symmetricKey: '对称密钥',
  symmetricKeyPlaceholder: '输入您的 Base64 密钥或自定义密钥...',
  symmetricKeyDesc: '直接提供自定义对称密钥（32 字节用于 AES-256）',

  // Asymmetric mode
  publicKey: '公钥',
  privateKey: '私钥',
  publicKeyPlaceholder: '粘贴 PEM 或 JWK 格式的公钥...',
  privateKeyPlaceholder: '粘贴 PEM 或 JWK 格式的私钥...',
  uploadPublicKey: '上传公钥文件',
  uploadPrivateKey: '上传私钥文件',

  // Lifecycle
  lifecycle: '生命周期设置',
  expiration: '过期时间',
  noExpiry: '永不过期',
  expire1h: '1 小时',
  expire24h: '24 小时',
  expire7d: '7 天',
  expire30d: '30 天',
  maxViews: '最大浏览次数',
  maxViewsPlaceholder: '留空表示不限次数',
  burnAfterRead: '阅后即焚',
  burnAfterReadDesc: '成功解密后自动删除',
  customId: '自定义 URL 后缀',
  customIdPlaceholder: '例如：my-secret-note',

  // Create page
  creating: '正在加密并创建...',
  pasteCreated: '粘贴创建成功！',
  pasteUrl: '分享链接',
  deleteToken: '删除令牌',
  deleteTokenWarning: '请保存此令牌！您需要它来删除粘贴。令牌无法恢复。',
  deleteTokenHint: '输入创建此粘贴时保存的删除令牌以永久删除。',
  copyUrl: '复制链接',
  copyToken: '复制令牌',

  // Read page
  decryptPassword: '输入密码',
  enterKey: '输入密钥',
  hint: '提示',
  decrypting: '正在解密...',
  decryptionFailed: '解密失败，请检查密码/密钥。',
  locked: '失败次数过多，此粘贴已暂时锁定。',
  decryptFailed: '内容不可用，请先解密。',
  pasteNotFound: '粘贴不存在或已被删除。',
  pasteExpired: '此粘贴已过期。',
  maxViewsReached: '已达到最大浏览次数。',

  // Security dashboard
  securityDashboard: '安全性仪表盘',
  encryptionAlgorithm: '加密算法',
  keyStrength: '密钥强度',
  encryptionLayers: '加密层数',
  singleEnvelope: '单层',
  doubleEnvelope: '双层',
  yes: '是',
  no: '否',
  encryptionMode_label: '加密模式',
  dataIntegrity: '数据完整性',
  verified: '已验证',
  notAvailable: '不可用',
  expiresAt: '过期时间',
  views: '浏览次数',

  // Security levels
  secure: '安全',
  verySecure: '非常安全',
  maximumSecure: '最高安全级别',

  // Messages
  passwordsMismatch: '两次输入的密码不一致',
  passwordRequired: '密码不能为空',
  keyRequired: '密钥不能为空',
  privateKeyRequired: '私钥不能为空',
  invalidFormat: '格式无效',
  networkError: '网络错误，请稍后重试',
  pasteDeleted: '粘贴删除成功',
  linkCopied: '链接已复制到剪贴板',

  // Asymmetric
  privateKeySaved: '私钥 - 请保存此文件！',
  privateKeySaveWarning: '警告：此私钥在您的浏览器中生成，仅显示一次。请在离开页面前安全保存。没有私钥将无法解密您的粘贴。',

  // Notices
  freeNotice: '免费开源声明：',
  freeNoticeDesc: 'S-TextPaste 完全免费，严禁倒卖。请勿存储重要数据。详见免责声明。',

  // Shortcuts
  ctrlEnterHint: 'Ctrl+Enter 创建',

  // Disclaimer
  disagree: '不同意',
  disclaimerRequired: '您必须同意条款才能使用本服务。',

  // Accessibility
  skipToContent: '跳转到内容',
  switchDark: '切换到深色模式',
  switchLight: '切换到浅色模式',
};
