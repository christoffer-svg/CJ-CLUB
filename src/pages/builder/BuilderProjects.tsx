import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import ProjectView from '../../components/ProjectView'
import { useI18n } from '../../i18n'
import { useProjects } from '../../lib/projects'

export default function BuilderProjects() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const { t } = useI18n()
  const projects = useProjects({ builderUid: user?.uid })
  const author = { uid: user?.uid ?? '', name: profile?.name ?? '', role: 'builder' as const }

  if (id)
    return (
      <>
        <Link to="/obra" className="header__back builder-back">
          ‹ {t('common.back')}
        </Link>
        <ProjectView projectId={id} author={author} />
      </>
    )

  return (
    <>
      <h1 className="a-title__h">{t('project.list.title')}</h1>
      {!projects.loading && projects.data.length === 0 && <p className="empty">{t('builder.empty')}</p>}
      <div className="pv-list">
        {projects.data.map((p) => (
          <Link key={p.id} to={`/obra/${p.id}`} className="card team__row pv-item">
            <span className="card__body">
              <span className="card__title">{p.title}</span>
              <span className="card__text">
                {t(`trade.${p.trade ?? 'construction'}`)} · {p.familyName} · {p.property}
              </span>
            </span>
            <span className={`status status--${p.status === 'finished' ? 'done' : p.status === 'in_progress' ? 'in_progress' : 'new'}`}>
              {t(`project.status.${p.status}`)}
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
