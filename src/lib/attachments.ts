/**
 * Fotos y PDF de Mi reforma. Los sube el servidor (función uploadProjectFile), que comprueba
 * que la persona pertenece a la obra; la app nunca escribe ni lee el almacén directamente.
 */
import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import type { Attachment } from './types'

export const MAX_FILES = 6
export const MAX_BYTES = 10 * 1024 * 1024

export type FileProblem = { kind: 'type' | 'size' | 'count'; name: string }

/** Comprueba los archivos elegidos: solo fotos y PDF, de hasta 10 MB, y como mucho 6 */
export function checkFiles(files: File[], max = MAX_FILES): FileProblem | null {
  if (files.length > max) return { kind: 'count', name: '' }
  for (const f of files) {
    if (!(f.type.startsWith('image/') || f.type === 'application/pdf')) return { kind: 'type', name: f.name }
    if (f.size > MAX_BYTES) return { kind: 'size', name: f.name }
  }
  return null
}

/** Reduce una foto a 1600 px como mucho y la guarda como JPEG; los PDF se suben tal cual */
async function prepare(file: File): Promise<{ blob: Blob; name: string; type: string }> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return { blob: file, name: file.name, type: file.type }
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
    if (!blob || blob.size >= file.size) return { blob: file, name: file.name, type: file.type }
    return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg' }
  } catch {
    return { blob: file, name: file.name, type: file.type }
  }
}

function toBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export type FileKind = 'updates' | 'payments' | 'budget' | 'selections' | 'snags'
type UploadRequest = { projectId: string; kind: FileKind; entryId: string; index: number; name: string; contentType: string; data: string }

/**
 * Sube los archivos de un avance, pago o línea del presupuesto y devuelve su ficha (con su enlace privado).
 * firstIndex: número del primer archivo (al añadir fotos a una línea que ya tiene).
 */
export async function uploadAttachments(projectId: string, kind: FileKind, entryId: string, files: File[], firstIndex = 1): Promise<Attachment[]> {
  const call = httpsCallable<UploadRequest, Attachment>(functions, 'uploadProjectFile', { timeout: 120_000 })
  const out: Attachment[] = []
  for (const [i, file] of files.entries()) {
    const { blob, name, type } = await prepare(file)
    if (blob.size > MAX_BYTES) throw new Error('too-big')
    const res = await call({ projectId, kind, entryId, index: firstIndex + i, name, contentType: type, data: await toBase64(blob) })
    out.push(res.data)
  }
  return out
}

/** Sube los planos o diseños de una reforma (reforms/{id}/plans/{entrada}) */
export async function uploadReformFiles(reformId: string, entryId: string, files: File[]): Promise<Attachment[]> {
  const call = httpsCallable<Omit<UploadRequest, 'projectId' | 'kind'> & { reformId: string; kind: 'plans' }, Attachment>(functions, 'uploadProjectFile', { timeout: 120_000 })
  const out: Attachment[] = []
  for (const [i, file] of files.entries()) {
    const { blob, name, type } = await prepare(file)
    if (blob.size > MAX_BYTES) throw new Error('too-big')
    const res = await call({ reformId, kind: 'plans', entryId, index: i + 1, name, contentType: type, data: await toBase64(blob) })
    out.push(res.data)
  }
  return out
}
