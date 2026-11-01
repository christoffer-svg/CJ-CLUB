import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { PageTitle } from '../../components/admin/AdminLayout'
import { Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { db } from '../../lib/firebase'
import { deletePost, setPostHidden, useSocialPosts } from '../../lib/social'
import type { SocialReport } from '../../lib/types'
import { shortDate } from '../../lib/when'

/** Moderación de Social: CJ ve todas las publicaciones y los avisos de los clientes, y puede ocultar o borrar */
export default function AdminSocial() {
  const posts = useSocialPosts(true)
  const toast = useToast()
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
          {p.kind === 'plan' ? 'Plan' : 'Recomendación'} · {p.familyName} · {shortDate(p.createdAt, 'es-ES')}
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
      <PageTitle eyebrow="Panel" title="Social" />
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
    </>
  )
}
