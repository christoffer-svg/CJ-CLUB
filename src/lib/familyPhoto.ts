/** Foto de perfil de la casa o la familia, y las fotos de las demás casas para Social */
import { collection, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useEffect, useState } from 'react'
import { MAX_BYTES, prepare, toBase64 } from './attachments'
import { db, functions } from './firebase'
import type { Attachment, SocialProfile } from './types'

type Req = { remove?: boolean; name?: string; contentType?: string; data?: string }

/** Pone (o quita, con null) la foto de perfil de la casa que se está viendo */
export async function setFamilyPhoto(file: File | null) {
  const call = httpsCallable<Req, { photo: Attachment | null }>(functions, 'setClientPhoto', { timeout: 120_000 })
  if (!file) return (await call({ remove: true })).data.photo
  const { blob, name, type } = await prepare(file)
  if (blob.size > MAX_BYTES) throw new Error('too-big')
  return (await call({ name, contentType: type, data: await toBase64(blob) })).data.photo
}

/** Foto de cada casa en Social: { clientId: url } */
export function useSocialProfiles(enabled = true) {
  const [map, setMap] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!enabled) return
    return onSnapshot(
      collection(db, 'socialProfiles'),
      (snap) => setMap(Object.fromEntries(snap.docs.filter((d) => (d.data() as SocialProfile).photo).map((d) => [d.id, (d.data() as SocialProfile).photo!.url]))),
      () => setMap({}),
    )
  }, [enabled])
  return map
}
