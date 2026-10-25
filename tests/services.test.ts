/**
 * Servicios de un colaborador: lectura del campo antiguo, varios servicios y textos.
 * Uso: npm run test:unit
 */
import assert from 'node:assert/strict'
import {
  builtinCategoryList,
  categoryInUse,
  categorySlug,
  clientServiceLabel,
  editableTranslation,
  legacyCategory,
  mergeCategories,
  partnerOffers,
  partnerServiceIds,
  servicesToSave,
} from '../src/lib/services.ts'

const builtins = mergeCategories([])
assert.equal(builtins.length, builtinCategoryList.length)
assert.deepEqual(
  builtins.map((cat) => cat.id),
  ['lawyer', 'gestoria', 'pool', 'maintenance', 'garden', 'communityAdmin'],
)
assert.equal(clientServiceLabel('lawyer', 'es', builtins), 'Su abogado')
assert.equal(clientServiceLabel('lawyer', 'en', builtins), 'Your lawyer')
assert.equal(clientServiceLabel('pool', 'de', builtins), 'Ihr Poolservice')
assert.equal(editableTranslation(builtins[0], 'en'), '')

// Ficha antigua: un solo campo category
assert.deepEqual(partnerServiceIds({ category: 'pool' }), ['pool'])
assert.deepEqual(partnerServiceIds({ category: 'pool', categories: [] }), ['pool'])
assert.equal(partnerOffers({ category: 'lawyer' }, 'lawyer'), true)
assert.equal(partnerOffers({ category: 'lawyer' }, 'pool'), false)

// Varios servicios, sin duplicados, y el campo viejo no sustituye a la lista
assert.deepEqual(partnerServiceIds({ category: 'pool', categories: ['maintenance', 'pool', 'garden', 'pool'] }), [
  'maintenance',
  'pool',
  'garden',
])
assert.equal(partnerOffers({ category: 'pool', categories: ['maintenance', 'garden'] }, 'garden'), true)
assert.equal(partnerOffers({ category: 'pool', categories: ['maintenance', 'garden'] }, 'pool'), false)
assert.deepEqual(partnerServiceIds({ category: 'pool', categories: ['garden', '', 3] }), ['garden'])

// Al guardar se conservan los dos campos. Si el servicio de antes sigue marcado, no cambia.
const kept = servicesToSave('pool', ['garden', 'pool', 'maintenance'], builtins.map((cat) => cat.id))
assert.deepEqual(kept.categories, ['pool', 'maintenance', 'garden'])
assert.equal(kept.category, 'pool')
const moved = servicesToSave('pool', ['garden', 'maintenance'], builtins.map((cat) => cat.id))
assert.equal(moved.category, 'maintenance')
assert.equal(legacyCategory('pool', ['pool'], ['pool']), 'pool')

// Renombrar en español: los otros idiomas, si no se han escrito, ven el español.
const renamed = mergeCategories([{ id: 'lawyer', name_es: 'Letrado', order: 1, active: true }])
const lawyer = renamed.find((cat) => cat.id === 'lawyer')!
assert.equal(lawyer.name_es, 'Letrado')
assert.equal(lawyer.name_en, 'Lawyer')
assert.equal(clientServiceLabel('lawyer', 'es', renamed), 'Letrado')
assert.equal(clientServiceLabel('lawyer', 'en', renamed), 'Letrado')
assert.equal(clientServiceLabel('lawyer', 'fr', renamed), 'Letrado')

// Traducción propia en un idioma, el resto sigue con el texto de siempre.
const translated = mergeCategories([{ id: 'lawyer', name_es: 'Abogado', name_en: 'Solicitor', order: 1, active: true }])
assert.equal(clientServiceLabel('lawyer', 'en', translated), 'Solicitor')
assert.equal(clientServiceLabel('lawyer', 'es', translated), 'Su abogado')
assert.equal(clientServiceLabel('lawyer', 'nl', translated), 'Uw advocaat')
assert.equal(editableTranslation(translated.find((cat) => cat.id === 'lawyer')!, 'en'), 'Solicitor')
assert.equal(editableTranslation(translated.find((cat) => cat.id === 'lawyer')!, 'nl'), '')

// Servicio nuevo: español de reserva para los idiomas vacíos.
const custom = mergeCategories([{ id: 'limpieza', name_es: 'Limpieza', name_en: 'Cleaning', order: 50, active: true }])
assert.equal(clientServiceLabel('limpieza', 'en', custom), 'Cleaning')
assert.equal(clientServiceLabel('limpieza', 'nl', custom), 'Cleaning')
assert.equal(clientServiceLabel('limpieza', 'es', custom), 'Limpieza')
const onlySpanish = mergeCategories([{ id: 'cerrajeria', name_es: 'Cerrajería', order: 51, active: true }])
assert.equal(clientServiceLabel('cerrajeria', 'en', onlySpanish), 'Cerrajería')
assert.equal(clientServiceLabel('cerrajeria', 'sv', onlySpanish), 'Cerrajería')
assert.equal(custom.find((cat) => cat.id === 'limpieza')!.builtin, false)

// Ocultar no cambia el texto de siempre.
const hidden = mergeCategories([{ id: 'garden', active: false, order: 5 }])
const garden = hidden.find((cat) => cat.id === 'garden')!
assert.equal(garden.active, false)
assert.equal(garden.name_es, 'Jardinería')
assert.equal(clientServiceLabel('garden', 'es', hidden), 'Su jardinero')

assert.equal(categorySlug('Limpieza de piscinas', new Set()), 'limpieza-de-piscinas')
assert.equal(categorySlug('Administración', new Set()), 'administracion')
assert.equal(categorySlug('Piscina', new Set(['piscina'])), 'piscina-2')
assert.equal(categorySlug('!!!', new Set()), 'servicio')

assert.equal(categoryInUse('pool', [{ category: 'pool' }], []), true)
assert.equal(categoryInUse('pool', [{ categories: ['garden', 'pool'] }], []), true)
assert.equal(categoryInUse('pool', [{ category: 'garden' }], [{ contacts: { pool: 'pool-azul' } }]), true)
assert.equal(categoryInUse('pool', [{ category: 'garden' }], [{ contacts: {} }]), false)
assert.equal(categoryInUse('limpieza', [{ category: 'lawyer' }], [{ contacts: { lawyer: 'lawyer-ruiz' } }]), false)

console.log('Servicios: OK')
