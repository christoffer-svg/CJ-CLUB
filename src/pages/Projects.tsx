import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Header from '../components/Header'
import ProjectView from '../components/ProjectView'
import { useI18n } from '../i18n'
import { useProjects } from '../lib/projects'
import { useViewer } from '../lib/viewer'

/** Mi reforma (cliente): las obras de la casa que está viendo. Con una sola obra, se abre directamente. */
export default function Projects() {
  const { id } = useParams()
  const { clientId, base, preview } = useViewer()
  const { user, profile } = useAuth()
  const { t } = useI18n()
  const projects = useProjects({ clientId })
  const single = !id && projects.data.length === 1 ? projects.data[0].id : null
  const openId = id ?? single
  // Contratos de la misma reforma (mismo título), juntos
  const groups = [...projects.data.reduce((m, p) => m.set(p.title, [...(m.get(p.title) ?? []), p]), new Map<string, typeof projects.data>())]
  const author = { uid: user?.uid ?? '', name: profile?.name ?? '', role: 'client' as const }

  return (
    <>
      <Header
        back={id && !single ? `${base}/reformas` : `${base}/`}
        eyebrow={t('project.eyebrow')}
        title={t('project.list.title')}
        subtitle={t('project.list.subtitle')}
      />
      <main className="page">
        {openId ? (
          <ProjectView projectId={openId} author={author} readOnly={preview} />
        ) : (
          <>
            {!projects.loading && projects.data.length === 0 && <p className="empty">{t('project.list.empty')}</p>}
            {groups.map(([title, list]) => (
              <section key={title} className="pv-group">
                {list.length > 1 && (
                  <div className="pv-group__head">
                    <span className="card__title">{title}</span>
                    <span className="eyebrow">{t('project.list.contracts', { n: list.length })}</span>
                  </div>
                )}
                {list.map((p) => (
                  <Link key={p.id} to={`${base}/reformas/${p.id}`} className="card team__row pv-item">
                    <span className="card__body">
                      <span className="card__title">{list.length > 1 ? t(`trade.${p.trade ?? 'construction'}`) : p.title}</span>
                      <span className="card__text">
                        {list.length > 1 ? p.builderName : `${t(`trade.${p.trade ?? 'construction'}`)}: ${p.builderName}`}
                      </span>
                    </span>
                    <span className={`status status--${p.status === 'finished' ? 'done' : p.status === 'in_progress' ? 'in_progress' : 'new'}`}>
                      {t(`project.status.${p.status}`)}
                    </span>
                  </Link>
                ))}
              </section>
            ))}
          </>
        )}
      </main>
    </>
  )
}
