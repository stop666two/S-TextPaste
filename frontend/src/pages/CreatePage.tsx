import { useState, useCallback } from 'react'
import { useI18n } from '../i18n/context'
import MarkdownEditor from '../components/MarkdownEditor'
import { encryptForPassword, encryptForSymmetric, type EncryptedPayload, bufferToBase64, utf8ToBase64 } from '../crypto'
import { createPaste } from '../api'

export default function CreatePage() {
  const { t } = useI18n()
  const [markdownText, setMarkdownText] = useState('')
  const [mode, setMode] = useState<'password' | 'symmetric' | 'asymmetric'>('password')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [hint, setHint] = useState('')
  const [useQuantum, setUseQuantum] = useState(true)
  const [symmetricKey, setSymmetricKey] = useState('')
  const [expiresIn, setExpiresIn] = useState('')
  const [maxViews, setMaxViews] = useState('')
  const [burnAfterRead, setBurnAfterRead] = useState(false)
  const [customId, setCustomId] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ id: string; delete_token: string } | null>(null)

  const handleCreate = useCallback(async () => {
    setError(''); setCreating(true); setResult(null)
    try {
      let payload: EncryptedPayload
      if (mode === 'password') {
        if (!password) { setError(t('passwordRequired')); setCreating(false); return }
        if (password !== confirmPassword) { setError(t('passwordsMismatch')); setCreating(false); return }
        payload = await encryptForPassword(markdownText, password, useQuantum, hint)
      } else if (mode === 'symmetric') {
        const kb = new TextEncoder().encode(symmetricKey)
        if (kb.length === 0) { setError(t('keyRequired')); setCreating(false); return }
        payload = await encryptForSymmetric(markdownText, kb)
      } else {
        const kp = await crypto.subtle.generateKey({
          name: 'RSA-OAEP', modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hashes: { name: 'SHA-256' }
        } as any, true, ['encrypt', 'decrypt']) as any
        const dek = crypto.getRandomValues(new Uint8Array(32))
        const dk = await crypto.subtle.importKey('raw', dek, { name: 'AES-GCM', length: 256 } as any, false, ['encrypt'])
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dk, new TextEncoder().encode(markdownText))
        const dct = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, kp.publicKey, dek)
        const pr = await crypto.subtle.exportKey('raw', kp.publicKey)
        const hs = new Uint8Array(await crypto.subtle.digest('SHA-256', pr))
        payload = {
          v: '2.0', m: 'asymmetric', s: '', d: bufferToBase64(new Uint8Array(ct)), i: bufferToBase64(new Uint8Array(iv)),
          e: bufferToBase64(new Uint8Array(dct)), j: bufferToBase64(new Uint8Array(iv)),
          p: Array.from(hs.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(':'),
          a: 'RSA-OAEP-AES-256-GCM', q: false
        }
      }
      const body: any = { mode, encrypted_payload: utf8ToBase64(JSON.stringify(payload)), hint, burn_after_read: burnAfterRead ? 1 : 0 }
      if (payload.s) body.salt = payload.s
      if (expiresIn) body.expires_in = parseInt(expiresIn, 10)
      if (maxViews) body.max_views = parseInt(maxViews, 10)
      if (customId) body.custom_id = customId
      if (payload.p) body.pubkey_fingerprint = payload.p
      const resp = await createPaste(body)
      setResult({ id: resp.id, delete_token: resp.delete_token })
    } catch (err: any) { setError(err.message || t('networkError')) }
    finally { setCreating(false) }
  }, [mode, password, confirmPassword, symmetricKey, markdownText, hint, useQuantum, expiresIn, maxViews, burnAfterRead, customId, t])

  if (result) {
    const shareUrl = `${window.location.origin}/read/${result.id}`
    return (
      <div className="create-result">
        <h2>{t('pasteCreated')}</h2>
        <div className="result-section"><label>{t('pasteUrl')}</label><div className="result-input"><input type="text" readOnly value={shareUrl} /><button onClick={() => navigator.clipboard.writeText(shareUrl)}>{t('copyUrl')}</button></div></div>
        <div className="result-section warning"><label>{t('deleteToken')}</label><div className="result-input"><input type="text" readOnly value={result.delete_token} /><button onClick={() => navigator.clipboard.writeText(result.delete_token)}>{t('copyToken')}</button></div><p className="warning-text">{t('deleteTokenWarning')}</p></div>
        <button className="btn btn-secondary" onClick={() => { setResult(null); setMarkdownText(''); setPassword(''); setConfirmPassword(''); setHint(''); setSymmetricKey(''); setExpiresIn(''); setMaxViews(''); setBurnAfterRead(false); setCustomId('') }}>{t('createPaste')}</button>
      </div>
    )
  }

  return (
    <div className="create-page">
      <MarkdownEditor value={markdownText} onChange={setMarkdownText} />
      <div className="config-panel">
        <h3>{t('encryptionConfig')}</h3>
        <div className="form-group"><label>{t('encryptionMode')}</label><select value={mode} onChange={e => setMode(e.target.value as any)}><option value="password">{t('passwordMode')}</option><option value="symmetric">{t('symmetricMode')}</option><option value="asymmetric">{t('asymmetricMode')}</option></select></div>
        {mode === 'password' && (<>
          <div className="form-group"><label>{t('password')}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('enterPassword')} /></div>
          <div className="form-group"><label>{t('confirmPassword')}</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('enterConfirmPassword')} /></div>
          <div className="form-group"><label>{t('passwordHint')}</label><input type="text" value={hint} onChange={e => setHint(e.target.value)} placeholder={t('passwordHintPlaceholder')} /></div>
          <div className="form-group checkbox"><label><input type="checkbox" checked={useQuantum} onChange={e => setUseQuantum(e.target.checked)} />{t('postQuantum')}</label><span className="form-desc">{t('postQuantumDesc')}</span></div>
        </>)}
        {mode === 'symmetric' && (<div className="form-group"><label>{t('symmetricKey')}</label><textarea value={symmetricKey} onChange={e => setSymmetricKey(e.target.value)} placeholder={t('symmetricKeyPlaceholder')} rows={3} /><span className="form-desc">{t('symmetricKeyDesc')}</span></div>)}
        {mode === 'asymmetric' && (<div className="form-group"><label>{t('publicKey')}</label><textarea placeholder={t('publicKeyPlaceholder')} rows={4} readOnly value="RSA-2048 keys generated automatically in your browser." /></div>)}
        <h3>{t('lifecycle')}</h3>
        <div className="form-row">
          <div className="form-group"><label>{t('expiration')}</label><select value={expiresIn} onChange={e => setExpiresIn(e.target.value)}><option value="">{t('noExpiry')}</option><option value="3600000">{t('expire1h')}</option><option value="86400000">{t('expire24h')}</option><option value="604800000">{t('expire7d')}</option><option value="2592000000">{t('expire30d')}</option></select></div>
          <div className="form-group"><label>{t('maxViews')}</label><input type="number" value={maxViews} onChange={e => setMaxViews(e.target.value)} placeholder={t('maxViewsPlaceholder')} min={1} /></div>
        </div>
        <div className="form-group checkbox"><label><input type="checkbox" checked={burnAfterRead} onChange={e => setBurnAfterRead(e.target.checked)} />{t('burnAfterRead')}</label><span className="form-desc">{t('burnAfterReadDesc')}</span></div>
        <div className="form-group"><label>{t('customId')}</label><input type="text" value={customId} onChange={e => setCustomId(e.target.value)}             placeholder={t('customIdPlaceholder')}
            pattern="[a-zA-Z0-9_-]{8,64}"
            minLength={8}
            maxLength={64} /></div>
        {error && <div className="error-message">{error}</div>}
        <button className="btn btn-primary btn-large" onClick={handleCreate} disabled={creating || !markdownText.trim()}>{creating ? t('creating') : t('create')}</button>
      </div>
    </div>
  )
}
