import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import type {
  Venue,
  VenueCategory,
  VenueCreateData,
  VenueReservation,
  ReservationCreateData
} from '@/types/venue'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import {
  MINDGUARD_DATABASE_ID,
  VENUES_TABLE_ID,
  VENUE_RESERVATIONS_TABLE_ID
} from '@/utils/appwrite-shared'

class VenuesService {
  private get db() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      venuesTable: VENUES_TABLE_ID,
      reservationsTable: VENUE_RESERVATIONS_TABLE_ID
    }
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

  private buildPermissions(authorId: string) {
    return [
      Permission.read(Role.users()),
      Permission.update(Role.user(authorId)),
      Permission.delete(Role.user(authorId))
    ]
  }

  private buildReservationPermissions(userId: string) {
    return [
      Permission.read(Role.users()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId))
    ]
  }

  async createVenue(data: VenueCreateData, userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, venuesTable } = this.db

    const payload: Record<string, unknown> = {
      authorId,
      name: data.name,
      location: data.location,
      description: data.description || '',
      category: data.category,
      capacity: data.capacity ?? 0,
      openTime: data.openTime || '',
      equipment: data.equipment || '',
      coverImage: data.coverImage || '',
      status: 'available'
    }

    const permissions = this.buildPermissions(authorId)
    return (await tablesDB.createRow(databaseId, venuesTable, ID.unique(), payload, permissions)) as Venue
  }

  async getVenues(opts?: { category?: VenueCategory; limit?: number }) {
    const { databaseId, venuesTable } = this.db
    const queries: string[] = [
      Query.orderDesc('$createdAt'),
      Query.limit(opts?.limit ?? 50)
    ]
    if (opts?.category) {
      queries.push(Query.equal('category', opts.category))
    }
    const result = await tablesDB.listRows(databaseId, venuesTable, queries)
    return (result?.rows || []) as Venue[]
  }

  async getVenue(id: string) {
    const { databaseId, venuesTable } = this.db
    return (await tablesDB.getRow(databaseId, venuesTable, id)) as Venue
  }

  async deleteVenue(id: string) {
    const { databaseId, venuesTable } = this.db
    await tablesDB.deleteRow(databaseId, venuesTable, id)
    return true
  }

  async createReservation(data: ReservationCreateData, userId?: string) {
    const uid = userId || (await this.getAuthUserId())
    const { databaseId, reservationsTable } = this.db

    const payload: Record<string, unknown> = {
      venueId: data.venueId,
      userId: uid,
      startTime: data.startTime,
      endTime: data.endTime,
      purpose: data.purpose || '',
      status: 'confirmed'
    }

    const permissions = this.buildReservationPermissions(uid)
    return (await tablesDB.createRow(databaseId, reservationsTable, ID.unique(), payload, permissions)) as VenueReservation
  }

  async getReservationsForVenue(venueId: string, date?: string) {
    const { databaseId, reservationsTable } = this.db
    const queries: string[] = [
      Query.equal('venueId', venueId),
      Query.orderAsc('startTime'),
      Query.limit(100)
    ]
    if (date) {
      const start = new Date(`${date}T00:00:00`).toISOString()
      const end = new Date(`${date}T23:59:59`).toISOString()
      queries.push(Query.greaterThanEqual('startTime', start))
      queries.push(Query.lessThanEqual('startTime', end))
    }
    const result = await tablesDB.listRows(databaseId, reservationsTable, queries)
    return (result?.rows || []) as VenueReservation[]
  }

  async getMyReservations(userId?: string) {
    const uid = userId || (await this.getAuthUserId())
    const { databaseId, reservationsTable } = this.db
    const queries = [
      Query.equal('userId', uid),
      Query.orderDesc('startTime'),
      Query.limit(100)
    ]
    const result = await tablesDB.listRows(databaseId, reservationsTable, queries)
    return (result?.rows || []) as VenueReservation[]
  }

  async cancelReservation(id: string) {
    const { databaseId, reservationsTable } = this.db
    return (await tablesDB.updateRow(databaseId, reservationsTable, id, { status: 'cancelled' })) as VenueReservation
  }
}

const venuesService = new VenuesService()
export default venuesService
