export type CheckinMood = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry'

export interface Checkin {
  $id: string
  userId: string
  checkinDate: string
  mood: CheckinMood
  moodIntensity: number
  energyLevel: number
  notes?: string
  riskLevel: number
  riskReason?: string
  $createdAt?: string
  $updatedAt?: string
}

export interface CheckinCreateData {
  checkinDate: string
  mood: CheckinMood
  moodIntensity: number
  energyLevel: number
  notes?: string
  riskLevel?: number
  riskReason?: string
}

export interface CheckinUpdateData extends Partial<CheckinCreateData> {}
