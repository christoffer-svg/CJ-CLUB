import { useEffect, useRef, useState } from 'react'

/** Recuadro para firmar con el dedo o el ratón. Devuelve la firma como PNG (o null si está vacío). */
export default function SignaturePad({ label, clearLabel, onChange }: { label: string; clearLabel: string; onChange: (png: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    // Tamaño fijo en píxeles: la firma pesa poco y se ve igual en todas las pantallas
    c.width = 600
    c.height = 220
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1a1512'
  }, [])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget
    const r = c.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const { x, y } = point(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 0.1, y + 0.1)
    ctx.stroke()
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    const { x, y } = point(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    drawing.current = false
    setEmpty(false)
    onChange(e.currentTarget.toDataURL('image/png'))
  }

  function clear() {
    const c = canvas.current
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
    setEmpty(true)
    onChange(null)
  }

  return (
    <div className="sig-pad">
      <span className="eyebrow">{label}</span>
      <canvas
        ref={canvas}
        className="sig-pad__canvas"
        aria-label={label}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      {!empty && (
        <button type="button" className="link-btn link-btn--dark" onClick={clear}>
          {clearLabel}
        </button>
      )}
    </div>
  )
}
