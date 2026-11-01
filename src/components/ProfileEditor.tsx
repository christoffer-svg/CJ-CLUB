import { useEffect, useState } from 'react'
import { Field, Input, Textarea } from './admin/Fields'
import { useToast } from './admin/Toast'
import { cleanProfile, saveProfile, uploadProfilePhotos, type ProfileCollection } from '../lib/profiles'
import { MAX_PROFILE_PHOTOS, type PublicProfile } from '../lib/types'

/**
 * Presentación de un colaborador, en el panel (del negocio o de CJ): textos, contacto y fotos.
 * Las fotos nuevas se suben al elegirlas; todo se guarda con «Guardar presentación».
 */
export default function ProfileEditor({
  coll,
  id,
  value,
  withPhone = true,
  audience,
}: {
  coll: ProfileCollection
  id: string
  value: PublicProfile
  /** los colaboradores de servicios ya tienen su teléfono en la ficha */
  withPhone?: boolean
  /** texto de ayuda sobre quién lo ve */
  audience: string
}) {
  const toast = useToast()
  const [draft, setDraft] = useState<PublicProfile>(value)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  // Si cambia de colaborador, se empieza de nuevo con sus datos
  const [loadedId, setLoadedId] = useState(id)
  useEffect(() => {
    if (id !== loadedId) {
      setDraft(value)
      setLoadedId(id)
    }
  }, [id, loadedId, value])
  const dirty = JSON.stringify(cleanProfile(draft)) !== JSON.stringify(cleanProfile(value))
  const photos = draft.photos ?? []
  const set = (patch: Partial<PublicProfile>) => setDraft((d) => ({ ...d, ...patch }))

  async function addPhotos(files: File[]) {
    const room = MAX_PROFILE_PHOTOS - photos.length
    if (!files.length || room <= 0) return
    setUploading(true)
    try {
      const added = await uploadProfilePhotos(coll, id, files.filter((f) => f.type.startsWith('image/')).slice(0, room))
      setDraft((d) => ({ ...d, photos: [...(d.photos ?? []), ...added] }))
      toast(added.length === 1 ? 'Foto añadida. Pulse «Guardar presentación» para publicarla.' : 'Fotos añadidas. Pulse «Guardar presentación» para publicarlas.')
    } catch {
      toast('No se pudo subir la foto. Use fotos de hasta 10 MB.', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setBusy(true)
    try {
      await saveProfile(coll, id, draft, withPhone)
      toast('Presentación guardada. Los clientes ya la ven.')
    } catch {
      toast('No se pudo guardar. Revise la web (debe empezar por https://) e inténtelo de nuevo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card a-form profile-editor">
      <p className="card__text">{audience}</p>

      <div className="a-field">
        <span className="a-field__label">Fotos ({photos.length} de {MAX_PROFILE_PHOTOS})</span>
        <span className="a-field__hint">La primera es la portada. Fotos del local, platos, instalaciones o del equipo.</span>
        {photos.length > 0 && (
          <div className="profile-editor__photos">
            {photos.map((a, i) => (
              <figure key={a.path} className="profile-editor__photo">
                <img src={a.url} alt={a.name} />
                {i === 0 && <span className="profile-editor__cover">Portada</span>}
                <figcaption>
                  {i > 0 && (
                    <button type="button" className="a-link" onClick={() => set({ photos: [a, ...photos.filter((x) => x.path !== a.path)] })}>
                      Portada
                    </button>
                  )}
                  <button type="button" className="a-link" onClick={() => set({ photos: photos.filter((x) => x.path !== a.path) })}>
                    Quitar
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {photos.length < MAX_PROFILE_PHOTOS && (
          <label className="btn btn--ghost a-btn profile-editor__add">
            {uploading ? 'Subiendo…' : 'Añadir fotos'}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => {
                addPhotos([...(e.target.files ?? [])])
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>

      <div className="a-bilingual">
        <Field label="Presentación · Español" hint="Quiénes son, qué ofrecen y qué les hace especiales.">
          <Textarea rows={6} maxLength={4000} value={draft.about_es ?? ''} onChange={(e) => set({ about_es: e.target.value })} />
        </Field>
        <Field label="Presentación · Inglés" hint="Opcional, pero muchos clientes leen en inglés.">
          <Textarea rows={6} maxLength={4000} value={draft.about_en ?? ''} onChange={(e) => set({ about_en: e.target.value })} />
        </Field>
      </div>
      <div className="a-bilingual">
        <Field label="Horario · Español" hint="Por ejemplo: martes a domingo, 13:00–16:00 y 20:00–23:30">
          <Textarea rows={3} maxLength={600} value={draft.hours_es ?? ''} onChange={(e) => set({ hours_es: e.target.value })} />
        </Field>
        <Field label="Horario · Inglés">
          <Textarea rows={3} maxLength={600} value={draft.hours_en ?? ''} onChange={(e) => set({ hours_en: e.target.value })} />
        </Field>
      </div>
      <div className="a-grid-2">
        {withPhone && (
          <Field label="Teléfono">
            <Input inputMode="tel" maxLength={40} value={draft.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
        )}
        <Field label="Correo electrónico">
          <Input type="email" maxLength={120} value={draft.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Página web">
          <Input inputMode="url" maxLength={300} placeholder="https://" value={draft.website ?? ''} onChange={(e) => set({ website: e.target.value })} />
        </Field>
        <Field label="Instagram">
          <Input maxLength={100} placeholder="@usuario" value={draft.instagram ?? ''} onChange={(e) => set({ instagram: e.target.value })} />
        </Field>
      </div>
      <Field label="Dirección">
        <Input maxLength={300} value={draft.address ?? ''} onChange={(e) => set({ address: e.target.value })} />
      </Field>

      <div className="profile-editor__actions">
        <button type="button" className="btn a-btn" disabled={busy || uploading || !dirty} onClick={save}>
          {busy ? 'Guardando…' : 'Guardar presentación'}
        </button>
        {dirty && <span className="a-field__hint">Hay cambios sin guardar.</span>}
      </div>
    </div>
  )
}
