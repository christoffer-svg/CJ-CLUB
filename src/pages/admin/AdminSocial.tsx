import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { PageTitle } from '../../components/admin/AdminLayout'
import { Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { db } from '../../lib/firebase'
import { useAuth } from '../../auth/AuthProvider'
import Dialog from '../../components/admin/Dialog'
import { Field, Input, Textarea } from '../../components/admin/Fields'
import { deletePost, isCjPost, newPostId, saveCjPost, setPostHidden, uploadSocialPhotos, useSocialPosts } from '../../lib/social'
import type { Attachment, SocialReport } from '../../lib/types'

type CjForm = { id: string; exists: boolean; title: string; place: string; text: string; photos: Attachment[] }
import { shortDate } from '../../lib/when'

/** Moderación de Social: CJ ve todas las publicaciones y los avisos de los clientes, y puede ocultar o borrar */
export default function AdminSocial() {
  const posts = useSocialPosts(true)
  const toast = useToast()
  const { user } = useAuth()
  const [form, setForm] = useState<CjForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function addPhotos(files: File[]) {
    if (!form || !files.length) return
    setUploading(true)
    try {
      const added = await uploadSocialPhotos(form.id, files.filter((f) => f.type.startsWith('image/')).slice(0, 4 - form.photos.length))
      setForm((f) => f && { ...f, photos: [...f.photos, ...added] })
    } catch {
      toast('No se pudo subir la foto.', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function saveForm() {
    if (!form || !user || !form.title.trim()) return
    setBusy(true)
    try {
      await saveCjPost(form.id, user.uid, form, form.exists)
      toast(form.exists ? 'Recomendación guardada.' : 'Recomendación publicada. Los clientes ya la ven en Social.')
      setForm(null)
    } catch {
      toast('No se pudo guardar.', 'error')
    } finally {
      setBusy(false)
    }
  }
  const [reports, setReports] = useState<(SocialReport & { id: string })[]>([])
  useEffect(
    () =>
      onSnapshot(
        collection(db, 'socialReports'),
        (s) => setReports(s.docs.map((d) => ({ ...(d.data() as SocialReport), id: d.id }))),
        () => setReports([]),
      ),
    [],
  )
  const reportsOf = (id: string) => reports.filter((r) => r.postId === id)
  const flagged = posts.data.filter((p) => reportsOf(p.id).length > 0)
  const rest = posts.data.filter((p) => reportsOf(p.id).length === 0)

  const row = (p: (typeof posts.data)[number]) => (
    <div key={p.id} className={p.hidden ? 'a-row a-row--off' : 'a-row'}>
      <div className="a-row__body">
        <span className="card__title">{p.title}</span>
        <span className="card__text">
          {isCjPost(p) ? 'Recomendación de CJ' : p.kind === 'plan' ? 'Plan' : 'Recomendación'} · {p.familyName} · {shortDate(p.createdAt, 'es-ES')}
          {p.place ? ` · ${p.place}` : ''}
        </span>
        {p.text && <span className="card__text">{p.text.slice(0, 200)}</span>}
        {reportsOf(p.id).map((r) => (
          <span key={r.id} className="a-error">
            Aviso de {r.familyName}: {r.reason || 'sin motivo'}{' '}
            <button className="a-link" onClick={() => deleteDoc(doc(db, 'socialReports', r.id)).catch(() => toast('No se pudo borrar.', 'error'))}>
              Descartar aviso
            </button>
          </span>
        ))}
      </div>
      <Toggle
        checked={!p.hidden}
        label={p.hidden ? 'Oculta' : 'Visible'}
        onChange={(v) => setPostHidden(p.id, !v).then(() => toast(v ? 'Publicación visible.' : 'Publicación oculta para los clientes.')).catch(() => toast('No se pudo guardar.', 'error'))}
      />
      {isCjPost(p) && (
        <button className="a-link" onClick={() => setForm({ id: p.id, exists: true, title: p.title, place: p.place, text: p.text, photos: p.photos })}>
          Editar
        </button>
      )}
      <button
        className="a-link"
        onClick={() => window.confirm(`¿Borrar «${p.title}»? No se puede deshacer.`) && deletePost(p.id).then(() => toast('Publicación borrada.')).catch(() => toast('No se pudo borrar.', 'error'))}
      >
        Borrar
      </button>
    </div>
  )

  return (
    <>
      <PageTitle eyebrow="Panel" title="Social">
        <button className="btn a-btn" onClick={() => setForm({ id: newPostId(), exists: false, title: '', place: '', text: '', photos: [] })}>
          Nueva recomendación de CJ
        </button>
      </PageTitle>
      <p className="card__text">
        Planes y recomendaciones que publican los clientes. Se ven al momento, con el nombre de su familia. Aquí puede ocultar o borrar lo que no proceda. Los chats entre familias son privados: CJ no los ve.
      </p>
      {flagged.length > 0 && (
        <>
          <h2 className="a-subtitle">Con avisos de clientes</h2>
          <div className="card a-list">{flagged.map(row)}</div>
        </>
      )}
      <h2 className="a-subtitle">Publicaciones</h2>
      <div className="card a-list">
        {rest.map(row)}
        {!posts.loading && posts.data.length === 0 && <p className="a-empty">Aún no hay publicaciones.</p>}
      </div>

      {form && (
        <Dialog title={form.exists ? 'Editar recomendación de CJ' : 'Nueva recomendación de CJ'} busy={busy || uploading} onClose={() => setForm(null)} onSubmit={saveForm} submitLabel={form.exists ? 'Guardar' : 'Publicar'}>
          <p className="card__text">Se publica en Social como «CJ Club», con su logo y destacada. La ven todos los clientes.</p>
          <Field label="Título">
            <Input required maxLength={120} placeholder="Por ejemplo: el mejor arroz a banda de Dénia" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Sitio (opcional)">
            <Input maxLength={120} value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
          </Field>
          <Field label="Texto">
            <Textarea rows={5} maxLength={2000} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          </Field>
          <div className="a-field">
            <span className="a-field__label">Fotos ({form.photos.length} de 4)</span>
            {form.photos.length > 0 && (
              <div className="profile-editor__photos">
                {form.photos.map((a) => (
                  <figure key={a.path} className="profile-editor__photo">
                    <img src={a.url} alt={a.name} />
                    <figcaption>
                      <button type="button" className="a-link" onClick={() => setForm({ ...form, photos: form.photos.filter((x) => x.path !== a.path) })}>
                        Quitar
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            {form.photos.length < 4 && (
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
        </Dialog>
      )}
    </>
  )
}
