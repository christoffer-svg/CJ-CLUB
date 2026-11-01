import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useEffect, useState } from 'react'
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
import { TRADES, type Trade } from '../../lib/types'
import type { Client, Project, UserProfile } from '../../lib/types'
import { hasRole } from '../../lib/roles'
import { parseAmount } from '../../lib/amount'
import { professionLabel, tradeLabel } from '../../lib/trades'
import { syncReform } from '../../lib/reforms'

const statusLabel: Record<Project['status'], string> = { planned: 'Prevista', in_progress: 'En obras', finished: 'Terminada' }

type Draft = { clientId: string; builderUid: string; trade: Trade; designerUids: string[]; title: string; budget: string; vatRate: 10 | 21; status: Project['status']; startDate: string; endDate: string }

/** Formulario de obra (nueva o editar) */
function ProjectForm({ initial, onClose, onSaved }: { initial: Draft; onClose: () => void; onSaved: (id: string) => void }) {
  const clients = useLiveCollection<Client>('clients')
  const users = useLiveCollection<UserProfile>('users')
  const toast = useToast()
  const { id } = useParams()
  const [d, setD] = useState(initial)
  const [busy, setBusy] = useState(false)
  const builders = users.data.filter((u) => hasRole(u, 'builder'))
  const allProjects = useLiveCollection<Project>('projects')
  const reformTitles = [...new Set(allProjects.data.filter((x) => x.clientId === d.clientId).map((x) => x.title))]
  const designers = users.data.filter((u) => hasRole(u, 'designer'))
  // Al elegir una reforma que ya existe, se proponen sus arquitectos o diseñadores
  const siblingDesigners = (clientId: string, title: string) =>
    allProjects.data.find((x) => x.id !== id && x.clientId === clientId && x.title === title.trim())?.designerUids
  // Cifra global solo para contratos sin presupuesto detallado (vacío = 0)
  const budget = d.budget.trim() ? parseAmount(d.budget) : 0
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
      trade: d.trade,
      status: d.status,
      budget: Math.round(budget * 100) / 100,
      vatRate: d.vatRate,
      ...(d.startDate ? { startDate: d.startDate } : {}),
      ...(d.endDate ? { endDate: d.endDate } : {}),
    }
    try {
      // La reforma (contratos de la misma casa con el mismo título) comparte planos y arquitectos o diseñadores
      const current = id ? allProjects.data.find((x) => x.id === id) : undefined
      if (id) {
        await patchDoc(`projects/${id}`, data)
        await syncReform(id, { ...data, reformId: current?.title === data.title && current?.clientId === data.clientId ? current?.reformId : undefined }, allProjects.data, d.designerUids)
        toast(`Guardado para ${house.familyName}`)
        onSaved(id)
      } else {
        const ref = await addDoc(collection(db, 'projects'), { ...data, createdAt: serverTimestamp() })
        await syncReform(ref.id, data, allProjects.data, d.designerUids)
        toast(`Contrato creado para ${house.familyName}`)
        onSaved(ref.id)
      }
    } catch {
      toast('No se pudo guardar. Inténtelo de nuevo.', 'error')
      setBusy(false)
    }
  }

  return (
    <Dialog title={id ? 'Editar contrato' : 'Nuevo contrato'} busy={busy || !valid} onClose={onClose} onSubmit={save}>
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
      <Field label="Reforma" hint="Para añadir otro oficio a una reforma que ya existe, use el mismo nombre: sus contratos se verán juntos.">
        <Input
          required
          list="reform-titles"
          placeholder="Reforma de la cocina"
          value={d.title}
          onChange={(e) => setD({ ...d, title: e.target.value, designerUids: siblingDesigners(d.clientId, e.target.value) ?? d.designerUids })}
        />
        <datalist id="reform-titles">
          {reformTitles.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      </Field>
      <Field label="Profesional" hint={builders.length ? undefined : 'Primero añada un profesional en «Profesionales».'}>
        <Select
          required
          value={d.builderUid}
          onChange={(e) => {
            const b = builders.find((x) => x.id === e.target.value)
            setD({ ...d, builderUid: e.target.value, trade: b?.trade ?? 'construction' })
          }}
        >
          <option value="">Elija un profesional</option>
          {builders.map((b) => (
            <option key={b.id} value={b.id}>
              {b.companyName || b.name} · {tradeLabel[b.trade ?? 'construction']}
            </option>
          ))}
        </Select>
      </Field>
      {designers.length > 0 && (
        <Field label="Arquitectos y diseñadores de la reforma" hint="Ven los planos, la conversación y los avances de todos los contratos de esta reforma; no ven el dinero.">
          <div className="a-checks">
            {designers.map((u) => (
              <label key={u.id} className="a-check">
                <input
                  type="checkbox"
                  checked={d.designerUids.includes(u.id)}
                  onChange={(e) => setD({ ...d, designerUids: e.target.checked ? [...d.designerUids, u.id] : d.designerUids.filter((x) => x !== u.id) })}
                />
                {u.companyName || u.name} · {professionLabel[u.profession ?? 'architect']}
              </label>
            ))}
          </div>
        </Field>
      )}
      <Field label="Oficio en este contrato">
        <Select value={d.trade} onChange={(e) => setD({ ...d, trade: e.target.value as Trade })}>
          {TRADES.map((tr) => (
            <option key={tr} value={tr}>
              {tradeLabel[tr]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="a-grid-2">
        <Field
          label="Cifra global sin IVA (€, opcional)"
          hint={d.budget.trim() && Number.isFinite(budget) ? `= ${formatMoney(budget, 'es-ES')} + IVA` : 'Solo si no se hace el presupuesto detallado en la pestaña «Presupuesto».'}
        >
          <Input inputMode="decimal" value={d.budget} onChange={(e) => setD({ ...d, budget: e.target.value })} />
        </Field>
        <Field label="IVA" hint="10 %: reformas de vivienda que cumplen los requisitos. Si no, 21 %.">
          <Select value={String(d.vatRate)} onChange={(e) => setD({ ...d, vatRate: e.target.value === '10' ? 10 : 21 })}>
            <option value="21">21 % (general)</option>
            <option value="10">10 % (reforma de vivienda)</option>
          </Select>
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

const emptyDraft: Draft = { clientId: '', builderUid: '', trade: 'construction', designerUids: [], title: '', budget: '', vatRate: 21, status: 'planned', startDate: '', endDate: '' }

/** Panel: lista de obras */
export function AdminProjects() {
  const projects = useLiveCollection<Project>('projects')
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const list = [...projects.data].sort(
    (a, b) => a.familyName.localeCompare(b.familyName) || a.title.localeCompare(b.title) || tradeLabel[a.trade ?? 'construction'].localeCompare(tradeLabel[b.trade ?? 'construction']),
  )
  return (
    <>
      <PageTitle eyebrow="Mi reforma" title="Reformas">
        <Link to="/admin/constructores" className="btn btn--ghost a-btn">
          Profesionales
        </Link>
        <button className="btn a-btn" onClick={() => setCreating(true)}>
          Nuevo contrato
        </button>
      </PageTitle>
      <p className="card__text">
        Cada contrato une una casa con un profesional (constructor, electricista, carpintero…), con su propio presupuesto, firmas, pagos, extras y repasos. Los contratos de la misma casa con el mismo nombre de reforma se ven juntos. Cada profesional solo ve el suyo.
      </p>
      <div className="card a-list">
        {list.map((p) => (
          <Link key={p.id} to={`/admin/reformas/${p.id}`} className="a-row">
            <div className="a-row__body">
              <span className="card__title">{p.title}</span>
              <span className="card__text">
                {p.familyName} · {p.property} · {tradeLabel[p.trade ?? 'construction']}: {p.builderName}
              </span>
            </div>
            <span className="a-row__meta">
              {statusLabel[p.status]}
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
  const all = useLiveCollection<Project>('projects')
  const p = project.data
  // Contratos de antes de los planos: se les asigna su reforma al abrirlos
  const needsReform = Boolean(p && !p.reformId && !all.loading)
  useEffect(() => {
    if (needsReform && p) syncReform(id, p, all.data, p.designerUids ?? []).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsReform, id])
  if (project.loading) return null
  if (!p) return <p className="a-empty">Esta obra no existe.</p>
  return (
    <>
      <PageTitle eyebrow={`Reformas · ${p.familyName}`} title={p.title}>
        <Link to={`/admin/clientes/${p.clientId}`} className="btn btn--ghost a-btn">
          Ficha del cliente
        </Link>
        <button className="btn a-btn" onClick={() => setEditing(true)}>
          Editar contrato
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
            trade: p.trade ?? 'construction',
            designerUids: p.designerUids ?? [],
            title: p.title,
            budget: p.budget ? String(p.budget).replace('.', ',') : '',
            vatRate: p.vatRate ?? 21,
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
