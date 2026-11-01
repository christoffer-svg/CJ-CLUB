/**
 * Importe escrito a mano → número. Entiende la forma española y la inglesa:
 * "3.000" y "3,000" → 3000 · "3.000,50" y "3,000.50" → 3000.5 · "1250,5" y "1250.5" → 1250.5
 */
export const parseAmount = (s: string) => {
  const clean = s.trim().replace(/[\s€]/g, '')
  if (!/^\d[\d.,]*$/.test(clean)) return NaN
  const lastDot = clean.lastIndexOf('.')
  const lastComma = clean.lastIndexOf(',')
  let normalized: string
  if (lastDot >= 0 && lastComma >= 0) {
    // Con los dos signos, el último es el decimal
    normalized = lastComma > lastDot ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(/,/g, '')
  } else {
    const sep = lastComma >= 0 ? ',' : lastDot >= 0 ? '.' : ''
    if (!sep) normalized = clean
    else if (new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`).test(clean)) normalized = clean.split(sep).join('') // separador de miles
    else if (clean.split(sep).length === 2) normalized = clean.replace(sep, '.') // separador decimal
    else return NaN
  }
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}
