export interface MarketItem {
  $id: string
  $createdAt: string
  $updatedAt: string
  authorId: string
  title: string
  description: string
  price: number
  condition: MarketItemCondition
  category: MarketItemCategory
  images: string[]
  status: MarketItemStatus
  contactNote: string
  viewCount: number
}

export type MarketItemCondition = 'brand_new' | 'like_new' | 'good' | 'fair'
export type MarketItemCategory = 'digital' | 'textbook' | 'daily' | 'clothing' | 'sports' | 'other'
export type MarketItemStatus = 'available' | 'reserved' | 'sold'

export interface MarketItemCreateData {
  title: string
  description: string
  price: number
  condition: MarketItemCondition
  category: MarketItemCategory
  images: string[]
  contactNote?: string
}
