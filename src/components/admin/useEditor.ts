import { useState } from 'react'
import { useToast } from './Toast'
import { addToCollection, saveDoc } from '../../lib/admin'

/** Estado de la ventana de añadir/editar de una colección */
export function useEditor<T extends object>(collectionName: string, empty: T) {
  const toast = useToast()
  const [editing, setEditing] = useState<{ id: string | null; draft: T } | null>(null)
  const [busy, setBusy] = useState(false)

  return {
    editing,
    busy,
    openNew: () => setEditing({ id: null, draft: { ...empty } }),
    openEdit: (id: string, item: T) => setEditing({ id, draft: { ...empty, ...item } }),
    close: () => setEditing(null),
    set: <K extends keyof T>(key: K, value: T[K]) =>
      setEditing((e) => (e ? { ...e, draft: { ...e.draft, [key]: value } } : e)),
    async save(clean: (draft: T) => object, message: string) {
      if (!editing) return
      setBusy(true)
      try {
        // el id va en la ruta del documento, no dentro de él
        const { id: _id, ...data } = clean(editing.draft) as Record<string, unknown>
        if (editing.id) await saveDoc(`${collectionName}/${editing.id}`, data)
        else await addToCollection(collectionName, data)
        toast(message)
        setEditing(null)
      } catch {
        toast('No se pudo guardar. Inténtelo de nuevo.', 'error')
      } finally {
        setBusy(false)
      }
    },
  }
}
