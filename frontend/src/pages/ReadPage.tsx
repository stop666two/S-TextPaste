import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { getPaste, recordView } from '../api'
import { decryptFromPassword, decryptForSymmetric, decryptFromAsymmetric, importPemPrivateKey, type EncryptedPayload, base64ToUtf8 } from '../crypto'
import SecurityDashboard from '../components/SecurityDashboard'

export default function ReadPage() {
  const { id } = useParams<{ id: string }>()
  const safeId = id || ''
  const navigate = useNavigate()
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [symmetricKey, setSymmetricKey] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [mode, setMode] = useState('')
  const [encryptedPayload, setEncryptedPayload] = useState('')
  const [hint, setHint] = useState('')
  const [payloadMeta, setPayloadMeta] = useState<any>(null)
  const lockoutRef = useRef(0)

  useEffect(() => {
    setPassword(''); setSymmetricKey(''); setPrivateKey(''); setError(''); lockoutRef.current = 0; setLocked(false)
    setHint(''); setMode(''); setEncryptedPayload(''); setPayloadMeta(null)
    if (!safeId) return; loadPaste()
  }, [safeId])

  async function loadPaste() {
    try {
      const data = await getPaste(safeId)
      setEncryptedPayload(data.encrypted_payload)
      if (data.expires_at && Date.now() > data.expires_at) { setError(t('pasteExpired')); return }
      if (data.max_views >= 0 && (data.view_count || 0) >= data.max_views) { setError(t('maxViewsReached')); return }

      // Extract metadata from payload (salt, mode, hint, algorithm) without decrypting
      try {
        const pp: EncryptedPayload = JSON.parse(base64ToUtf8(data.encrypted_payload))
        setMode(pp.m || '')
        setHint(pp.t || '')
        setPayloadMeta({ encrypted_payload: data.encrypted_payload })
      } catch { /* invalid payload */ }
    } catch (err: any) { setError(err.message || t('pasteNotFound')) }
  }

  const handleDecrypt = useCallback(async () => {
    if (locked || !encryptedPayload) return
    setDecrypting(true); setError('')
    try {
      const p: EncryptedPayload = JSON.parse(base64ToUtf8(encryptedPayload))
      let text: string
      if (mode === 'password' || p.m === 'password') {
        if (!password) throw new Error(t('passwordRequired'))
        text = await decryptFromPassword(p, password)
      } else if (mode === 'symmetric' || p.m === 'symmetric') {
        const kb = new TextEncoder().encode(symmetricKey)
        if (kb.length === 0) throw new Error(t('keyRequired'))
        text = await decryptForSymmetric(p, kb)
      } else {
        if (!privateKey) throw new Error(t('privateKeyRequired'))
        text = await decryptFromAsymmetric(p, await importPemPrivateKey(privateKey))
      }
      await recordView(safeId)
      navigate(`/view/${safeId}`, { state: { content: text }, replace: true })
    } catch (err: any) {
      lockoutRef.current++
      if (lockoutRef.current >= 5) { setLocked(true); setError(t('locked')) }
      else { setError(`${t('decryptionFailed')} (${lockoutRef.current}/5)`) }
    } finally { setDecrypting(false) }
  }, [mode, password, symmetricKey, privateKey, encryptedPayload, locked, navigate, t, safeId])

  return (
    <div className="read-page">
      <div className="decrypt-card">
        <h2>{t('readPaste')}</h2>

        <SecurityDashboard pasteData={payloadMeta} />

        {hint && <div className="hint-box"><strong>{t('hint')}:</strong> {hint}</div>}

        {locked ? (<div className="error-message"><p>{error}</p><button className="btn btn-secondary" onClick={() => navigate('/create')}>{t('back')}</button></div>) : (<>
          {mode === 'password' && (<div className="form-group"><label>{t('password')}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('decryptPassword')} onKeyDown={e => e.key === 'Enter' && handleDecrypt()} /></div>)}
          {mode === 'symmetric' && (<div className="form-group"><label>{t('symmetricKey')}</label><input type="text" value={symmetricKey} onChange={e => setSymmetricKey(e.target.value)} placeholder={t('symmetricKeyPlaceholder')} onKeyDown={e => e.key === 'Enter' && handleDecrypt()} /></div>)}
          {mode === 'asymmetric' && (<div className="form-group"><label>{t('privateKey')}</label><textarea value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder={t('privateKeyPlaceholder')} rows={4} onKeyDown={e => e.key === 'Enter' && handleDecrypt()} /></div>)}
          {error && <div className="error-message">{error}</div>}
          <button className="btn btn-primary btn-large" onClick={handleDecrypt} disabled={decrypting}>{decrypting ? t('decrypting') : t('decrypt')}</button>
        </>)}
      </div>
    </div>
  )
}
