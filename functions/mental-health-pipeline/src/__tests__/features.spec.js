import { describe, expect, it } from 'vitest'
import { buildFeatureSnapshot } from '../features.js'

describe('buildFeatureSnapshot', () => {
  it('maps posts, journals, checkins, study signals and exams into a normalized snapshot', () => {
    const snapshot = buildFeatureSnapshot(
      {
        posts: [
          {
            $id: 'post-1',
            content: '最近真的有点崩溃，压力很大',
            mood: 'anxious',
            riskLevel: 2,
            topic: 'study',
            isAnonymous: true,
            $createdAt: '2026-03-15T16:30:00.000Z'
          }
        ],
        journals: [
          {
            $id: 'journal-1',
            title: '睡不着',
            content: '连续几天都很焦虑，感觉撑不住',
            mood: 'sad',
            isPrivate: true,
            riskLevel: 2,
            sentimentScore: -0.8,
            $createdAt: '2026-03-15T17:30:00.000Z'
          },
          {
            $id: 'journal-2',
            title: '还是很累',
            content: '今天依旧低落',
            mood: 'sad',
            isPrivate: true,
            riskLevel: 2,
            sentimentScore: -0.7,
            $createdAt: '2026-03-14T17:30:00.000Z'
          }
        ],
        checkins: [
          {
            $id: 'checkin-1',
            checkinDate: '2026-03-15',
            mood: 'sad',
            moodIntensity: 5,
            energyLevel: 1,
            riskLevel: 3,
            notes: '今天什么也不想做'
          }
        ],
        studyCheckins: [
          {
            $id: 'study-1',
            checkinDate: '2026-03-15',
            duration: 20
          }
        ],
        examPlans: [
          {
            $id: 'exam-1',
            subject: '高数',
            examDate: '2026-03-18T01:00:00.000Z'
          }
        ],
        aggregate: {
          posts: 3,
          journals: 4,
          checkins: 3,
          studyCheckins: 5,
          studyDuration: 260,
          negativeSignals: 6
        }
      },
      {
        windowStart: '2026-03-09T00:00:00.000Z',
        windowEnd: '2026-03-16T00:00:00.000Z',
        aggregateStart: '2026-02-15T00:00:00.000Z',
        nowIso: '2026-03-16T00:00:00.000Z'
      }
    )

    expect(snapshot.posts.negativeCount).toBe(1)
    expect(snapshot.posts.anonymousCount).toBe(1)
    expect(snapshot.journals.negativeStreak).toBe(2)
    expect(snapshot.checkins.highRiskCount).toBe(1)
    expect(snapshot.checkins.avgEnergyLevel).toBe(1)
    expect(snapshot.study.shortDurationCount).toBe(1)
    expect(snapshot.exams.pressureScore).toBe(3)
    expect(snapshot.aggregate30.negativeSignals).toBe(6)
    expect(snapshot.textSignals).toHaveLength(4)
  })
})
