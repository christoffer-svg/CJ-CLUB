import type { Role, UserProfile } from './types'

/** Accesos de una persona con su correo (cliente, negocio, constructor, equipo de CJ) */
export const rolesOf = (u: Pick<UserProfile, 'role' | 'roles'>): Role[] => (u.roles?.length ? u.roles : [u.role])

/** ¿Tiene este acceso, lo esté usando ahora o no? */
export const hasRole = (u: Pick<UserProfile, 'role' | 'roles'>, role: Role) => rolesOf(u).includes(role)
