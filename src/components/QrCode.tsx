import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

/** Código QR real generado en el propio móvil */
export default function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
      .then(setSvg)
      .catch(() => setSvg(''))
  }, [value])
  return (
    <div
      className="qr"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Código QR: ${value}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
