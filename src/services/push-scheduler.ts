import type { CreateNotificationInput, PushNotificationType } from '@/types/notification'
import type { EducationScheduleCourse } from '@/types/education'
import authService from '@/services/auth'
import notificationsService from '@/services/notifications'
import educationScheduleCacheService from '@/services/education-schedule-cache'
import studyCheckinsService from '@/services/study-checkins'

/**
 * Slot time mapping for course schedule
 * Maps slot numbers to actual start/end times
 */
interface SlotTimeMeta {
  slot: number
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

/**
 * PushSchedulerService - Robot push notification scheduler
 *
 * Schedules various push notifications at app startup:
 * - Course reminders
 * - Checkin reminders
 * - Order status updates
 * - Follower post notifications
 */
class PushSchedulerService {
  // Reminder time constants
  private readonly COURSE_REMINDER_MINUTES_BEFORE = 30
  private readonly CHECKIN_REMINDER_HOUR = 20 // 20:00
  private readonly MAX_FOLLOWER_NOTIFICATIONS = 100

  /**
   * Accurate slot time mapping based on official schedule
   * Source: src/pages/study/schedule.vue COURSE_SLOT_TIMES
   */
  private readonly SLOT_TIME_MAP: Map<number, SlotTimeMeta> = new Map([
    [1, { slot: 1, startHour: 8, startMinute: 0, endHour: 8, endMinute: 45 }],
    [2, { slot: 2, startHour: 8, startMinute: 55, endHour: 9, endMinute: 40 }],
    [3, { slot: 3, startHour: 10, startMinute: 0, endHour: 10, endMinute: 45 }],
    [4, { slot: 4, startHour: 10, startMinute: 55, endHour: 11, endMinute: 40 }],
    [11, { slot: 11, startHour: 12, startMinute: 30, endHour: 13, endMinute: 15 }],
    [12, { slot: 12, startHour: 13, startMinute: 25, endHour: 14, endMinute: 10 }],
    [5, { slot: 5, startHour: 14, startMinute: 30, endHour: 15, endMinute: 15 }],
    [6, { slot: 6, startHour: 15, startMinute: 25, endHour: 16, endMinute: 10 }],
    [7, { slot: 7, startHour: 16, startMinute: 30, endHour: 17, endMinute: 15 }],
    [8, { slot: 8, startHour: 17, startMinute: 25, endHour: 18, endMinute: 10 }],
    [9, { slot: 9, startHour: 19, startMinute: 30, endHour: 20, endMinute: 15 }],
    [10, { slot: 10, startHour: 20, startMinute: 25, endHour: 21, endMinute: 10 }]
  ])

  /**
   * Get current authenticated user ID
   */
  private async getAuthUserId(): Promise<string | null> {
    try {
      const user = await authService.getCurrentUser()
      return user?.$id || null
    } catch {
      return null
    }
  }

  /**
   * Get start time in minutes from midnight for a given slot
   * Returns null if slot is not recognized
   */
  private getSlotStartMinutes(slot: number): number | null {
    const slotMeta = this.SLOT_TIME_MAP.get(slot)
    if (!slotMeta) return null
    return slotMeta.startHour * 60 + slotMeta.startMinute
  }

  /**
   * Get formatted time string for a slot (e.g., "08:00")
   */
  private getSlotTimeString(slot: number): string {
    const slotMeta = this.SLOT_TIME_MAP.get(slot)
    if (!slotMeta) return ''
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(slotMeta.startHour)}:${pad(slotMeta.startMinute)}`
  }

  /**
   * Calculate current week number based on semester start date
   * Returns 0 if unable to determine
   */
  private calculateCurrentWeek(startDate: string): number {
    try {
      const start = new Date(startDate)
      const now = new Date()
      const diffTime = now.getTime() - start.getTime()
      const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000))
      return Math.floor(diffDays / 7) + 1
    } catch {
      return 0
    }
  }

  /**
   * Check if a course is valid for reminder (has all required fields)
   */
  private isValidCourseForReminder(course: EducationScheduleCourse): boolean {
    return (
      course.day > 0 &&
      course.startSlot > 0 &&
      course.endSlot >= course.startSlot &&
      Array.isArray(course.weeks) &&
      course.weeks.length > 0 &&
      !!course.name?.trim()
    )
  }

  /**
   * Schedule course reminders based on education schedule cache
   * Triggers notifications for courses starting within 30 minutes
   */
  async scheduleCourseReminders(): Promise<void> {
    const userId = await this.getAuthUserId()
    if (!userId) return

    try {
      const snapshot = await educationScheduleCacheService.getSnapshot(userId)
      if (!snapshot) return

      // Collect all courses from all semester schedules
      const allCourses: EducationScheduleCourse[] = []
      for (const semesterId of Object.keys(snapshot.semesterSchedules)) {
        const schedule = snapshot.semesterSchedules[semesterId]
        if (schedule?.courses?.length) {
          allCourses.push(...schedule.courses)
        }
      }

      if (!allCourses.length) return

      const now = new Date()
      const currentDay = now.getDay() || 7 // Convert Sunday from 0 to 7
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      // Get current week number from the latest semester
      const latestSemester = snapshot.semesters?.[0]
      const currentWeek = latestSemester?.startDate
        ? this.calculateCurrentWeek(latestSemester.startDate)
        : 0

      // Filter courses starting soon (within reminder window)
      const upcomingCourses = allCourses.filter((course) => {
        // Validate course data
        if (!this.isValidCourseForReminder(course)) return false

        // Check if course is today
        if (course.day !== currentDay) return false

        // Check if course weeks include current week (if week is calculable)
        if (currentWeek > 0 && !course.weeks.includes(currentWeek)) return false

        // Get accurate course start time from slot mapping
        const courseStartMinutes = this.getSlotStartMinutes(course.startSlot)
        if (courseStartMinutes === null) return false

        const minutesUntilCourse = courseStartMinutes - currentMinutes

        // Remind if course starts within the reminder window
        return minutesUntilCourse > 0 && minutesUntilCourse <= this.COURSE_REMINDER_MINUTES_BEFORE
      })

      // Create notifications for each upcoming course
      for (const course of upcomingCourses) {
        const slotTime = this.getSlotTimeString(course.startSlot)
        const input: CreateNotificationInput = {
          recipientId: userId,
          actorId: 'system',
          type: 'course_reminder' as PushNotificationType,
          targetType: 'user',
          targetId: userId,
          preview: `${course.name} 即将开始，请提前前往 ${course.location || '教室'}${slotTime ? ` (${slotTime})` : ''}`,
          groupKey: `course_reminder:${course.name}:${now.toDateString()}`,
          metadata: {
            courseName: course.name,
            location: course.location,
            startSlot: course.startSlot,
            endSlot: course.endSlot,
            teacher: course.teacher
          }
        }

        await notificationsService.createNotification(input).catch(() => {
          // Silent error handling - don't interrupt user
        })
      }
    } catch (error) {
      // Silent error handling
      console.warn('PushScheduler: Failed to schedule course reminders', error)
    }
  }

  /**
   * Schedule checkin reminders for users who haven't checked in today
   * Triggers at configured hour (default 20:00)
   */
  async scheduleCheckinReminders(): Promise<void> {
    const userId = await this.getAuthUserId()
    if (!userId) return

    try {
      const now = new Date()
      const currentHour = now.getHours()

      // Only remind during evening hours (after CHECKIN_REMINDER_HOUR)
      if (currentHour < this.CHECKIN_REMINDER_HOUR) return

      // Check if already checked in today
      const today = now.toISOString().split('T')[0]
      const checkins = await studyCheckinsService.getMyCheckins({
        startDate: today,
        endDate: today,
        limit: 1
      })

      if (checkins?.length) return // Already checked in

      // Get streak days for context
      const streakDays = await studyCheckinsService.getStreakDays().catch(() => 0)

      const input: CreateNotificationInput = {
        recipientId: userId,
        actorId: 'system',
        type: 'checkin_reminder' as PushNotificationType,
        targetType: 'user',
        targetId: userId,
        preview: streakDays > 0
          ? `今日尚未打卡，已连续打卡 ${streakDays} 天，继续保持！`
          : '今日尚未打卡，快来完成今日学习任务吧！',
        groupKey: `checkin_reminder:${today}`,
        metadata: {
          streakDays
        }
      }

      await notificationsService.createNotification(input).catch(() => {
        // Silent error handling
      })
    } catch (error) {
      console.warn('PushScheduler: Failed to schedule checkin reminders', error)
    }
  }

  /**
   * Schedule order status change notifications
   * Called when market item status changes
   */
  async scheduleOrderStatusReminders(
    orderId: string,
    recipientId: string,
    orderStatus: string,
    itemName: string
  ): Promise<void> {
    try {
      const input: CreateNotificationInput = {
        recipientId,
        actorId: 'system',
        type: 'order_status' as PushNotificationType,
        targetType: 'post',
        targetId: orderId,
        preview: `「${itemName}」订单状态已更新为：${orderStatus}`,
        groupKey: `order_status:${orderId}`,
        metadata: {
          orderId,
          orderStatus
        }
      }

      await notificationsService.createNotification(input).catch(() => {
        // Silent error handling
      })
    } catch (error) {
      console.warn('PushScheduler: Failed to schedule order status reminder', error)
    }
  }

  /**
   * Schedule follower notifications when user creates a post
   * Notifies all followers (up to MAX_FOLLOWER_NOTIFICATIONS)
   */
  async scheduleFollowerNotifications(
    postId: string,
    authorId: string,
    postPreview: string,
    followerIds: string[]
  ): Promise<void> {
    if (!followerIds?.length) return

    try {
      // Limit notifications to prevent abuse
      const limitedFollowers = followerIds.slice(0, this.MAX_FOLLOWER_NOTIFICATIONS)

      // Create notification for each follower
      const notifications = limitedFollowers.map((followerId) => {
        const input: CreateNotificationInput = {
          recipientId: followerId,
          actorId: authorId,
          type: 'ai_message' as PushNotificationType, // Using ai_message for follower posts
          targetType: 'post',
          targetId: postId,
          preview: `关注的人发布了新动态：${postPreview}`.slice(0, 200),
          groupKey: `follower_post:${postId}:${followerId}`
        }
        return notificationsService.createNotification(input).catch(() => {
          // Silent error handling for individual notifications
        })
      })

      await Promise.allSettled(notifications)
    } catch (error) {
      console.warn('PushScheduler: Failed to schedule follower notifications', error)
    }
  }

  /**
   * Run all scheduled checks at app startup
   * Uses Promise.allSettled to ensure all checks run independently
   */
  async runAllChecks(): Promise<void> {
    console.log('PushScheduler: Running all scheduled checks...')

    const results = await Promise.allSettled([
      this.scheduleCourseReminders(),
      this.scheduleCheckinReminders()
      // Note: scheduleOrderStatusReminders and scheduleFollowerNotifications
      // are called directly from their respective services when events occur
    ])

    // Log results for debugging (optional)
    const fulfilled = results.filter((r) => r.status === 'fulfilled').length
    const rejected = results.filter((r) => r.status === 'rejected').length
    console.log(`PushScheduler: Completed ${fulfilled} checks, ${rejected} failed`)

    return
  }
}

// Export singleton instance
const pushSchedulerService = new PushSchedulerService()
export default pushSchedulerService
