export interface UserSession {
  $id?: string
  userId: string
  sessionId: string
  expiresAt: string
  deviceInfo?: string
  ipAddress?: string
  countryCode?: string
  countryName?: string
  regionName?: string
  cityName?: string
  timezone?: string
  latitude?: number
  longitude?: number
  geoProvider?: string
  geoUpdatedAt?: string
  $createdAt?: string
  $updatedAt?: string
  [key: string]: unknown
}

export interface SessionUpsertData {
  sessionId: string
  expiresAt: string | number | Date
  deviceInfo?: string | Record<string, unknown>
  ipAddress?: string
  countryCode?: string
  countryName?: string
  regionName?: string
  cityName?: string
  timezone?: string
  latitude?: number
  longitude?: number
  geoProvider?: string
}

export interface SessionAnomalyResult {
  isAnomalous: boolean
  reason?: string
}

