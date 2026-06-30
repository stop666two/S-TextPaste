import { useI18n, type Lang } from '../i18n/context'

export default function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()

  return (
    <select
      className="lang-select"
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      aria-label={t('language')}
    >
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  )
}
