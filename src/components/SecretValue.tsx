import { useState } from 'react'

/** Copia en el mismo clic. El portapapeles moderno a veces no está permitido en el navegador. */
function copyText(value: string) {
  const el = document.createElement('textarea')
  el.value = value
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.top = '0'
  el.style.left = '0'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  el.setSelectionRange(0, value.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(el)
  return ok
}

/** Contraseña o código oculto, con botones para mostrarlo y copiarlo. */
export default function SecretValue({
  value,
  show,
  hide,
  copy,
  copied,
}: {
  value: string
  show: string
  hide: string
  copy: string
  copied: string
}) {
  const [visible, setVisible] = useState(false)
  const [justCopied, setJustCopied] = useState(false)
  if (!value) return null

  function onCopy() {
    const copiedOk = copyText(value)
    if (copiedOk) {
      setJustCopied(true)
      window.setTimeout(() => setJustCopied(false), 2000)
      return
    }
    navigator.clipboard?.writeText(value).then(
      () => {
        setJustCopied(true)
        window.setTimeout(() => setJustCopied(false), 2000)
      },
      () => setVisible(true),
    )
  }

  return (
    <div className="secret">
      <span className={visible ? 'secret__value' : 'secret__value secret__value--mask'}>{visible ? value : '••••••••'}</span>
      <button type="button" className="link-btn secret__btn" aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
        {visible ? hide : show}
      </button>
      <button type="button" className="link-btn secret__btn" onClick={onCopy}>
        {justCopied ? copied : copy}
      </button>
    </div>
  )
}
