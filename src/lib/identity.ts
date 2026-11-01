/** Documento de identidad (DNI, NIE o pasaporte) de quien firma el presupuesto de Mi reforma */
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useEffect, useState } from 'react'
import { MAX_BYTES, prepare, toBase64 } from './attachments'
import { db, functions } from './firebase'
import type { IdDocType, Identity } from './types'

/** El documento de una de las partes. Solo lo pueden leer CJ y la propia persona (con role = null no se lee). */
export function useIdentity(projectId: string, role: 'client' | 'builder' | null) {
  const [state, setState] = useState<{ loading: boolean; data: Identity | null }>({ loading: Boolean(role), data: null })
  useEffect(() => {
    if (!role) return
    return onSnapshot(
      doc(db, 'projects', projectId, 'identities', role),
      (snap) => setState({ loading: false, data: snap.exists() ? (snap.data() as Identity) : null }),
      () => setState({ loading: false, data: null }),
    )
  }, [projectId, role])
  return role ? state : { loading: false, data: null }
}

type Req = { projectId: string; docType: IdDocType; part: 1 | 2; name: string; contentType: string; data: string }

/** Sube el documento (una o dos fotos: delante y detrás) y sustituye el anterior */
export async function uploadIdentity(projectId: string, docType: IdDocType, files: File[]) {
  const call = httpsCallable<Req, { ok: boolean }>(functions, 'uploadIdentity', { timeout: 120_000 })
  for (const [i, file] of files.slice(0, 2).entries()) {
    const { blob, name, type } = await prepare(file)
    if (blob.size > MAX_BYTES) throw new Error('too-big')
    await call({ projectId, docType, part: (i + 1) as 1 | 2, name, contentType: type, data: await toBase64(blob) })
  }
}
