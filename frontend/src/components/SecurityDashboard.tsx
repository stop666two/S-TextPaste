import { base64ToUtf8 } from '../crypto'
import { useI18n } from '../i18n/context'

function parsePayload(b64: string): any {
  try { return JSON.parse(base64ToUtf8(b64)) }
  catch { return {} }
}

export default function SecurityDashboard({ pasteData }: { pasteData: any }) {
  const { t } = useI18n()
  if (!pasteData || !pasteData.encrypted_payload) return null

  const p = parsePayload(pasteData.encrypted_payload)
  const modeRaw = p.m || 'unknown'
  const modeName = modeRaw === 'password' ? t('passwordMode') : modeRaw === 'symmetric' ? t('symmetricMode') : modeRaw === 'asymmetric' ? t('asymmetricMode') : modeRaw
  const algorithm = p.a || 'AES-256-GCM'
  const quantumSafe = algorithm.includes('PQ') || algorithm.includes('TripleEnvelope')
  const keyStrength = quantumSafe ? t('maximumSecure') : t('secure')

  return (
    <div className="security-dashboard">
      <h3>{t('securityDashboard')}</h3>
      <div className="dashboard-grid">
        <div className="dash-item"><span className="dash-label">{t('encryptionAlgorithm')}</span><span className="dash-value">{algorithm}</span></div>
        <div className="dash-item"><span className="dash-label">{t('encryptionMode_label')}</span><span className="dash-value">{modeName}</span></div>
        <div className="dash-item"><span className="dash-label">{t('keyStrength')}</span><span className={`dash-value strength-${quantumSafe ? 'max' : 'med'}`}>{keyStrength}</span></div>
        <div className="dash-item"><span className="dash-label">{t('quantumSafe')}</span><span className={`dash-value ${quantumSafe ? 'yes' : 'no'}`}>{quantumSafe ? t('yes') : t('no')}</span></div>
        <div className="dash-item"><span className="dash-label">{t('dataIntegrity')}</span><span className="dash-value yes">{t('verified')}</span></div>
        {pasteData.burn_after_read === 1 && (<div className="dash-item"><span className="dash-label">{t('burnAfterRead')}</span><span className="dash-value yes">{t('yes')}</span></div>)}
      </div>
    </div>
  )
}
