import type { CaptchaImageRect, EducationCaptchaPoint } from '@/types/education'

interface EventPoint {
  x: number
  y: number
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function extractEventClientPoint(event: Record<string, any> | undefined | null): EventPoint | null {
  const touch =
    event?.changedTouches?.[0] ||
    event?.touches?.[0] ||
    event?.detail?.changedTouches?.[0] ||
    event?.detail?.touches?.[0]

  const touchX = asNumber(touch?.clientX ?? touch?.pageX ?? touch?.x)
  const touchY = asNumber(touch?.clientY ?? touch?.pageY ?? touch?.y)
  if (touchX !== null && touchY !== null) {
    return { x: touchX, y: touchY }
  }

  const detailX = asNumber(event?.detail?.x ?? event?.detail?.clientX ?? event?.x ?? event?.clientX)
  const detailY = asNumber(event?.detail?.y ?? event?.detail?.clientY ?? event?.y ?? event?.clientY)
  if (detailX !== null && detailY !== null) {
    return { x: detailX, y: detailY }
  }

  return null
}

export function mapClientPointToImagePoint(
  clientPoint: EventPoint,
  rect: CaptchaImageRect,
  imageWidth: number,
  imageHeight: number,
  order: number
): EducationCaptchaPoint {
  const relativeX = clamp(clientPoint.x - rect.left, 0, rect.width)
  const relativeY = clamp(clientPoint.y - rect.top, 0, rect.height)

  return {
    x: Math.round((relativeX / rect.width) * imageWidth),
    y: Math.round((relativeY / rect.height) * imageHeight),
    order
  }
}

export function buildCaptchaImginfo(points: EducationCaptchaPoint[], imageWidth: number, imageHeight: number) {
  const sortedPoints = [...points].sort((left, right) => left.order - right.order)
  const pointText = sortedPoints.map((point) => `${point.x},${point.y}`).join('-')
  return `${pointText};${Math.round(imageWidth)};${Math.round(imageHeight)}`
}

export function getElementRect(context: object | undefined, selector: string): Promise<CaptchaImageRect | null> {
  return new Promise((resolve) => {
    try {
      const query = context ? uni.createSelectorQuery().in(context) : uni.createSelectorQuery()
      query
        .select(selector)
        .boundingClientRect((result) => {
          const rect = Array.isArray(result) ? result[0] : result
          if (!rect || typeof rect.left !== 'number' || typeof rect.top !== 'number' || typeof rect.width !== 'number' || typeof rect.height !== 'number') {
            resolve(null)
            return
          }
          resolve(rect as CaptchaImageRect)
        })
        .exec()
    } catch {
      resolve(null)
    }
  })
}
