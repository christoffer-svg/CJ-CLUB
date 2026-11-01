import { useState } from 'react'
import { useI18n } from '../i18n'
import { checkFiles, MAX_FILES, type FileProblem } from '../lib/attachments'
import type { Attachment } from '../lib/types'

function Thumb({ a, onOpen }: { a: Attachment; onOpen: (url: string) => void }) {
  const { t } = useI18n()
  const [broken, setBroken] = useState(false)
  if (a.contentType === 'application/pdf' || broken)
    return (
      <a className="att att--pdf" href={a.url} target="_blank" rel="noreferrer">
        <span className="att__pdf">{a.contentType === 'application/pdf' ? 'PDF' : t('project.files.photo')}</span>
        <span className="att__name">{a.name}</span>
        <span className="att__open">{t('project.files.open')}</span>
      </a>
    )
  return (
    <button type="button" className="att att--img" onClick={() => onOpen(a.url)} aria-label={`${t('project.files.open')}: ${a.name}`}>
      <img src={a.url} alt={a.name} loading="lazy" onError={() => setBroken(true)} />
    </button>
  )
}

/** Fotos y PDF de un avance o pago. Las fotos se amplían al tocarlas. */
export function AttachmentList({ items }: { items?: Attachment[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const { t } = useI18n()
  if (!items?.length) return null
  return (
    <>
      <div className="att-list">
        {items.map((a) => (
          <Thumb key={a.path} a={a} onOpen={setOpen} />
        ))}
      </div>
      {open && (
        <div className="sheet-backdrop att-zoom" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <img src={open} alt="" />
          <button type="button" className="btn att-zoom__close" onClick={() => setOpen(null)}>
            {t('benefits.close')}
          </button>
        </div>
      )}
    </>
  )
}

/** Elegir fotos (también con la cámara del móvil) o PDF para adjuntar */
export function FilePicker({ files, onChange, label }: { files: File[]; onChange: (f: File[]) => void; label: string }) {
  const { t } = useI18n()
  const [problem, setProblem] = useState<FileProblem | null>(null)
  return (
    <div className="request-form__field">
      <span className="eyebrow">{label}</span>
      <label className="btn btn--ghost att-pick">
        {t('project.files.add')}
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            const next = [...files, ...Array.from(e.target.files ?? [])]
            e.target.value = ''
            const p = checkFiles(next)
            setProblem(p)
            if (!p) onChange(next)
          }}
        />
      </label>
      <span className="card__text">{t('project.files.hint', { n: MAX_FILES })}</span>
      {problem && (
        <span className="composer__error">
          {problem.kind === 'type'
            ? t('project.files.type', { name: problem.name })
            : problem.kind === 'size'
              ? t('project.files.size', { name: problem.name })
              : t('project.files.count', { n: MAX_FILES })}
        </span>
      )}
      {files.length > 0 && (
        <ul className="att-chosen">
          {files.map((f, i) => (
            <li key={i}>
              <span>{f.name}</span>
              <button type="button" className="link-btn link-btn--dark" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                {t('project.files.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
