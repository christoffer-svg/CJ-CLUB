import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import ProjectView from '../../components/ProjectView'
import { useI18n } from '../../i18n'
import { useProjects } from '../../lib/projects'

/** Arquitecto o diseñador: los contratos de las reformas en las que participa */
export default function DesignerProjects() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const { t } = useI18n()
  const shared = useProjects({ designerUid: user?.uid })
  // Contratos en los que cobra su parte (presupuesto, firmas, pagos y extras propios)
  const own = useProjects({ builderUid: user?.uid })
  const projects = { loading: shared.loading || own.loading, data: [...own.data, ...shared.data.filter((p) => !own.data.some((o) => o.id === p.id))] }
  const mine = (pid: string) => own.data.some((p) => p.id === pid)
  const author = { uid: user?.uid ?? '', name: profile?.name ?? '', role: (id && mine(id) ? 'builder' : 'designer') as 'builder' | 'designer' }
  // Contratos de la misma reforma, juntos
  const groups = [...projects.data.reduce((m, p) => m.set(`${p.familyName} · ${p.title}`, [...(m.get(`${p.familyName} · ${p.title}`) ?? []), p]), new Map<string, typeof projects.data>())]

  if (id)
    return (
      <>
        <Link to="/estudio" className="header__back builder-back">
          ‹ {t('common.back')}
        </Link>
        <ProjectView key={`${id}-${author.role}`} projectId={id} author={author} />
      </>
    )

  return (
    <>
      <h1 className="a-title__h">{t('project.list.title')}</h1>
      {!projects.loading && projects.data.length === 0 && <p className="empty">{t('designer.empty')}</p>}
      {groups.map(([title, list]) => (
        <section key={title} className="pv-group">
          <div className="pv-group__head">
            <span className="card__title">{title}</span>
            <span className="eyebrow">{list[0].property}</span>
          </div>
          {list.map((p) => (
            <Link key={p.id} to={`/estudio/${p.id}`} className="card team__row pv-item">
              <span className="card__body">
                <span className="card__title">{t(`trade.${p.trade ?? 'construction'}`)}</span>
                <span className="card__text">{mine(p.id) ? t('designer.yourContract') : p.builderName}</span>
              </span>
              <span className={`status status--${p.status === 'finished' ? 'done' : p.status === 'in_progress' ? 'in_progress' : 'new'}`}>
                {t(`project.status.${p.status}`)}
              </span>
            </Link>
          ))}
        </section>
      ))}
    </>
  )
}
