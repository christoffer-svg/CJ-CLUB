/** Lectura de importes escritos a mano (Mi reforma: pagos y extras). Uso: npm run test:unit */
import { parseAmount } from '../src/lib/amount'

const cases: [string, number][] = [
  ['3.000', 3000],
  ['3,000', 3000],
  ['3000', 3000],
  ['3.000,50', 3000.5],
  ['3,000.50', 3000.5],
  ['1250,5', 1250.5],
  ['1250.5', 1250.5],
  ['12.500.000', 12500000],
  ['420', 420],
  ['0,99', 0.99],
  ['3.000 €', 3000],
  ['1.2.3', NaN],
  ['abc', NaN],
  ['', NaN],
  ['12,34,56', NaN],
]
let bad = 0
for (const [input, want] of cases) {
  const got = parseAmount(input)
  const good = Number.isNaN(want) ? Number.isNaN(got) : got === want
  if (!good) {
    bad++
    console.log(`FAIL ${JSON.stringify(input)} → ${got} (esperado ${want})`)
  }
}
console.log(bad ? `Importes: ${bad} FAIL` : `Importes: OK (${cases.length})`)
if (bad) process.exit(1)
