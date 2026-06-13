/**
 * Knowledge Base Service
 * Provides contextual knowledge for AI chat interactions
 * Searches across multiple database tables to build knowledge context
 */

import { Query } from 'appwrite'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import {
  MINDGUARD_DATABASE_ID,
  UNISMART_DATABASE_ID,
  POSTS_TABLE_ID,
  STUDY_MATERIALS_TABLE_ID,
  EVENTS_TABLE_ID,
  MARKET_ITEMS_TABLE_ID
} from '@/utils/appwrite-shared'

export interface KnowledgeEntry {
  id: string
  type: 'post' | 'study_material' | 'event' | 'market_item'
  title?: string
  content: string
  category: string
  tags?: string[]
  source: string
  createdAt: string
}

export interface KnowledgeSearchOptions {
  query: string
  limit?: number
  categories?: string[]
}

export interface KnowledgeCategoryOptions {
  category: string
  limit?: number
}

type CacheEntry = {
  data: KnowledgeEntry[]
  timestamp: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

class KnowledgeBaseService {
  private cache: Map<string, CacheEntry> = new Map()

  private getCached(key: string): KnowledgeEntry[] | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }

  private setCache(key: string, data: KnowledgeEntry[]): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  private cleanString(value: unknown, maxLength?: number): string {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim()
    if (!normalized) return ''
    return typeof maxLength === 'number' ? normalized.slice(0, maxLength) : normalized
  }

  /**
   * Search knowledge base by keywords
   * Searches across posts, study materials, events, and market items
   */
  async searchKnowledge(options: KnowledgeSearchOptions): Promise<KnowledgeEntry[]> {
    const { query, limit = 10, categories } = options
    const normalizedQuery = this.cleanString(query, 100).toLowerCase()
    if (!normalizedQuery) return []

    const cacheKey = `search:${normalizedQuery}:${limit}:${categories?.join(',') || 'all'}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    const results: KnowledgeEntry[] = []
    const searchPromises: Promise<KnowledgeEntry[]>[] = []

    // Search posts (if category matches or no category filter)
    if (!categories || categories.includes('psychology') || categories.includes('life') || categories.includes('study')) {
      searchPromises.push(this.searchPosts(normalizedQuery, limit))
    }

    // Search study materials
    if (!categories || categories.includes('study')) {
      searchPromises.push(this.searchStudyMaterials(normalizedQuery, limit))
    }

    // Search events
    if (!categories || categories.includes('life') || categories.includes('activity')) {
      searchPromises.push(this.searchEvents(normalizedQuery, limit))
    }

    // Search market items
    if (!categories || categories.includes('market')) {
      searchPromises.push(this.searchMarketItems(normalizedQuery, limit))
    }

    const allResults = await Promise.allSettled(searchPromises)
    allResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value)
      }
    })

    // Sort by relevance (simple keyword match count) and limit
    const sorted = results
      .map((entry) => ({
        entry,
        score: this.calculateRelevanceScore(entry, normalizedQuery)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.entry)

    this.setCache(cacheKey, sorted)
    return sorted
  }

  /**
   * Get knowledge entries by category
   */
  async getKnowledgeByCategory(options: KnowledgeCategoryOptions): Promise<KnowledgeEntry[]> {
    const { category, limit = 10 } = options
    const normalizedCategory = this.cleanString(category, 50).toLowerCase()
    if (!normalizedCategory) return []

    const cacheKey = `category:${normalizedCategory}:${limit}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    const results: KnowledgeEntry[] = []

    switch (normalizedCategory) {
      case 'psychology':
      case 'mental-health':
        results.push(...(await this.getPostsBySection('psychology', limit)))
        break
      case 'study':
      case 'academic':
        results.push(...(await this.getPostsBySection('study', limit)))
        results.push(...(await this.getStudyMaterials(limit)))
        break
      case 'life':
      case 'campus':
        results.push(...(await this.getPostsBySection('life', limit)))
        results.push(...(await this.getUpcomingEvents(limit)))
        break
      case 'career':
      case 'job':
        results.push(...(await this.getJobRelatedContent(limit)))
        break
      default:
        // Generic search for unknown categories
        results.push(...(await this.searchPosts(normalizedCategory, limit)))
    }

    const limited = results.slice(0, limit)
    this.setCache(cacheKey, limited)
    return limited
  }

  /**
   * Build context string for AI chat from knowledge entries
   */
  buildContextFromEntries(entries: KnowledgeEntry[], maxLength = 2000): string {
    if (!entries.length) return ''

    const parts: string[] = ['Relevant knowledge from the community:']

    let currentLength = parts[0].length
    for (const entry of entries) {
      const entryText = `\n\n[${entry.type}] ${entry.title || entry.category}:\n${entry.content.slice(0, 300)}`
      if (currentLength + entryText.length > maxLength) break
      parts.push(entryText)
      currentLength += entryText.length
    }

    return parts.join('')
  }

  private calculateRelevanceScore(entry: KnowledgeEntry, query: string): number {
    const text = `${entry.title || ''} ${entry.content} ${entry.category}`.toLowerCase()
    const queryWords = query.split(/\s+/).filter(Boolean)
    let score = 0
    for (const word of queryWords) {
      const matches = (text.match(new RegExp(word, 'g')) || []).length
      score += matches
    }
    return score
  }

  private async searchPosts(query: string, limit: number): Promise<KnowledgeEntry[]> {
    try {
      const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, [
        Query.search('content', query),
        Query.equal('status', 'published'),
        Query.orderDesc('$createdAt'),
        Query.limit(limit)
      ])

      return (result?.rows || []).map((row: Record<string, unknown>) => ({
        id: row.$id as string,
        type: 'post' as const,
        content: this.cleanString(row.content, 500),
        category: this.cleanString(row.section, 50) || 'general',
        source: 'community_posts',
        createdAt: row.$createdAt as string
      }))
    } catch {
      return []
    }
  }

  private async searchStudyMaterials(query: string, limit: number): Promise<KnowledgeEntry[]> {
    try {
      const result = await tablesDB.listRows(UNISMART_DATABASE_ID, STUDY_MATERIALS_TABLE_ID, [
        Query.search('title', query),
        Query.orderDesc('$createdAt'),
        Query.limit(limit)
      ])

      return (result?.rows || []).map((row: Record<string, unknown>) => ({
        id: row.$id as string,
        type: 'study_material' as const,
        title: this.cleanString(row.title, 100),
        content: this.cleanString(row.description || row.title, 500),
        category: 'study',
        source: 'study_materials',
        createdAt: row.$createdAt as string
      }))
    } catch {
      return []
    }
  }

  private async searchEvents(query: string, limit: number): Promise<KnowledgeEntry[]> {
    try {
      const result = await tablesDB.listRows(UNISMART_DATABASE_ID, EVENTS_TABLE_ID, [
        Query.search('title', query),
        Query.orderDesc('$createdAt'),
        Query.limit(limit)
      ])

      return (result?.rows || []).map((row: Record<string, unknown>) => ({
        id: row.$id as string,
        type: 'event' as const,
        title: this.cleanString(row.title, 100),
        content: this.cleanString(row.description || row.title, 500),
        category: 'activity',
        source: 'campus_events',
        createdAt: row.$createdAt as string
      }))
    } catch {
      return []
    }
  }

  private async searchMarketItems(query: string, limit: number): Promise<KnowledgeEntry[]> {
    try {
      const result = await tablesDB.listRows(UNISMART_DATABASE_ID, MARKET_ITEMS_TABLE_ID, [
        Query.search('title', query),
        Query.equal('status', 'available'),
        Query.orderDesc('$createdAt'),
        Query.limit(limit)
      ])

      return (result?.rows || []).map((row: Record<string, unknown>) => ({
        id: row.$id as string,
        type: 'market_item' as const,
        title: this.cleanString(row.title, 100),
        content: this.cleanString(row.description || row.title, 500),
        category: 'market',
        source: 'secondhand_market',
        createdAt: row.$createdAt as string
      }))
    } catch {
      return []
    }
  }

  private async getPostsBySection(section: string, limit: number): Promise<KnowledgeEntry[]> {
    try {
      const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, [
        Query.equal('section', section),
        Query.equal('status', 'published'),
        Query.orderDesc('$createdAt'),
        Query.limit(limit)
      ])

      return (result?.rows || []).map((row: Record<string, unknown>) => ({
        id: row.$id as string,
        type: 'post' as const,
        content: this.cleanString(row.content, 500),
        category: section,
        source: 'community_posts',
        createdAt: row.$createdAt as string
      }))
    } catch {
      return []
    }
  }

  private async getStudyMaterials(limit: number): Promise<KnowledgeEntry[]> {
    try {
      const result = await tablesDB.listRows(UNISMART_DATABASE_ID, STUDY_MATERIALS_TABLE_ID, [
        Query.orderDesc('$createdAt'),
        Query.limit(limit)
      ])

      return (result?.rows || []).map((row: Record<string, unknown>) => ({
        id: row.$id as string,
        type: 'study_material' as const,
        title: this.cleanString(row.title, 100),
        content: this.cleanString(row.description || row.title, 500),
        category: 'study',
        source: 'study_materials',
        createdAt: row.$createdAt as string
      }))
    } catch {
      return []
    }
  }

  private async getUpcomingEvents(limit: number): Promise<KnowledgeEntry[]> {
    try {
      const now = new Date().toISOString()
      const result = await tablesDB.listRows(UNISMART_DATABASE_ID, EVENTS_TABLE_ID, [
        Query.greaterThanEqual('startTime', now),
        Query.orderAsc('startTime'),
        Query.limit(limit)
      ])

      return (result?.rows || []).map((row: Record<string, unknown>) => ({
        id: row.$id as string,
        type: 'event' as const,
        title: this.cleanString(row.title, 100),
        content: this.cleanString(row.description || row.title, 500),
        category: 'activity',
        source: 'campus_events',
        createdAt: row.$createdAt as string
      }))
    } catch {
      return []
    }
  }

  private async getJobRelatedContent(limit: number): Promise<KnowledgeEntry[]> {
    // For now, search for job-related posts
    return this.searchPosts('job career internship', limit)
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
  }
}

const knowledgeBaseService = new KnowledgeBaseService()
export default knowledgeBaseService
