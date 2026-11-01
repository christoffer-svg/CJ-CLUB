import { createContext, useContext } from 'react'
import { useI18n } from '../i18n'
import type { ProjectRole, Trade } from '../lib/types'

/** Oficio del contrato que se está viendo: en los textos sale «Electricista» en lugar de «Constructor» */
export const TradeContext = createContext<Trade | undefined>(undefined)

/** Nombre de un papel en la obra: cliente, CJ o el oficio del profesional */
export function useRoleName() {
  const { t } = useI18n()
  const trade = useContext(TradeContext)
  return (r: ProjectRole) => (r === 'builder' ? t(`trade.${trade ?? 'construction'}`) : t(`project.role.${r}`))
}
