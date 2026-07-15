import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/context'

const zh = `S-TextPaste 免责声明与使用条款

【重要】使用本服务前请仔细阅读以下条款。点击"同意"即表示您已阅读、理解并同意全部条款；点击"不同意"将关闭页面。

一、服务性质与许可证
1.1 本程序（S-TextPaste）是一款完全免费、开源的端到端加密文本分享工具，源代码以 MIT 许可证发布在 GitHub 上。
1.2 本程序完全免费，严禁任何个人或组织在未经授权的情况下对本程序进行倒卖、转售、收费分发或将其作为付费服务的一部分。
1.3 所有加密解密操作在您的浏览器中完成，服务器仅存储不可读的密文。我们无法解密、查看或恢复您的数据。

二、数据安全与风险告知
2.1 本服务采用 AES-256-GCM 加密算法及 PBKDF2 密钥派生（100,000 轮迭代）。
2.2 尽管我们使用了业界公认的加密标准，但本程序可能存在未知的漏洞（bug）、安全缺陷或兼容性问题。
2.3 严禁使用本服务存储任何重要数据、敏感信息、隐私内容或具有法律效力的文件。
2.4 严禁长时间存储数据。请务必在阅读后及时备份并删除您的粘贴。本服务不保证数据的持续可用性。
2.5 您上传的数据仅以密文形式存储，但开发者不对因以下原因导致的数据丢失、数据泄露、数据损坏或任何损失承担责任：
    - 服务端故障、数据库损坏或数据被意外删除
    - 第三方攻击、网络拦截或安全漏洞利用
    - 您遗忘密码或丢失删除令牌导致数据无法恢复
    - 程序未知 bug 导致加密/解密失败
    - 浏览器兼容性问题导致功能异常
    - Cloudflare Workers 或 D1 服务中断或数据丢失

三、密码与密钥
3.1 您设置的密码是解密数据的唯一凭证，密码不会以任何形式上傳至服务器。
3.2 如果您遗忘密码，数据将永久无法恢复，没有任何途径可以找回。
3.3 强烈建议您使用强密码（至少 8 位，包含大小写字母、数字和特殊字符）并妥善保管。

四、数据保留与删除
4.1 您可以设置过期时间、最大浏览次数和阅后即焚。达到设定条件后数据将永久删除，不可恢复。
4.2 即使设置了过期时间，在过期前的所有时间内数据仍然可被任何知道链接的人访问。
4.3 开发者有权但不承担义务定期清理过期数据。请勿依赖本服务作为唯一的數據存储方案。

五、禁止用途
5.1 严禁使用本服务传播违法内容、恶意软件、侵犯他人知识产权的内容。
5.2 严禁使用本服务进行任何违反中华人民共和国法律、国际法或您所在地法律的活动。
5.3 如发现违规使用，开发者保留终止服务的权利，且不承担任何通知义务。

六、免责条款
6.1 本服务按"现状"（AS IS）提供，不提供任何明示或暗示的保证，包括但不限于适销性、特定用途适用性和不侵权。
6.2 我们不保证服务不中断、无错误、安全或无漏洞。
6.3 在法律允许的最大范围内，开发者不对因使用或无法使用本服务而产生的任何直接、间接、偶然、特殊或后果性损失承担责任，包括但不限于数据丢失、数据泄露、业务中断或利润损失。
6.4 您自行承担使用本服务的全部风险。

七、服务变更与终止
7.1 开发者保留随时修改、更新或终止服务的权利，恕不另行通知。
7.2 条款变更在更新后立即生效。继续使用本服务即表示您接受修订后的条款。

八、其他
8.1 本条款受中华人民共和国法律管辖。
8.2 因本服务产生的争议应首先通过友好协商解决；协商不成的，提交开发者所在地有管辖权的法院裁决。
8.3 如本条款的任何部分被认定为无效或不可执行，其余部分仍然具有完全效力。`;

const en = `S-TextPaste Disclaimer & Terms of Use

[IMPORTANT] Please read carefully before using this service. Clicking "I Agree" means you have read, understood, and agree to all terms. Clicking "I Disagree" will close this page.

1. Service Nature & License
1.1 S-TextPaste is a completely free, open-source end-to-end encrypted text sharing tool, released under the MIT license on GitHub.
1.2 This program is completely free. Resale, redistribution for profit, or inclusion as part of a paid service is strictly prohibited without explicit authorization.
1.3 All encryption and decryption occur in your browser. The server stores only unreadable ciphertext. We cannot decrypt, view, or recover your data.

2. Data Security & Risk Acknowledgement
2.1 This service uses AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations).
2.2 Despite using industry-standard encryption, this program may contain unknown bugs, security flaws, or compatibility issues.
2.3 DO NOT use this service to store any important data, sensitive information, private content, or legally binding documents.
2.4 DO NOT store data for extended periods. Always back up and delete your pastes after reading. This service does not guarantee data availability.
2.5 The developers shall not be held liable for any data loss, data leakage, data corruption, or damages resulting from:
    - Server failure, database corruption, or accidental deletion
    - Third-party attacks, network interception, or security exploits
    - Forgotten passwords or lost delete tokens
    - Unknown program bugs causing encryption/decryption failure
    - Browser compatibility issues
    - Cloudflare Workers or D1 service outages or data loss

3. Passwords & Keys
3.1 Your password is the sole credential for decrypting data. Passwords are never transmitted to the server.
3.2 If you forget your password, data is permanently irrecoverable with no recovery option.
3.3 Strong passwords (8+ chars with mixed case, digits, and symbols) are strongly recommended.

4. Data Retention & Deletion
4.1 You may set expiration time, max views, and burn-after-reading. Data is permanently deleted when conditions are met.
4.2 Before expiration, anyone with the link can access the data.
4.3 The developers reserve the right but assume no obligation to periodically clean expired data. Do not rely on this service as your sole data storage.

5. Prohibited Use
5.1 Do not use this service to distribute illegal content, malware, or infringing material.
5.2 Do not use this service for any activity violating applicable laws.
5.3 The developers reserve the right to terminate service upon discovering prohibited use, without notice.

6. Disclaimer of Warranties
6.1 This service is provided "AS IS" without warranty of any kind, express or implied.
6.2 We do not guarantee uninterrupted, error-free, or secure service.
6.3 To the fullest extent permitted by law, the developers shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use of this service.
6.4 You assume all risk associated with using this service.

7. Service Modifications
7.1 The developers reserve the right to modify, update, or discontinue the service at any time without notice.
7.2 Continued use after terms are updated constitutes acceptance of the revised terms.

8. Miscellaneous
8.1 These terms are governed by applicable laws.
8.2 Disputes shall be resolved through good-faith negotiation first; if unsuccessful, submitted to competent courts.
8.3 If any provision is found invalid, the remaining provisions remain in full force.`;

const texts: Record<string, { title: string; body: string; agree: string; disagree: string }> = {
  zh: { title: '免责声明与使用条款', body: zh, agree: '同意', disagree: '不同意' },
  en: { title: 'Disclaimer & Terms of Use', body: en, agree: 'I Agree', disagree: 'I Disagree' },
}

export default function Disclaimer() {
  const { lang } = useI18n()
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const accepted = localStorage.getItem('s-textpaste-disclaimer')
      if (!accepted) setShow(true)
    } catch { setShow(true) }
  }, [])

  if (!show) return null

  const t = texts[lang] || texts.en

  const handleAgree = () => {
    try { localStorage.setItem('s-textpaste-disclaimer', '1') } catch { /* privacy mode */ }
    setShow(false)
  }

  const handleDisagree = () => {
    window.location.href = 'about:blank'
    // Fallback: try to close the window
    try { window.close() } catch { /* cannot close */ }
  }

  return (
    <div className="disclaimer-overlay" style={{ zIndex: 10000 }}>
      <div className="disclaimer-modal" style={{ maxWidth: '800px' }}>
        <h2>{t.title}</h2>
        <div className="disclaimer-body" style={{ maxHeight: '55vh', fontSize: '0.8rem' }}>{t.body}</div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn btn-primary btn-large" onClick={handleAgree} style={{ flex: 1 }}>
            {t.agree}
          </button>
          <button className="btn btn-danger btn-large" onClick={handleDisagree} style={{ flex: 1 }}>
            {t.disagree}
          </button>
        </div>
      </div>
    </div>
  )
}
