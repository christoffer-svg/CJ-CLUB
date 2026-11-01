import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Field, Input, Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import ProjectView from '../../components/ProjectView'
import { patchDoc, useLiveCollection } from '../../lib/admin'
import { db } from '../../lib/firebase'
import { formatMoney, useProject } from '../../lib/projects'
import type { Client, Project, UserProfile } from '../../lib/types'

const statusLabel: Record<Project['status'], string> = { planned: 'Prevista', in_progress: 'En obras', finished: 'Terminada' }

type Draft = { clientId: string; builderUid: string; title: string; budget: string; status: Project['status']; startDate: string; endDate: string }

/** Formulario de obra (nueva o editar) */
function ProjectForm({ initial, onClose, onSaved }: { initial: Draft; onClose: () => void; onSaved: (id: string) => void }) {
  const clients = useLiveCollection<Client>('clients')
  const users = useLiveCollection<UserProfile>('users')
  const toast = useToast()
  const { id } = useParams()
  const [d, setD] = useState(initial)
  const [busy, setBusy] = useState(false)
  const builders = users.data.filter((u) => u.role === 'builder')
  const budget = Number(d.budget.replace(/\./g, '').replace(',', '.'))
  const valid = d.clientId && d.builderUid && d.title.trim() && Number.isFinite(budget) && budget >= 0

  async function save() {
    if (!valid) return
    const house = clients.data.find((c) => c.id === d.clientId)
    const builder = builders.find((b) => b.id === d.builderUid)
    if (!house || !builder) return
    setBusy(true)
    const data = {
      clientId: d.clientId,
      familyName: house.familyName,
      property: house.property,
      title: d.title.trim(),
      builderUid: d.builderUid,
      builderName: builder.companyName || builder.name,
      status: d.status,
      budget: Math.round(budget * 100) / 100,
      ...(d.startDate ? { startDate: d.startDate } : {}),
      ...(d.endDate ? { endDate: d.endDate } : {}),
    }
    try {
      if (id) {
        await patchDoc(`projects/${id}`, data)
        toast(`Guardado para ${house.familyName}`)
        onSaved(id)
      } else {
        const ref = await addDoc(collection(db, 'projects'), { ...data, createdAt: serverTimestamp() })
        toast(`Obra creada para ${house.familyName}`)
        onSaved(ref.id)
      }
    } catch {
      toast('No se pudo guardar. Inténtelo de nuevo.', 'error')
      setBusy(false)
    }
  }

  return (
    <Dialog title={id ? 'Editar obra' : 'Nueva obra'} busy={busy || !valid} onClose={onClose} onSubmit={save}>
      <Field label="Casa del cliente">
        <Select required value={d.clientId} onChange={(e) => setD({ ...d, clientId: e.target.value })}>
          <option value="">Elija una casa</option>
          {[...clients.data]
            .sort((a, b) => a.familyName.localeCompare(b.familyName))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.familyName} · {c.property}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Constructor" hint={builders.length ? undefined : 'Primero añada un constructor en «Constructores».'}>
        <Select required value={d.builderUid} onChange={(e) => setD({ ...d, builderUid: e.target.value })}>
          <option value="">Elija un constructor</option>
          {builders.map((b) => (
            <option key={b.id} value={b.id}>
              {b.companyName || b.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Obra">
        <Input required placeholder="Reforma de la cocina" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
      </Field>
      <div className="a-grid-2">
        <Field label="Presupuesto inicial (€)">
          <Input required inputMode="decimal" value={d.budget} onChange={(e) => setD({ ...d, budget: e.target.value })} />
        </Field>
        <Field label="Estado">
          <Select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as Project['status'] })}>
            {(Object.keys(statusLabel) as Project['status'][]).map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Inicio">
          <Input type="date" value={d.startDate} onChange={(e) => setD({ ...d, startDate: e.target.value })} />
        </Field>
        <Field label="Fin previsto">
          <Input type="date" value={d.endDate} onChange={(e) => setD({ ...d, endDate: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  )
}

const emptyDraft: Draft = { clientId: '', builderUid: '', title: '', budget: '', status: 'planned', startDate: '', endDate: '' }

/** Panel: lista de obras */
export function AdminProjects() {
  const projects = useLiveCollection<Project>('projects')
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const list = [...projects.data].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
  return (
    <>
      <PageTitle eyebrow="Mi reforma" title="Reformas">
        <Link to="/admin/constructores" className="btn btn--ghost a-btn">
          Constructores
        </Link>
        <button className="btn a-btn" onClick={() => setCreating(true)}>
          Nueva obra
        </button>
      </PageTitle>
      <p className="card__text">
        Cada obra une una casa con un constructor. El cliente, el constructor y CJ ven lo mismo: conversación, avances, pagos y extras.
      </p>
      <div className="card a-list">
        {list.map((p) => (
          <Link key={p.id} to={`/admin/reformas/${p.id}`} className="a-row">
            <div className="a-row__body">
              <span className="card__title">{p.title}</span>
              <span className="card__text">
                {p.familyName} · {p.property} · {p.builderName}
              </span>
            </div>
            <span className="a-row__meta">
              {statusLabel[p.status]} · {formatMoney(p.budget, 'es-ES')}
            </span>
          </Link>
        ))}
        {!projects.loading && list.length === 0 && <p className="a-empty">Aún no hay obras.</p>}
      </div>
      {creating && <ProjectForm initial={emptyDraft} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/admin/reformas/${id}`)} />}
    </>
  )
}

/** Panel: una obra, con la misma vista que el cliente y el constructor */
export function AdminProject() {
  const { id = '' } = useParams()
  const { user, profile } = useAuth()
  const project = useProject(id)
  const [editing, setEditing] = useState(false)
  const p = project.data
  if (project.loading) return null
  if (!p) return <p className="a-empty">Esta obra no existe.</p>
  return (
    <>
      <PageTitle eyebrow={`Reformas · ${p.familyName}`} title={p.title}>
        <Link to={`/admin/clientes/${p.clientId}`} className="btn btn--ghost a-btn">
          Ficha del cliente
        </Link>
        <button className="btn a-btn" onClick={() => setEditing(true)}>
          Editar obra
        </button>
      </PageTitle>
      <div className="a-project">
        <ProjectView projectId={id} author={{ uid: user?.uid ?? '', name: profile?.name ? `${profile.name} · CJ` : 'Equipo CJ', role: 'cj' }} />
      </div>
      {editing && (
        <ProjectForm
          initial={{
            clientId: p.clientId,
            builderUid: p.builderUid,
            title: p.title,
            budget: String(p.budget),
            status: p.status,
            startDate: p.startDate ?? '',
            endDate: p.endDate ?? '',
          }}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
    </>
  )
}
