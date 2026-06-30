import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/context'

const zh = `S-TextPaste 免责声明与使用条款

使用本服务即表示您已阅读、理解并同意以下条款。若您不同意，请立即停止使用。

1. 服务性质
S-TextPaste 是一个端到端加密文本分享工具。所有加密解密操作在您的浏览器中完成，服务器仅存储不可读的密文。我们无法解密、查看或恢复您的数据。

2. 数据安全与隐私
本服务采用 AES-256-GCM 加密算法及三重包络后量子加密技术。尽管我们使用了业界公认的加密标准，但仍可能存在未知漏洞。您上传的数据仅以密文形式存储，服务端在任何情况下均无法获取明文内容。

3. 密码与密钥
您设置的密码是解密数据的唯一凭证。密码不会以任何形式上传至服务器。如果您遗忘了密码，数据将永久无法恢复。我们强烈建议您使用强密码并妥善保管。

4. 数据保留与删除
您可以设置粘贴的过期时间、最大浏览次数和阅后即焚。达到设定条件后，数据将从服务器永久删除。删除操作不可逆。

5. 禁止用途
您不得使用本服务传播违法内容、恶意软件、侵犯他人知识产权的内容或进行任何违反中华人民共和国法律及国际法的活动。如发现违规使用，我们保留终止服务的权利。

6. 免责条款
本服务按"现状"提供，不提供任何明示或暗示的保证。我们不保证服务不间断或无错误。在法律允许的最大范围内，开发者不对因使用本服务而产生的任何直接或间接损失承担责任。

7. 服务变更
我们保留随时修改或终止服务的权利，恕不另行通知。条款变更将在本页面更新后生效。

8. 管辖权
本条款受中华人民共和国法律管辖。因本服务产生的争议应通过友好协商解决，协商不成的提交开发者所在地法院管辖。

点击"同意"即表示您接受以上全部条款。`;

const en = `S-TextPaste Disclaimer & Terms of Use

By using this service, you acknowledge that you have read, understood, and agree to be bound by the following terms. If you do not agree, please discontinue use immediately.

1. Nature of Service
S-TextPaste is an end-to-end encrypted text sharing tool. All encryption and decryption operations occur within your browser. The server stores only unreadable ciphertext. We cannot decrypt, view, or recover your data under any circumstances.

2. Data Security and Privacy
This service employs AES-256-GCM encryption with triple-envelope post-quantum cryptography. While we utilize industry-recognized encryption standards, unknown vulnerabilities may exist. Your uploaded data is stored exclusively as ciphertext. The server cannot access plaintext content under any condition.

3. Passwords and Keys
The password you set is the sole credential for decrypting your data. Passwords are never transmitted to the server in any form. If you lose or forget your password, your data becomes permanently irrecoverable. We strongly recommend using strong passwords and storing them securely.

4. Data Retention and Deletion
You may configure expiration time, maximum view count, and burn-after-reading for your pastes. Upon reaching configured thresholds, data is permanently deleted from the server. Deletion is irreversible.

5. Prohibited Use
You may not use this service to distribute illegal content, malware, infringing material, or engage in any activity that violates applicable laws and regulations. We reserve the right to terminate service upon discovery of prohibited use.

6. Disclaimer of Warranties
This service is provided "AS IS" without warranty of any kind, express or implied. We do not guarantee uninterrupted or error-free service. To the fullest extent permitted by law, the developers shall not be liable for any direct or indirect damages arising from the use of this service.

7. Service Modifications
We reserve the right to modify or discontinue the service at any time without prior notice. Changes to these terms become effective upon posting on this page.

8. Governing Law
These terms are governed by applicable laws. Any disputes arising from the use of this service shall be resolved through good-faith negotiation, failing which they shall be submitted to the competent courts.

By clicking "I Agree," you accept all of the above terms.`;

const texts: Record<string, { title: string; body: string; agree: string }> = {
  zh: { title: '免责声明与使用条款', body: zh, agree: '同意' },
  en: { title: 'Disclaimer & Terms of Use', body: en, agree: 'I Agree' },
}

export default function Disclaimer() {
  const { lang } = useI18n()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('s-textpaste-disclaimer')
    if (!accepted) setShow(true)
  }, [])

  if (!show) return null

  const t = texts[lang] || texts.en

  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-modal">
        <h2>{t.title}</h2>
        <div className="disclaimer-body">{t.body}</div>
        <button
          className="btn btn-primary btn-large"
          onClick={() => { localStorage.setItem('s-textpaste-disclaimer', '1'); setShow(false) }}
        >
          {t.agree}
        </button>
      </div>
    </div>
  )
}
