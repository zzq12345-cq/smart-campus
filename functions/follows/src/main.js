import crypto from 'node:crypto'
import { Client, Query, TablesDB } from 'node-appwrite'

function env(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function cleanString(value, maxLength) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return ''
  }
  return typeof maxLength === 'number' ? normalized.slice(0, maxLength) : normalized
}

function createPermission(action, role) {
  return `${action}("${role}")`
}

function userRole(userId) {
  return `user:${cleanString(userId)}`
}

function buildFollowPermissions(followerId, followingId) {
  return [
    createPermission('read', userRole(followerId)),
    createPermission('delete', userRole(followerId)),
    createPermission('read', userRole(followingId))
  ]
}

function createError(message, code = 500) {
  const error = new Error(message)
  error.code = code
  return error
}

function parseBody(req) {
  if (req?.bodyJson && typeof req.bodyJson === 'object') {
    return req.bodyJson
  }
  const raw = typeof req?.bodyText === 'string' ? req.bodyText : typeof req?.body === 'string' ? req.body : '{}'
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function respondJson(res, statusCode, payload) {
  return res.json(payload, statusCode)
}

function ok(res, data) {
  return respondJson(res, 200, {
    ok: true,
    data
  })
}

function fail(res, error) {
  const statusCode = Number(error?.code || 500)
  return respondJson(res, statusCode, {
    ok: false,
    error: String(error?.message || 'Unknown error'),
    code: statusCode
  })
}

function getContext(req) {
  const endpoint = env('APPWRITE_ENDPOINT', env('APPWRITE_FUNCTION_API_ENDPOINT', ''))
  const projectId = env('APPWRITE_PROJECT_ID', env('APPWRITE_FUNCTION_PROJECT_ID', ''))
  const apiKey = env('APPWRITE_API_KEY', '') || cleanString(req?.headers?.['x-appwrite-key'])
  if (!endpoint) {
    throw createError('Missing APPWRITE_ENDPOINT', 500)
  }
  if (!projectId) {
    throw createError('Missing APPWRITE_PROJECT_ID', 500)
  }
  if (!apiKey) {
    throw createError('Missing APPWRITE_API_KEY', 500)
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
  return {
    tablesDB: new TablesDB(client),
    databaseId: env('APPWRITE_DATABASE_ID', 'mindguard'),
    followsTableId: env('APPWRITE_FOLLOWS_TABLE_ID', 'follows'),
    usersTableId: env('APPWRITE_USERS_TABLE_ID', 'users')
  }
}

function getAuthenticatedUserId(req) {
  const userId = cleanString(
    req?.headers?.['x-appwrite-user-id'] ||
      req?.headers?.['X-Appwrite-User-Id'] ||
      req?.headers?.['x-appwrite-userid']
  )
  if (!userId) {
    throw createError('User is not authenticated', 401)
  }
  return userId
}

function isNotFoundError(error) {
  return Number(error?.code || 0) === 404
}

function isConflictError(error) {
  return Number(error?.code || 0) === 409
}

function normalizeFollow(row) {
  return {
    ...row,
    followerId: cleanString(row?.followerId, 36),
    followingId: cleanString(row?.followingId, 36)
  }
}

async function getUserRow(context, userId) {
  try {
    return await context.tablesDB.getRow({
      databaseId: context.databaseId,
      tableId: context.usersTableId,
      rowId: userId
    })
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }
    throw error
  }
}

async function getFollowRecord(context, followerId, followingId) {
  const result = await context.tablesDB.listRows({
    databaseId: context.databaseId,
    tableId: context.followsTableId,
    queries: [Query.equal('followerId', followerId), Query.equal('followingId', followingId), Query.limit(1)]
  })
  const rows = Array.isArray(result?.rows) ? result.rows : []
  return rows.length ? normalizeFollow(rows[0]) : null
}

async function applyCountDelta(context, rowId, column, delta) {
  if (delta >= 0) {
    return context.tablesDB.incrementRowColumn({
      databaseId: context.databaseId,
      tableId: context.usersTableId,
      rowId,
      column,
      value: delta
    })
  }
  return context.tablesDB.decrementRowColumn({
    databaseId: context.databaseId,
    tableId: context.usersTableId,
    rowId,
    column,
    value: Math.abs(delta),
    min: 0
  })
}

async function adjustCounts(context, followerId, followingId, delta) {
  await applyCountDelta(context, followerId, 'followingCount', delta)
  try {
    await applyCountDelta(context, followingId, 'followersCount', delta)
  } catch (error) {
    await applyCountDelta(context, followerId, 'followingCount', -delta)
    throw error
  }
}

async function rollbackFollowCreate(context, rowId) {
  try {
    await context.tablesDB.deleteRow({
      databaseId: context.databaseId,
      tableId: context.followsTableId,
      rowId
    })
  } catch {
    // ignore rollback failure, caller logs through Appwrite runtime
  }
}

async function rollbackFollowDelete(context, follow) {
  try {
    await context.tablesDB.createRow({
      databaseId: context.databaseId,
      tableId: context.followsTableId,
      rowId: follow.$id,
      data: {
        followerId: follow.followerId,
        followingId: follow.followingId
      },
      permissions: Array.isArray(follow?.$permissions) && follow.$permissions.length
        ? follow.$permissions
        : buildFollowPermissions(follow.followerId, follow.followingId)
    })
  } catch {
    // ignore rollback failure, caller logs through Appwrite runtime
  }
}

async function readCounts(context, currentUserId, targetUserId) {
  const [currentUserRow, targetUserRow] = await Promise.all([
    getUserRow(context, currentUserId),
    getUserRow(context, targetUserId)
  ])
  return {
    currentUserFollowingCount: Math.max(0, Number(currentUserRow?.followingCount || 0)),
    targetUserFollowersCount: Math.max(0, Number(targetUserRow?.followersCount || 0))
  }
}

async function assertUsersExist(context, currentUserId, targetUserId) {
  const [currentUserRow, targetUserRow] = await Promise.all([
    getUserRow(context, currentUserId),
    getUserRow(context, targetUserId)
  ])
  if (!currentUserRow) {
    throw createError('Current user profile does not exist', 404)
  }
  if (!targetUserRow) {
    throw createError('Target user profile does not exist', 404)
  }
}

async function handleFollowUser(context, currentUserId, payload) {
  const targetUserId = cleanString(payload?.targetUserId, 36)
  if (!targetUserId) {
    throw createError('Target user id is required', 400)
  }
  if (targetUserId === currentUserId) {
    throw createError('Cannot follow yourself', 400)
  }

  await assertUsersExist(context, currentUserId, targetUserId)

  const existing = await getFollowRecord(context, currentUserId, targetUserId)
  if (existing) {
    const counts = await readCounts(context, currentUserId, targetUserId)
    return {
      follow: existing,
      changed: false,
      followingCount: counts.currentUserFollowingCount,
      followersCount: counts.targetUserFollowersCount
    }
  }

  let created
  try {
    created = normalizeFollow(
      await context.tablesDB.createRow({
        databaseId: context.databaseId,
        tableId: context.followsTableId,
        rowId: crypto.randomUUID(),
        data: {
          followerId: currentUserId,
          followingId: targetUserId
        },
        permissions: buildFollowPermissions(currentUserId, targetUserId)
      })
    )
  } catch (error) {
    if (isConflictError(error)) {
      const conflictRow = await getFollowRecord(context, currentUserId, targetUserId)
      if (conflictRow) {
        const counts = await readCounts(context, currentUserId, targetUserId)
        return {
          follow: conflictRow,
          changed: false,
          followingCount: counts.currentUserFollowingCount,
          followersCount: counts.targetUserFollowersCount
        }
      }
    }
    throw error
  }

  try {
    await adjustCounts(context, currentUserId, targetUserId, 1)
  } catch (error) {
    await rollbackFollowCreate(context, created.$id)
    throw error
  }

  const counts = await readCounts(context, currentUserId, targetUserId)
  return {
    follow: created,
    changed: true,
    followingCount: counts.currentUserFollowingCount,
    followersCount: counts.targetUserFollowersCount
  }
}

async function handleUnfollowUser(context, currentUserId, payload) {
  const targetUserId = cleanString(payload?.targetUserId, 36)
  if (!targetUserId) {
    throw createError('Target user id is required', 400)
  }
  if (targetUserId === currentUserId) {
    throw createError('Cannot unfollow yourself', 400)
  }

  const existing = await getFollowRecord(context, currentUserId, targetUserId)
  if (!existing) {
    const counts = await readCounts(context, currentUserId, targetUserId)
    return {
      removed: false,
      changed: false,
      followingCount: counts.currentUserFollowingCount,
      followersCount: counts.targetUserFollowersCount
    }
  }

  await context.tablesDB.deleteRow({
    databaseId: context.databaseId,
    tableId: context.followsTableId,
    rowId: existing.$id
  })

  try {
    await adjustCounts(context, currentUserId, targetUserId, -1)
  } catch (error) {
    await rollbackFollowDelete(context, existing)
    throw error
  }

  const counts = await readCounts(context, currentUserId, targetUserId)
  return {
    removed: true,
    changed: true,
    followingCount: counts.currentUserFollowingCount,
    followersCount: counts.targetUserFollowersCount
  }
}

const ACTION_HANDLERS = {
  followUser: handleFollowUser,
  unfollowUser: handleUnfollowUser
}

export default async ({ req, res, log, error }) => {
  try {
    const payload = parseBody(req)
    const action = cleanString(payload?.action)
    if (!action || !(action in ACTION_HANDLERS)) {
      throw createError('Unsupported action', 400)
    }

    const context = getContext(req)
    const currentUserId = getAuthenticatedUserId(req)
    const handler = ACTION_HANDLERS[action]
    const result = await handler(context, currentUserId, payload)

    if (typeof log === 'function') {
      log(JSON.stringify({ action, currentUserId, ok: true }))
    }
    return ok(res, result)
  } catch (caughtError) {
    if (typeof error === 'function') {
      error(caughtError)
    }
    return fail(res, caughtError)
  }
}
