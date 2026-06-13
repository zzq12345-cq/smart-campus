import '@/polyfills/appwrite-uni'
import { Account, Client, ExecutionMethod, Functions, Storage, TablesDB } from 'appwrite'
import { config } from '@/utils/appwrite-shared'

type QueryList = string[] | undefined
type StoredSession = { $id?: string | null; secret?: string | null } | null | undefined
const SESSION_STORAGE_KEY = 'session'

const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId)
const accountClient = new Account(client)
const tablesClient = new TablesDB(client)
const storageClient = new Storage(client)
const functionsClient = new Functions(client)

function readStoredSessionSecret() {
  try {
    if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') {
      return ''
    }
    const storedSession = (uni.getStorageSync(SESSION_STORAGE_KEY) as StoredSession) || null
    return typeof storedSession?.secret === 'string' ? storedSession.secret.trim() : ''
  } catch {
    return ''
  }
}

function clearClientSession() {
  const mutableClient = client as Client & {
    headers?: Record<string, string>
    config?: Record<string, unknown>
  }
  if (mutableClient.headers) {
    delete mutableClient.headers['X-Appwrite-Session']
  }
  if (mutableClient.config) {
    Reflect.deleteProperty(mutableClient.config, 'session')
  }
}

export function syncClientSession(sessionId?: string | null) {
  const normalizedSessionId = String(sessionId || '').trim()
  if (normalizedSessionId) {
    client.setSession(normalizedSessionId)
    return normalizedSessionId
  }
  clearClientSession()
  return ''
}

export function syncClientSessionFromStorage() {
  return syncClientSession(readStoredSessionSecret())
}

syncClientSessionFromStorage()

export const account = {
  create(userId: string, email: string, password: string, name?: string) {
    return accountClient.create({ userId, email, password, name })
  },
  createEmailPasswordSession(email: string, password: string) {
    return accountClient.createEmailPasswordSession({ email, password })
  },
  get() {
    return accountClient.get()
  },
  getSession(sessionId: string) {
    return accountClient.getSession({ sessionId })
  },
  deleteSession(sessionId: string) {
    return accountClient.deleteSession({ sessionId })
  },
  updateName(name: string) {
    return accountClient.updateName({ name })
  },
  createJWT() {
    return accountClient.createJWT()
  },
  createRecovery(email: string, url = `${config.endpoint.replace(/\/v1$/, '')}/recover`) {
    return accountClient.createRecovery({ email, url })
  }
}

export const tablesDB = {
  listRows(databaseId: string, tableId: string, queries?: QueryList, total?: boolean, transactionId?: string) {
    return tablesClient.listRows({ databaseId, tableId, queries, total, transactionId })
  },
  getRow(databaseId: string, tableId: string, rowId: string, queries?: QueryList, transactionId?: string) {
    return tablesClient.getRow({ databaseId, tableId, rowId, queries, transactionId })
  },
  createRow(
    databaseId: string,
    tableId: string,
    rowId: string,
    data?: Record<string, unknown>,
    permissions?: string[],
    transactionId?: string
  ) {
    return tablesClient.createRow({ databaseId, tableId, rowId, data: data || {}, permissions, transactionId })
  },
  updateRow(
    databaseId: string,
    tableId: string,
    rowId: string,
    data?: Record<string, unknown>,
    permissions?: string[],
    transactionId?: string
  ) {
    return tablesClient.updateRow({ databaseId, tableId, rowId, data: data || {}, permissions, transactionId })
  },
  deleteRow(databaseId: string, tableId: string, rowId: string, transactionId?: string) {
    return tablesClient.deleteRow({ databaseId, tableId, rowId, transactionId })
  },
  incrementRowColumn(
    databaseId: string,
    tableId: string,
    rowId: string,
    column: string,
    value?: number,
    max?: number,
    transactionId?: string
  ) {
    return tablesClient.incrementRowColumn({ databaseId, tableId, rowId, column, value, max, transactionId })
  },
  decrementRowColumn(
    databaseId: string,
    tableId: string,
    rowId: string,
    column: string,
    value?: number,
    min?: number,
    transactionId?: string
  ) {
    return tablesClient.decrementRowColumn({ databaseId, tableId, rowId, column, value, min, transactionId })
  }
}

export const storage = storageClient
export const functions = {
  createExecution(
    functionId: string,
    body?: string,
    async?: boolean,
    path?: string,
    method: ExecutionMethod = ExecutionMethod.POST,
    headers?: Record<string, string>,
    scheduledAt?: string
  ) {
    return functionsClient.createExecution({
      functionId,
      ...(typeof body !== 'undefined' ? { body } : {}),
      ...(typeof async !== 'undefined' ? { async } : {}),
      ...(typeof path !== 'undefined' ? { xpath: path } : {}),
      ...(typeof method !== 'undefined' ? { method } : {}),
      ...(typeof headers !== 'undefined' ? { headers } : {}),
      ...(typeof scheduledAt !== 'undefined' ? { scheduledAt } : {})
    })
  },
  getExecution(functionId: string, executionId: string) {
    return functionsClient.getExecution({ functionId, executionId })
  }
}
export { config }
export default client
