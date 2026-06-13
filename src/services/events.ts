import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import type { CampusEvent, EventCategory, EventCreateData, EventRegistration, EventStatus } from '@/types/event'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import {
  MINDGUARD_DATABASE_ID,
  EVENTS_TABLE_ID,
  EVENT_REGISTRATIONS_TABLE_ID
} from '@/utils/appwrite-shared'

const CATEGORY_SET: Set<EventCategory> = new Set([
  'competition', 'lecture', 'club', 'volunteer', 'entertainment', 'other'
])

class EventsService {
  private get db() {
    return { databaseId: MINDGUARD_DATABASE_ID, eventsTable: EVENTS_TABLE_ID, regTable: EVENT_REGISTRATIONS_TABLE_ID }
  }

  private async getAuthUserId() {
    const user = await authService.getCurrentUser()
    if (!user?.$id) {
      const error = new Error('User is not authenticated') as Error & { code?: number }
      error.code = 401
      throw error
    }
    return user.$id
  }

  private buildEventPermissions(authorId: string) {
    return [
      Permission.read(Role.users()),
      Permission.read(Role.user(authorId)),
      Permission.update(Role.user(authorId)),
      Permission.delete(Role.user(authorId))
    ]
  }

  private buildRegistrationPermissions(userId: string) {
    return [
      Permission.read(Role.users()),
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId))
    ]
  }

  private normalizeCategory(cat?: unknown): EventCategory {
    if (typeof cat === 'string' && CATEGORY_SET.has(cat as EventCategory)) {
      return cat as EventCategory
    }
    return 'other'
  }

  async createEvent(data: EventCreateData, userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, eventsTable } = this.db

    const payload: Record<string, unknown> = {
      authorId,
      title: data.title,
      description: data.description,
      coverImage: data.coverImage || '',
      eventDate: data.eventDate,
      location: data.location,
      capacity: data.capacity ?? 0,
      registrationDeadline: data.registrationDeadline,
      category: this.normalizeCategory(data.category),
      status: 'upcoming' as EventStatus,
      registrationCount: 0,
      contactInfo: data.contactInfo || ''
    }
    if (data.eventEndDate) {
      payload.eventEndDate = data.eventEndDate
    }

    const permissions = this.buildEventPermissions(authorId)
    return (await tablesDB.createRow(databaseId, eventsTable, ID.unique(), payload, permissions)) as CampusEvent
  }

  async getEvents(options: { category?: EventCategory; status?: EventStatus; limit?: number; offset?: number } = {}) {
    const { databaseId, eventsTable } = this.db
    const queries: string[] = []

    if (options.category) {
      queries.push(Query.equal('category', options.category))
    }
    if (options.status) {
      queries.push(Query.equal('status', options.status))
    }
    queries.push(Query.orderDesc('eventDate'))
    queries.push(Query.limit(options.limit ?? 20))
    queries.push(Query.offset(options.offset ?? 0))

    const result = await tablesDB.listRows(databaseId, eventsTable, queries)
    return (result?.rows || []) as CampusEvent[]
  }

  async getEvent(id: string) {
    const { databaseId, eventsTable } = this.db
    return (await tablesDB.getRow(databaseId, eventsTable, id)) as CampusEvent
  }

  async deleteEvent(id: string) {
    const { databaseId, eventsTable } = this.db
    await tablesDB.deleteRow(databaseId, eventsTable, id)
    return true
  }

  async getMyEvents(userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, eventsTable } = this.db
    const queries = [
      Query.equal('authorId', authorId),
      Query.orderDesc('$createdAt'),
      Query.limit(50)
    ]
    const result = await tablesDB.listRows(databaseId, eventsTable, queries)
    return (result?.rows || []) as CampusEvent[]
  }

  async updateEventStatus(id: string, status: EventStatus) {
    const { databaseId, eventsTable } = this.db
    return (await tablesDB.updateRow(databaseId, eventsTable, id, { status })) as CampusEvent
  }

  async registerForEvent(eventId: string, userId?: string) {
    const uid = userId || (await this.getAuthUserId())
    const { databaseId, regTable, eventsTable } = this.db

    const existing = await this.findRegistration(eventId, uid)
    if (existing && existing.status === 'registered') {
      throw new Error('Already registered for this event')
    }

    if (existing && existing.status === 'cancelled') {
      const updated = (await tablesDB.updateRow(databaseId, regTable, existing.$id, {
        status: 'registered'
      })) as EventRegistration
      await this.incrementRegistrationCount(eventId, 1)
      return updated
    }

    const payload = { eventId, userId: uid, status: 'registered' }
    const permissions = this.buildRegistrationPermissions(uid)
    const reg = (await tablesDB.createRow(databaseId, regTable, ID.unique(), payload, permissions)) as EventRegistration
    await this.incrementRegistrationCount(eventId, 1)
    return reg
  }

  async cancelRegistration(eventId: string, userId?: string) {
    const uid = userId || (await this.getAuthUserId())
    const { databaseId, regTable } = this.db

    const existing = await this.findRegistration(eventId, uid)
    if (!existing || existing.status === 'cancelled') {
      throw new Error('No active registration found')
    }

    const updated = (await tablesDB.updateRow(databaseId, regTable, existing.$id, {
      status: 'cancelled'
    })) as EventRegistration
    await this.incrementRegistrationCount(eventId, -1)
    return updated
  }

  async getEventRegistrations(eventId: string) {
    const { databaseId, regTable } = this.db
    const queries = [
      Query.equal('eventId', eventId),
      Query.equal('status', 'registered'),
      Query.orderDesc('$createdAt'),
      Query.limit(200)
    ]
    const result = await tablesDB.listRows(databaseId, regTable, queries)
    return (result?.rows || []) as EventRegistration[]
  }

  async isUserRegistered(eventId: string, userId?: string): Promise<boolean> {
    const uid = userId || (await this.getAuthUserId())
    const reg = await this.findRegistration(eventId, uid)
    return reg !== null && reg.status === 'registered'
  }

  async getUpcomingEvents(limit = 10) {
    return this.getEvents({ status: 'upcoming', limit })
  }

  private async findRegistration(eventId: string, userId: string): Promise<EventRegistration | null> {
    const { databaseId, regTable } = this.db
    const queries = [
      Query.equal('eventId', eventId),
      Query.equal('userId', userId),
      Query.limit(1)
    ]
    const result = await tablesDB.listRows(databaseId, regTable, queries)
    const rows = (result?.rows || []) as EventRegistration[]
    return rows.length > 0 ? rows[0] : null
  }

  private async incrementRegistrationCount(eventId: string, delta: number) {
    const { databaseId, eventsTable } = this.db
    try {
      const event = (await tablesDB.getRow(databaseId, eventsTable, eventId)) as CampusEvent
      const newCount = Math.max(0, (event.registrationCount || 0) + delta)
      await tablesDB.updateRow(databaseId, eventsTable, eventId, { registrationCount: newCount })
    } catch {
      // non-critical: count will be slightly off
    }
  }
}

const eventsService = new EventsService()
export default eventsService
