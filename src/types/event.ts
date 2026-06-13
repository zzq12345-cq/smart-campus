export interface CampusEvent {
  $id: string
  $createdAt: string
  $updatedAt: string
  authorId: string
  title: string
  description: string
  coverImage: string
  eventDate: string
  eventEndDate: string
  location: string
  capacity: number
  registrationDeadline: string
  category: EventCategory
  status: EventStatus
  registrationCount: number
  contactInfo: string
}

export type EventCategory = 'competition' | 'lecture' | 'club' | 'volunteer' | 'entertainment' | 'other'
export type EventStatus = 'upcoming' | 'ongoing' | 'ended' | 'cancelled'

export interface EventCreateData {
  title: string
  description: string
  coverImage?: string
  eventDate: string
  eventEndDate?: string
  location: string
  capacity: number
  registrationDeadline: string
  category: EventCategory
  contactInfo?: string
}

export interface EventRegistration {
  $id: string
  $createdAt: string
  eventId: string
  userId: string
  status: 'registered' | 'cancelled'
}
