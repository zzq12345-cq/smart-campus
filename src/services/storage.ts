import { ID } from 'appwrite'
import { config, storage } from '@/utils/appwrite'

interface UploadImageInput {
  localPath?: string
  file?: File
  fileName?: string
}

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {}
const postImageBucketId = (env.VITE_APPWRITE_POST_IMAGE_BUCKET_ID || env.VITE_APPWRITE_AVATAR_BUCKET_ID || 'avatars').trim()
const avatarBucketId = (env.VITE_APPWRITE_AVATAR_BUCKET_ID || 'avatars').trim()

function normalizePath(value?: string) {
  return typeof value === 'string' ? value.trim() : ''
}

function inferFileName(localPath: string, fallback = 'treehole-image.jpg') {
  const cleanPath = localPath.split('?')[0]
  const fileName = cleanPath.split('/').pop() || cleanPath.split('\\').pop() || ''
  return fileName || fallback
}

async function resolveUploadFile(input: UploadImageInput) {
  if (typeof File !== 'undefined' && input.file instanceof File) {
    return input.file
  }
  const localPath = normalizePath(input.localPath)
  if (!localPath) {
    throw new Error('Missing image path')
  }
  if (typeof fetch !== 'function' || typeof File === 'undefined') {
    throw new Error('Current runtime cannot convert local image for upload')
  }
  const response = await fetch(localPath)
  const blob = await response.blob()
  const fileName = input.fileName || inferFileName(localPath)
  return new File([blob], fileName, { type: blob.type || 'image/jpeg' })
}

function getStorageOrThrow() {
  if (!storage || typeof (storage as { createFile?: unknown }).createFile !== 'function') {
    throw new Error('Storage service is unavailable in current runtime')
  }
  return storage
}

function buildFileViewUrl(bucketId: string, fileId: string) {
  const endpoint = config.endpoint.replace(/\/+$/, '')
  return `${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/view?project=${encodeURIComponent(config.projectId)}`
}

async function uploadImage(bucketId: string, input: UploadImageInput) {
  const runtimeStorage = getStorageOrThrow()
  const file = await resolveUploadFile(input)

  const created = await runtimeStorage.createFile({
    bucketId,
    fileId: ID.unique(),
    file
  })
  const fileId = ((created as { $id?: string }).$id || (created as { id?: string }).id || '').trim()
  if (!fileId) {
    throw new Error('Storage file id is missing')
  }

  if (typeof runtimeStorage.getFileView === 'function') {
    return runtimeStorage.getFileView({ bucketId, fileId })
  }
  return buildFileViewUrl(bucketId, fileId)
}

export async function uploadPostImage(input: UploadImageInput) {
  return uploadImage(postImageBucketId, input)
}

export async function uploadAvatarImage(input: UploadImageInput) {
  return uploadImage(avatarBucketId, input)
}
