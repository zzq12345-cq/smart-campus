import crypto from 'node:crypto'
import { Client, Query, TablesDB } from 'node-appwrite'
import { requestStructuredAssessment } from './ai-provider.js'
import { buildFeatureSnapshot } from './features.js'
import { buildCooldownKey, buildInterventionPlan, isCooldownHit } from './intervention-utils.js'
import { evaluateRiskRules, mergeAssessment } from './rule-engine.js'

const PROMPT_VERSION = 'mental-health-poc-v1'
const SOURCE_TABLE_TO_TRIGGER = {
  posts: 'post',
  journals: 'journal',
  checkins: 'checkin',
  study_checkins: 'study_checkin',
  exam_plans: 'exam_plan'
}

function env(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function cleanString(value, maxLength) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }
  return typeof maxLength === 'number' ? normalized.slice(0, maxLength) : normalized
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
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

function userRole(userId) {
  return `user:${cleanString(userId, 64)}`
}

function createPermission(action, role) {
  return `${action}("${role}")`
}

function buildUserPermissions(userId) {
  return [
    createPermission('read', userRole(userId)),
    createPermission('update', userRole(userId)),
    createPermission('delete', userRole(userId))
  ]
}

function nowIso() {
  return new Date().toISOString()
}

function minusDays(days) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - Number(days || 0))
  return date.toISOString()
}

function plusDays(days) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + Number(days || 0))
  return date.toISOString()
}

function safeJsonParse(value, fallback = {}) {
  try {
    return JSON.parse(String(value || ''))
  } catch {
    return fallback
  }
}

function summarizeEvidence(evidence) {
  return (Array.isArray(evidence) ? evidence : [])
    .map((item) => cleanString(item, 120))
    .filter(Boolean)
    .slice(0, 4)
    .join(' | ')
}

function defaultPreferences(userRow) {
  const privacySettings = safeJsonParse(userRow?.privacySettings, {})
  const notificationSettings = safeJsonParse(userRow?.notificationSettings, {})
  return {
    mentalHealthOptIn: privacySettings.mentalHealthOptIn !== false,
    allowAutoIntervention: notificationSettings.allowAutoIntervention !== false
  }
}

function mapSourceConfig(tableId) {
  return {
    posts: {
      userField: 'authorId',
      createdField: '$createdAt',
      filter(value) {
        return cleanString(value?.section) === 'psychology' && cleanString(value?.status || 'published') !== 'deleted'
      }
    },
    journals: {
      userField: 'userId',
      createdField: '$createdAt',
      filter() {
        return true
      }
    },
    checkins: {
      userField: 'userId',
      createdField: '$createdAt',
      filter() {
        return true
      }
    },
    study_checkins: {
      userField: 'userId',
      createdField: '$createdAt',
      filter() {
        return true
      }
    },
    exam_plans: {
      userField: 'authorId',
      createdField: '$createdAt',
      filter() {
        return true
      }
    }
  }[tableId]
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
    usersTableId: env('APPWRITE_USERS_TABLE_ID', 'users'),
    postsTableId: env('APPWRITE_POSTS_TABLE_ID', 'posts'),
    journalsTableId: env('APPWRITE_JOURNALS_TABLE_ID', 'journals'),
    checkinsTableId: env('APPWRITE_CHECKINS_TABLE_ID', 'checkins'),
    studyCheckinsTableId: env('APPWRITE_STUDY_CHECKINS_TABLE_ID', 'study_checkins'),
    examPlansTableId: env('APPWRITE_EXAM_PLANS_TABLE_ID', 'exam_plans'),
    suggestionsTableId: env('APPWRITE_SUGGESTIONS_TABLE_ID', 'suggestions'),
    notificationsTableId: env('APPWRITE_NOTIFICATIONS_TABLE_ID', 'notifications'),
    riskFlagsTableId: env('APPWRITE_RISK_FLAGS_TABLE_ID', 'risk_flags'),
    assessmentsTableId: env('APPWRITE_MENTAL_HEALTH_ASSESSMENTS_TABLE_ID', 'mental_health_assessments'),
    interventionsTableId: env('APPWRITE_MENTAL_HEALTH_INTERVENTIONS_TABLE_ID', 'mental_health_interventions'),
    ai: {
      baseUrl: env('AI_BASE_URL', ''),
      apiKey: env('AI_API_KEY', ''),
      model: env('AI_MODEL', ''),
      timeoutMs: Number(env('AI_TIMEOUT_MS', '15000'))
    }
  }
}

async function listRows(context, tableId, queries) {
  const result = await context.tablesDB.listRows({
    databaseId: context.databaseId,
    tableId,
    queries
  })
  return Array.isArray(result?.rows) ? result.rows : []
}

async function getRow(context, tableId, rowId) {
  return context.tablesDB.getRow({
    databaseId: context.databaseId,
    tableId,
    rowId
  })
}

async function createRow(context, tableId, data, permissions = []) {
  return context.tablesDB.createRow({
    databaseId: context.databaseId,
    tableId,
    rowId: crypto.randomUUID(),
    data,
    permissions
  })
}

async function updateRow(context, tableId, rowId, data, permissions) {
  const payload = {
    databaseId: context.databaseId,
    tableId,
    rowId,
    data
  }
  if (Array.isArray(permissions)) {
    payload.permissions = permissions
  }
  return context.tablesDB.updateRow(payload)
}

async function getUserRow(context, userId) {
  try {
    return await getRow(context, context.usersTableId, userId)
  } catch (error) {
    if (Number(error?.code || 0) === 404) {
      return null
    }
    throw error
  }
}

function resolveSourceTable(context, sourceTable) {
  const normalized = cleanString(sourceTable)
  const tableMap = {
    posts: context.postsTableId,
    journals: context.journalsTableId,
    checkins: context.checkinsTableId,
    study_checkins: context.studyCheckinsTableId,
    exam_plans: context.examPlansTableId
  }
  const tableId = tableMap[normalized]
  if (!tableId) {
    throw createError('Unsupported source table', 400)
  }
  return tableId
}

async function resolveSourceEvent(context, sourceTable, rowId) {
  const tableId = resolveSourceTable(context, sourceTable)
  const config = mapSourceConfig(sourceTable)
  const row = await getRow(context, tableId, rowId)
  if (!config?.filter(row)) {
    return null
  }
  const userId = cleanString(row?.[config.userField], 64)
  if (!userId) {
    throw createError('Source row does not contain user id', 400)
  }
  return {
    row,
    rowId,
    sourceTable,
    triggerType: SOURCE_TABLE_TO_TRIGGER[sourceTable] || 'user_window',
    userId
  }
}

async function loadFeatureRows(context, userId, windowStart, aggregateStart) {
  const [posts, journals, checkins, studyCheckins, examPlans, aggregatePosts, aggregateJournals, aggregateCheckins, aggregateStudy] =
    await Promise.all([
      listRows(context, context.postsTableId, [
        Query.equal('authorId', userId),
        Query.equal('section', 'psychology'),
        Query.greaterThanEqual('$createdAt', windowStart),
        Query.orderDesc('$createdAt'),
        Query.limit(25)
      ]),
      listRows(context, context.journalsTableId, [
        Query.equal('userId', userId),
        Query.greaterThanEqual('$createdAt', windowStart),
        Query.orderDesc('$createdAt'),
        Query.limit(25)
      ]),
      listRows(context, context.checkinsTableId, [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(15)
      ]),
      listRows(context, context.studyCheckinsTableId, [
        Query.equal('userId', userId),
        Query.greaterThanEqual('checkinDate', aggregateStart.slice(0, 10)),
        Query.orderDesc('checkinDate'),
        Query.limit(30)
      ]),
      listRows(context, context.examPlansTableId, [
        Query.equal('authorId', userId),
        Query.orderAsc('examDate'),
        Query.limit(20)
      ]),
      listRows(context, context.postsTableId, [
        Query.equal('authorId', userId),
        Query.equal('section', 'psychology'),
        Query.greaterThanEqual('$createdAt', aggregateStart),
        Query.limit(100)
      ]),
      listRows(context, context.journalsTableId, [
        Query.equal('userId', userId),
        Query.greaterThanEqual('$createdAt', aggregateStart),
        Query.limit(100)
      ]),
      listRows(context, context.checkinsTableId, [
        Query.equal('userId', userId),
        Query.limit(100)
      ]),
      listRows(context, context.studyCheckinsTableId, [
        Query.equal('userId', userId),
        Query.greaterThanEqual('checkinDate', aggregateStart.slice(0, 10)),
        Query.limit(100)
      ])
    ])

  return {
    posts,
    journals,
    checkins: checkins.filter((item) => cleanString(item.checkinDate, 10) >= windowStart.slice(0, 10)),
    studyCheckins: studyCheckins.filter((item) => cleanString(item.checkinDate, 10) >= windowStart.slice(0, 10)),
    examPlans: examPlans.filter((item) => cleanString(item.examDate) >= aggregateStart),
    aggregate: {
      posts: aggregatePosts.length,
      journals: aggregateJournals.length,
      checkins: aggregateCheckins.length,
      studyCheckins: aggregateStudy.length,
      studyDuration: aggregateStudy.reduce((sum, item) => sum + Number(item.duration || 0), 0),
      negativeSignals:
        aggregatePosts.filter((item) => Number(item.riskLevel || 1) >= 2).length +
        aggregateJournals.filter((item) => Number(item.riskLevel || 1) >= 2 || Number(item.sentimentScore || 0) < -0.3).length +
        aggregateCheckins.filter((item) => Number(item.riskLevel || 1) >= 2).length
    }
  }
}

function buildEmotionSummary(result) {
  const labelText = Array.isArray(result.emotionLabels) && result.emotionLabels.length ? result.emotionLabels.join(' / ') : 'stable'
  const evidence = summarizeEvidence(result.evidence)
  return cleanString(`${labelText}${evidence ? ` | ${evidence}` : ''}`, 300)
}

function deriveSentimentScore(result) {
  const risk = Number(result.finalRiskLevel || 0)
  const confidence = Number(result.confidence || 0)
  const base = 0.4 - risk * 0.45 + confidence * 0.1
  return Number(clamp(Number(base.toFixed(2)), -1, 1))
}

async function syncSourceFields(context, sourceEvent, merged) {
  if (!sourceEvent) {
    return
  }

  if (sourceEvent.sourceTable === 'journals') {
    await updateRow(context, context.journalsTableId, sourceEvent.rowId, {
      summary: cleanString(buildEmotionSummary(merged), 1000),
      sentimentScore: deriveSentimentScore(merged),
      riskLevel: Math.max(1, Math.min(3, Number(merged.finalRiskLevel || 1)))
    })
    return
  }

  if (sourceEvent.sourceTable === 'checkins') {
    await updateRow(context, context.checkinsTableId, sourceEvent.rowId, {
      riskLevel: Math.max(1, Math.min(3, Number(merged.finalRiskLevel || 1))),
      riskReason: cleanString(summarizeEvidence(merged.evidence), 1000)
    })
    return
  }

  if (sourceEvent.sourceTable === 'posts') {
    const nextRiskLevel = Math.max(1, Math.min(3, Number(merged.finalRiskLevel || sourceEvent.row?.riskLevel || 1)))
    if (nextRiskLevel > Number(sourceEvent.row?.riskLevel || 1)) {
      await updateRow(context, context.postsTableId, sourceEvent.rowId, {
        riskLevel: nextRiskLevel
      })
    }
  }
}

async function saveAssessment(context, payload, userId) {
  return createRow(
    context,
    context.assessmentsTableId,
    payload,
    buildUserPermissions(userId)
  )
}

async function hasCooldown(context, userId, cooldownKey) {
  const rows = await listRows(context, context.interventionsTableId, [
    Query.equal('userId', userId),
    Query.equal('cooldownKey', cooldownKey),
    Query.greaterThanEqual('$createdAt', minusDays(1)),
    Query.limit(1)
  ])
  return isCooldownHit(rows)
}

function mapSuggestionPriority(plan) {
  return ['low', 'medium', 'high', 'urgent'].includes(plan.priority) ? plan.priority : 'medium'
}

async function createNotification(context, userId, interventionId, message, cooldownKey) {
  return createRow(
    context,
    context.notificationsTableId,
    {
      recipientId: userId,
      actorId: userId,
      type: 'system',
      targetType: 'user',
      targetId: userId,
      preview: cleanString(message, 200),
      isRead: false,
      groupKey: cooldownKey || `mental-health:${interventionId}`
    },
    buildUserPermissions(userId)
  )
}

async function createSuggestion(context, assessment, plan) {
  return createRow(
    context,
    context.suggestionsTableId,
    {
      userId: assessment.userId,
      title: cleanString(plan.title, 200),
      description: cleanString(plan.studentMessage, 1800),
      status: 'pending',
      category: cleanString(plan.suggestionCategory, 20) || 'other',
      priority: mapSuggestionPriority(plan),
      sourceRunId: assessment.$id,
      checkinId: assessment.triggerType === 'checkin' ? cleanString(assessment.triggerRefId, 36) : '',
      score: clamp(Number(assessment.confidence || 0), 0, 1),
      sourceType: 'mental_health',
      expiresAt: plusDays(7),
      metadataJson: JSON.stringify({
        assessmentId: assessment.$id,
        finalRiskLevel: assessment.finalRiskLevel,
        recommendedAction: assessment.recommendedAction
      })
    },
    buildUserPermissions(assessment.userId)
  )
}

function mapRiskFlagTargetType(assessment) {
  const triggerType = cleanString(assessment.triggerType)
  if (['post', 'journal', 'checkin', 'assessment', 'user'].includes(triggerType)) {
    return triggerType
  }
  return 'assessment'
}

async function createRiskFlag(context, assessment) {
  return createRow(
    context,
    context.riskFlagsTableId,
    {
      detectedBy: 'ai',
      targetType: mapRiskFlagTargetType(assessment),
      reporterUserId: assessment.userId,
      targetId: cleanString(assessment.triggerRefId || assessment.$id, 36),
      metadataJson: JSON.stringify({
        assessmentId: assessment.$id,
        reviewNeeded: assessment.reviewNeeded,
        recommendedAction: assessment.recommendedAction
      }),
      reason: cleanString(summarizeEvidence(safeJsonParse(assessment.evidenceJson, [])) || assessment.emotionSummary, 1000),
      riskLevel: Math.max(1, Math.min(3, Number(assessment.finalRiskLevel || 1))),
      status: 'open'
    },
    buildUserPermissions(assessment.userId)
  )
}

async function dispatchAssessmentIntervention(context, assessment, options = {}) {
  const userRow = await getUserRow(context, assessment.userId)
  if (!userRow) {
    return { intervention: null, skipped: true, reason: 'user_not_found' }
  }

  const preferences = defaultPreferences(userRow)
  if (!preferences.mentalHealthOptIn) {
    return { intervention: null, skipped: true, reason: 'opt_out' }
  }
  if (!preferences.allowAutoIntervention && !options.force) {
    return { intervention: null, skipped: true, reason: 'auto_intervention_disabled' }
  }
  if (Number(assessment.finalRiskLevel || 0) <= 0) {
    return { intervention: null, skipped: true, reason: 'low_risk' }
  }

  const featureSnapshot = safeJsonParse(assessment.featureSnapshotJson, {})
  const plan = buildInterventionPlan({
    ...assessment,
    emotionSummary: cleanString(featureSnapshot?.studentMessage || assessment.emotionSummary, 240) || assessment.emotionSummary
  })
  const cooldownKey = buildCooldownKey(assessment, plan.actionType)
  if (!options.force && (await hasCooldown(context, assessment.userId, cooldownKey))) {
    return { intervention: null, skipped: true, reason: 'cooldown_active' }
  }

  const intervention = await createRow(
    context,
    context.interventionsTableId,
    {
      userId: assessment.userId,
      assessmentId: assessment.$id,
      channel: plan.channel,
      actionType: plan.actionType,
      payloadJson: JSON.stringify({
        category: plan.category,
        title: plan.title,
        riskLevel: assessment.finalRiskLevel,
        studentMessage: plan.studentMessage,
        resources: plan.resources
      }),
      deliveryStatus: 'pending',
      cooldownKey,
      acknowledgedAt: null,
      effectivenessNote: ''
    },
    buildUserPermissions(assessment.userId)
  )

  try {
    await createNotification(context, assessment.userId, intervention.$id, plan.studentMessage, cooldownKey)
    if (Number(assessment.finalRiskLevel || 0) >= 2) {
      await createSuggestion(context, assessment, plan)
    }
    if (Number(assessment.finalRiskLevel || 0) >= 3) {
      await createRiskFlag(context, assessment)
    }
    await updateRow(context, context.interventionsTableId, intervention.$id, {
      deliveryStatus: 'sent'
    })
    return {
      intervention: {
        ...intervention,
        deliveryStatus: 'sent'
      },
      skipped: false
    }
  } catch (error) {
    await updateRow(context, context.interventionsTableId, intervention.$id, {
      deliveryStatus: 'failed',
      effectivenessNote: cleanString(error?.message || 'dispatch failed', 200)
    })
    return {
      intervention: {
        ...intervention,
        deliveryStatus: 'failed'
      },
      skipped: false
    }
  }
}

async function evaluateForWindow(context, params) {
  const userRow = await getUserRow(context, params.userId)
  if (!userRow) {
    return null
  }

  const preferences = defaultPreferences(userRow)
  if (!preferences.mentalHealthOptIn) {
    return null
  }

  const windowDays = clamp(Number(params.windowDays || 7), 1, 30)
  const aggregateDays = clamp(Number(params.aggregateDays || 30), windowDays, 90)
  const windowStart = minusDays(windowDays)
  const aggregateStart = minusDays(aggregateDays)
  const windowEnd = nowIso()
  const sourceRows = await loadFeatureRows(context, params.userId, windowStart, aggregateStart)
  const snapshot = buildFeatureSnapshot(sourceRows, {
    windowStart,
    windowEnd,
    aggregateStart,
    nowIso: windowEnd
  })
  const ruleResult = evaluateRiskRules(snapshot)
  const modelResult = await requestStructuredAssessment(context.ai, snapshot, ruleResult)
  const merged = mergeAssessment({
    ruleResult,
    modelResult: modelResult.output
  })

  const assessment = await saveAssessment(
    context,
    {
      userId: params.userId,
      triggerType: cleanString(params.triggerType || 'user_window', 30),
      triggerRefId: cleanString(params.triggerRefId, 36),
      windowStart,
      windowEnd,
      featureSnapshotJson: JSON.stringify({
        ...snapshot,
        studentMessage: merged.studentMessage
      }),
      ruleScore: merged.ruleScore,
      modelScore: merged.modelScore,
      finalRiskLevel: merged.finalRiskLevel,
      confidence: merged.confidence,
      emotionSummary: buildEmotionSummary(merged),
      evidenceJson: JSON.stringify(merged.evidence),
      recommendedAction: cleanString(merged.recommendedAction, 120),
      reviewNeeded: merged.finalRiskLevel >= 3,
      modelProvider: cleanString(modelResult.provider || 'rules-only', 50),
      modelName: cleanString(modelResult.modelName || 'rules-only', 100),
      promptVersion: PROMPT_VERSION
    },
    params.userId
  )

  await syncSourceFields(context, params.sourceEvent, merged)

  let intervention = null
  if (merged.finalRiskLevel > 0) {
    const interventionResult = await dispatchAssessmentIntervention(context, assessment, {
      force: Boolean(params.forceIntervention)
    })
    intervention = interventionResult.intervention || null
  }

  return {
    assessment,
    intervention
  }
}

async function handleEvaluateEvent(context, payload) {
  const sourceTable = cleanString(payload?.sourceTable)
  const rowId = cleanString(payload?.rowId, 64)
  if (!sourceTable || !rowId) {
    throw createError('sourceTable and rowId are required', 400)
  }

  const sourceEvent = await resolveSourceEvent(context, sourceTable, rowId)
  if (!sourceEvent) {
    return {
      assessment: null,
      intervention: null,
      skipped: true
    }
  }

  const result = await evaluateForWindow(context, {
    userId: sourceEvent.userId,
    triggerType: sourceEvent.triggerType,
    triggerRefId: sourceEvent.rowId,
    sourceEvent,
    forceIntervention: false
  })

  return result || {
    assessment: null,
    intervention: null,
    skipped: true
  }
}

async function listCandidateUsers(context, limit = 50) {
  return listRows(context, context.usersTableId, [Query.limit(clamp(Number(limit || 50), 1, 100))])
}

async function handleEvaluateUserWindow(context, payload) {
  const userId = cleanString(payload?.userId, 64)
  const windowDays = clamp(Number(payload?.windowDays || 7), 1, 30)
  const aggregateDays = clamp(Number(payload?.aggregateDays || 30), windowDays, 90)
  if (userId) {
    const result = await evaluateForWindow(context, {
      userId,
      triggerType: 'user_window',
      triggerRefId: '',
      windowDays,
      aggregateDays,
      forceIntervention: false
    })
    return {
      assessments: result?.assessment ? [result.assessment] : []
    }
  }

  const users = await listCandidateUsers(context, payload?.limit || 50)
  const assessments = []
  for (const userRow of users) {
    const uid = cleanString(userRow?.$id || userRow?.userId, 64)
    if (!uid) {
      continue
    }
    const result = await evaluateForWindow(context, {
      userId: uid,
      triggerType: 'user_window',
      triggerRefId: '',
      windowDays,
      aggregateDays,
      forceIntervention: false
    })
    if (result?.assessment) {
      assessments.push(result.assessment)
    }
  }

  return { assessments }
}

async function handleBackfillUser(context, payload) {
  const userId = cleanString(payload?.userId, 64)
  if (!userId) {
    throw createError('userId is required', 400)
  }
  const result = await evaluateForWindow(context, {
    userId,
    triggerType: 'backfill',
    triggerRefId: '',
    windowDays: clamp(Number(payload?.windowDays || 7), 1, 30),
    aggregateDays: clamp(Number(payload?.aggregateDays || 30), 7, 90),
    forceIntervention: Boolean(payload?.force)
  })
  return {
    assessments: result?.assessment ? [result.assessment] : []
  }
}

async function handleDispatchIntervention(context, payload) {
  const assessmentId = cleanString(payload?.assessmentId, 36)
  if (!assessmentId) {
    throw createError('assessmentId is required', 400)
  }
  const assessment = await getRow(context, context.assessmentsTableId, assessmentId)
  const result = await dispatchAssessmentIntervention(context, assessment, {
    force: Boolean(payload?.force)
  })
  return result
}

export default async ({ req, res, log, error }) => {
  try {
    const context = getContext(req)
    const payload = parseBody(req)
    const action = cleanString(payload?.action)

    let data
    switch (action) {
      case 'evaluateEvent':
        data = await handleEvaluateEvent(context, payload)
        break
      case 'evaluateUserWindow':
        data = await handleEvaluateUserWindow(context, payload)
        break
      case 'dispatchIntervention':
        data = await handleDispatchIntervention(context, payload)
        break
      case 'backfillUser':
        data = await handleBackfillUser(context, payload)
        break
      default:
        throw createError('Unsupported action', 400)
    }

    return ok(res, data)
  } catch (err) {
    const message = String(err?.message || err)
    if (typeof error === 'function') {
      error(message)
    } else if (typeof log === 'function') {
      log(message)
    }
    return fail(res, err)
  }
}
