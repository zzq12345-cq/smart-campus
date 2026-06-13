import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFeed, useFeedInteraction, useNavigation } from '@/composables'

describe('user flows', () => {
  beforeEach(() => {
    ;(globalThis as any).uni = {
      navigateTo: vi.fn(),
      switchTab: vi.fn(),
      showToast: vi.fn(),
      showModal: vi.fn((options: { success?: (res: { confirm: boolean; cancel: boolean }) => void }) => {
        options.success?.({ confirm: true, cancel: false })
      })
    }
  })

  it('navigates by quick access route', () => {
    const { navigateTo } = useNavigation()
    navigateTo('/pages/study/index')
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/pages/study/index'
      })
    )
  })

  it('shows toast when navigation route is empty', () => {
    const { navigateTo } = useNavigation()
    navigateTo('')
    expect((globalThis as any).uni.showToast).toHaveBeenCalled()
  })

  it('supports feed like and comment flows', () => {
    const { posts, likePost, commentOnPost } = useFeed([
      { id: 1, user: 'A', time: 'now', content: 'post', likeCount: 2, commentCount: 1, isLiked: false }
    ])

    likePost(1)
    commentOnPost(1)

    expect(posts.value[0].isLiked).toBe(true)
    expect(posts.value[0].likeCount).toBe(3)
    expect(posts.value[0].commentCount).toBe(2)
  })

  it('updates local feed card interaction state', () => {
    const { isLiked, likeCount, commentCount, toggleLike, increaseCommentCount } = useFeedInteraction({
      id: 99,
      user: 'B',
      time: 'now',
      content: 'hello',
      likeCount: 0,
      commentCount: 0,
      isLiked: false
    })

    toggleLike()
    increaseCommentCount()

    expect(isLiked.value).toBe(true)
    expect(likeCount.value).toBe(1)
    expect(commentCount.value).toBe(1)
  })
})

