const NEGATIVE_MOODS = new Set(['anxious', 'sad', 'angry'])
const LEGACY_MOOD_MAP = {
  开心: 'happy',
  喜悦: 'happy',
  平静: 'calm',
  焦虑: 'anxious',
  低落: 'sad'
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

function normalizeMood(value) {
  const normalized = cleanString(value, 20)
  return LEGACY_MOOD_MAP[normalized] || normalized
}

function normalizeDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isLateNight(value) {
  const date = normalizeDate(value)
  if (!date) {
    return false
  }
  const hour = date.getUTCHours()
  return hour < 5 || hour >= 23
}

function toDateOnly(value) {
  const date = normalizeDate(value)
  if (!date) {
    return ''
  }
  return date.toISOString().slice(0, 10)
}

function average(values) {
  if (!values.length) {
    return 0
  }
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0)
  return Number((total / values.length).toFixed(2))
}

function sortIsoDatesDesc(values) {
  return [...values].sort((left, right) => new Date(right).getTime() - new Date(left).getTime())
}

function buildNegativeStreak(journals) {
  const sorted = sortIsoDatesDesc(journals.map((item) => item.$createdAt || item.createdAt || '')).map((createdAt) =>
    journals.find((journal) => (journal.$createdAt || journal.createdAt || '') === createdAt)
  )
  let streak = 0
  for (const journal of sorted) {
    if (!journal) {
      continue
    }
    const mood = normalizeMood(journal.mood)
    const negative = NEGATIVE_MOODS.has(mood) || Number(journal.riskLevel || 1) >= 2 || Number(journal.sentimentScore || 0) < -0.3
    if (!negative) {
      break
    }
    streak += 1
  }
  return streak
}

function buildStudyInterruptionDays(studyCheckins, windowStart, windowEnd) {
  const uniqueDates = Array.from(new Set(studyCheckins.map((item) => cleanString(item.checkinDate, 10)).filter(Boolean))).sort()
  if (!uniqueDates.length) {
    return 0
  }

  let interruptions = 0
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const prevDate = normalizeDate(uniqueDates[index - 1])
    const currentDate = normalizeDate(uniqueDates[index])
    if (!prevDate || !currentDate) {
      continue
    }
    const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / 86400000)
    if (diffDays > 1) {
      interruptions += diffDays - 1
    }
  }

  const firstDate = normalizeDate(`${uniqueDates[0]}T00:00:00.000Z`)
  const lastDate = normalizeDate(`${uniqueDates[uniqueDates.length - 1]}T00:00:00.000Z`)
  const startDate = normalizeDate(windowStart)
  const endDate = normalizeDate(windowEnd)
  if (firstDate && startDate) {
    interruptions += Math.max(0, Math.round((firstDate.getTime() - startDate.getTime()) / 86400000))
  }
  if (lastDate && endDate) {
    interruptions += Math.max(0, Math.round((endDate.getTime() - lastDate.getTime()) / 86400000) - 1)
  }
  return interruptions
}

function buildExamPressure(examPlans, nowIso) {
  const now = normalizeDate(nowIso) || new Date()
  const upcoming = examPlans
    .map((item) => {
      const examDate = normalizeDate(item.examDate)
      if (!examDate) {
        return null
      }
      const diffDays = Math.ceil((examDate.getTime() - now.getTime()) / 86400000)
      return {
        subject: cleanString(item.subject, 100),
        examDate: examDate.toISOString(),
        diffDays
      }
    })
    .filter((item) => item && item.diffDays >= 0)
    .sort((left, right) => left.diffDays - right.diffDays)

  const nearest = upcoming[0] || null
  let pressureScore = 0
  if (nearest) {
    if (nearest.diffDays <= 3) {
      pressureScore = 3
    } else if (nearest.diffDays <= 7) {
      pressureScore = 2
    } else if (nearest.diffDays <= 14) {
      pressureScore = 1
    }
  }

  return {
    upcomingCount: upcoming.length,
    nearestExamInDays: nearest ? nearest.diffDays : null,
    pressureScore,
    upcoming: upcoming.slice(0, 5)
  }
}

export function buildFeatureSnapshot(input, options = {}) {
  const windowStart = cleanString(options.windowStart || '')
  const windowEnd = cleanString(options.windowEnd || '')
  const aggregateStart = cleanString(options.aggregateStart || '')
  const nowIso = cleanString(options.nowIso || new Date().toISOString())
  const posts = Array.isArray(input.posts) ? input.posts : []
  const journals = Array.isArray(input.journals) ? input.journals : []
  const checkins = Array.isArray(input.checkins) ? input.checkins : []
  const studyCheckins = Array.isArray(input.studyCheckins) ? input.studyCheckins : []
  const examPlans = Array.isArray(input.examPlans) ? input.examPlans : []
  const aggregate = input.aggregate || {}

  const postTexts = posts.map((item) => ({
    source: 'post',
    id: cleanString(item.$id || item.id, 64),
    text: cleanString(item.content, 280),
    createdAt: cleanString(item.$createdAt || item.createdAt, 40),
    mood: normalizeMood(item.mood),
    riskLevel: Number(item.riskLevel || 0),
    metadata: {
      topic: cleanString(item.topic, 40),
      anonymous: Boolean(item.isAnonymous)
    }
  }))

  const journalTexts = journals.map((item) => ({
    source: 'journal',
    id: cleanString(item.$id || item.id, 64),
    text: cleanString([item.title, item.content].filter(Boolean).join(' '), 280),
    createdAt: cleanString(item.$createdAt || item.createdAt, 40),
    mood: normalizeMood(item.mood),
    riskLevel: Number(item.riskLevel || item.moodIntensity || 0),
    metadata: {
      private: Boolean(item.isPrivate ?? item.rebtOnly),
      tags: Array.isArray(item.tags) ? item.tags.slice(0, 5) : Array.isArray(item.tagIds) ? item.tagIds.slice(0, 5) : []
    }
  }))

  const checkinTexts = checkins
    .filter((item) => cleanString(item.notes, 400))
    .map((item) => ({
      source: 'checkin',
      id: cleanString(item.$id || item.id, 64),
      text: cleanString([item.notes, item.riskReason].filter(Boolean).join(' '), 220),
      createdAt: cleanString(item.$createdAt || item.createdAt, 40),
      mood: normalizeMood(item.mood),
      riskLevel: Number(item.riskLevel || 0),
      metadata: {
        moodIntensity: Number(item.moodIntensity || 0),
        energyLevel: Number(item.energyLevel || 0)
      }
    }))

  const negativePostCount = posts.filter(
    (item) => NEGATIVE_MOODS.has(normalizeMood(item.mood)) || Number(item.riskLevel || 1) >= 2
  ).length
  const negativeJournalCount = journals.filter(
    (item) =>
      NEGATIVE_MOODS.has(normalizeMood(item.mood)) ||
      Number(item.riskLevel || item.moodIntensity || 1) >= 2 ||
      Number(item.sentimentScore || 0) < -0.3
  ).length
  const negativeCheckinCount = checkins.filter(
    (item) => NEGATIVE_MOODS.has(normalizeMood(item.mood)) || Number(item.riskLevel || 1) >= 2
  ).length
  const studyDurations = studyCheckins.map((item) => Number(item.duration || 0)).filter((value) => Number.isFinite(value))
  const examPressure = buildExamPressure(examPlans, nowIso)

  return {
    meta: {
      generatedAt: nowIso,
      windowStart,
      windowEnd,
      aggregateStart
    },
    posts: {
      count: posts.length,
      negativeCount: negativePostCount,
      anonymousCount: posts.filter((item) => Boolean(item.isAnonymous)).length,
      highRiskCount: posts.filter((item) => Number(item.riskLevel || 1) >= 3).length,
      nightCount: posts.filter((item) => isLateNight(item.$createdAt || item.createdAt)).length,
      topics: Array.from(new Set(posts.map((item) => cleanString(item.topic, 40)).filter(Boolean))).slice(0, 8)
    },
    journals: {
      count: journals.length,
      negativeCount: negativeJournalCount,
      privateCount: journals.filter((item) => Boolean(item.isPrivate ?? item.rebtOnly)).length,
      highRiskCount: journals.filter((item) => Number(item.riskLevel || item.moodIntensity || 1) >= 3).length,
      nightCount: journals.filter((item) => isLateNight(item.$createdAt || item.createdAt)).length,
      negativeStreak: buildNegativeStreak(journals)
    },
    checkins: {
      count: checkins.length,
      negativeCount: negativeCheckinCount,
      highRiskCount: checkins.filter((item) => Number(item.riskLevel || 1) >= 3).length,
      avgMoodIntensity: average(checkins.map((item) => Number(item.moodIntensity || 0))),
      avgEnergyLevel: average(checkins.map((item) => Number(item.energyLevel || 0))),
      latestRiskLevel: checkins.length ? Number(checkins[0].riskLevel || 1) : 0,
      recentRiskAverage: average(checkins.slice(0, 3).map((item) => Number(item.riskLevel || 0)))
    },
    study: {
      count: studyCheckins.length,
      totalDuration: studyDurations.reduce((sum, value) => sum + value, 0),
      averageDuration: average(studyDurations),
      shortDurationCount: studyDurations.filter((value) => value > 0 && value < 30).length,
      interruptionDays: buildStudyInterruptionDays(studyCheckins, windowStart, windowEnd),
      uniqueDays: Array.from(new Set(studyCheckins.map((item) => cleanString(item.checkinDate, 10)).filter(Boolean))).length
    },
    exams: examPressure,
    aggregate30: {
      posts: Number(aggregate.posts || 0),
      journals: Number(aggregate.journals || 0),
      checkins: Number(aggregate.checkins || 0),
      studyCheckins: Number(aggregate.studyCheckins || 0),
      studyDuration: Number(aggregate.studyDuration || 0),
      negativeSignals: clamp(Number(aggregate.negativeSignals || 0), 0, 999)
    },
    textSignals: [...postTexts, ...journalTexts, ...checkinTexts].slice(0, 18),
    temporal: {
      activeDates: Array.from(
        new Set(
          [...posts, ...journals]
            .map((item) => toDateOnly(item.$createdAt || item.createdAt))
            .filter(Boolean)
        )
      ),
      lateNightSignals:
        posts.filter((item) => isLateNight(item.$createdAt || item.createdAt)).length +
        journals.filter((item) => isLateNight(item.$createdAt || item.createdAt)).length
    }
  }
}
