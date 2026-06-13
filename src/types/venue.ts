export type VenueCategory = 'classroom' | 'meeting_room' | 'sports' | 'lab' | 'auditorium' | 'other'
export type VenueStatus = 'available' | 'unavailable'
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Venue {
  $id: string
  $createdAt: string
  $updatedAt: string
  authorId: string
  name: string
  location: string
  description: string
  category: VenueCategory
  capacity: number
  openTime: string
  equipment: string
  coverImage: string
  status: VenueStatus
}

export interface VenueCreateData {
  name: string
  location: string
  description?: string
  category: VenueCategory
  capacity?: number
  openTime?: string
  equipment?: string
  coverImage?: string
}

export interface VenueReservation {
  $id: string
  $createdAt: string
  $updatedAt: string
  venueId: string
  userId: string
  startTime: string
  endTime: string
  purpose: string
  status: ReservationStatus
}

export interface ReservationCreateData {
  venueId: string
  startTime: string
  endTime: string
  purpose?: string
}
