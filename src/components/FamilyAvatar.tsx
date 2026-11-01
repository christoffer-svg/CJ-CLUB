import { useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { setFamilyPhoto } from '../lib/familyPhoto'

/** Inicial del apellido: "Familia Jansen" → "J" */
const initial = (name: string) => (name.replace(/^(familia|family|familie|famille|familj(en)?)\s+/i, '').trim()[0] ?? '·').toUpperCase()

/** Foto redonda de una casa o familia; sin foto, la inicial del apellido */
export function FamilyAvatar({ url, name, size = 40 }: { url?: string | null; name: string; size?: number }) {
  return url ? (
    <img className="fam-avatar" src={url} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="fam-avatar fam-avatar--empty" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {initial(name)}
    </span>
  )
}

/** Foto de perfil en el Inicio: al tocarla se elige otra; se puede quitar */
export function EditableFamilyPhoto({ url: saved, name, readOnly }: { url?: string | null; name: string; readOnly?: boolean }) {
  const { t } = useI18n()
  // La ficha del Inicio se carga una vez: tras cambiarla, se muestra la foto nueva sin recargar
  const [changed, setChanged] = useState<string | null | undefined>(undefined)
  const url = changed !== undefined ? changed : saved
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function change(file: File | null) {
    setBusy(true)
    setError(false)
    try {
      const photo = await setFamilyPhoto(file)
      setChanged(photo?.url ?? null)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  if (readOnly) return url ? <FamilyAvatar url={url} name={name} size={72} /> : null
  return (
    <div className="fam-photo">
      <button type="button" className="fam-photo__btn" disabled={busy} onClick={() => input.current?.click()} aria-label={url ? t('photo.change') : t('photo.add')}>
        <FamilyAvatar url={url} name={name} size={72} />
        <span className="fam-photo__label">{busy ? t('photo.uploading') : url ? t('photo.change') : t('photo.add')}</span>
      </button>
      {url && !busy && (
        <button type="button" className="link-btn fam-photo__remove" onClick={() => window.confirm(t('photo.removeConfirm')) && change(null)}>
          {t('photo.remove')}
        </button>
      )}
      {error && <span className="fam-photo__error">{t('photo.error')}</span>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) change(f)
        }}
      />
    </div>
  )
}
