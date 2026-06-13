import { describe, expect, it } from 'vitest'
import {
  extractEventClientPoint,
  mapClientPointToImagePoint,
  buildCaptchaImginfo
} from '@/utils/education-captcha'
import type { CaptchaImageRect } from '@/types/education'

describe('education-captcha', () => {
  describe('extractEventClientPoint', () => {
    it('extracts point from detail.x/detail.y', () => {
      const event = {
        detail: {
          x: 100,
          y: 200
        }
      }
      const result = extractEventClientPoint(event)
      expect(result).toEqual({ x: 100, y: 200 })
    })

    it('extracts point from changedTouches', () => {
      const event = {
        changedTouches: [
          {
            clientX: 150,
            clientY: 250
          }
        ]
      }
      const result = extractEventClientPoint(event)
      expect(result).toEqual({ x: 150, y: 250 })
    })

    it('returns null for invalid event', () => {
      const result = extractEventClientPoint(null)
      expect(result).toBeNull()
    })
  })

  describe('mapClientPointToImagePoint', () => {
    const rect: CaptchaImageRect = {
      left: 50,
      top: 100,
      width: 300,
      height: 200
    }
    const imageWidth = 350
    const imageHeight = 200

    it('maps client coordinates to image coordinates', () => {
      const clientPoint = { x: 200, y: 200 } // 中心点
      const result = mapClientPointToImagePoint(clientPoint, rect, imageWidth, imageHeight, 1)

      expect(result.x).toBe(175) // (200 - 50) / 300 * 350 = 175
      expect(result.y).toBe(100) // (200 - 100) / 200 * 200 = 100
      expect(result.order).toBe(1)
    })

    it('handles points at rect boundaries', () => {
      const topLeft = { x: 50, y: 100 }
      const result = mapClientPointToImagePoint(topLeft, rect, imageWidth, imageHeight, 1)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })
  })

  describe('buildCaptchaImginfo', () => {
    it('builds imginfo string from points', () => {
      const points = [
        { x: 100, y: 50, order: 1 },
        { x: 200, y: 80, order: 2 }
      ]
      const imageWidth = 350
      const imageHeight = 200

      const result = buildCaptchaImginfo(points, imageWidth, imageHeight)
      expect(result).toBe('100,50-200,80;350;200')
    })

    it('sorts points by order', () => {
      const points = [
        { x: 200, y: 80, order: 2 },
        { x: 100, y: 50, order: 1 }
      ]
      const imageWidth = 350
      const imageHeight = 200

      const result = buildCaptchaImginfo(points, imageWidth, imageHeight)
      expect(result).toBe('100,50-200,80;350;200')
    })
  })
})
