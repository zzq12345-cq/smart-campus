import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FeedCard from '@/components/common/FeedCard.vue'

const basePost = {
  id: 1,
  user: '匿名松鼠',
  time: '2h ago',
  tags: ['心理', '学习'],
  content: '最近准备考试有点焦虑，大家都怎么缓解压力？',
  likeCount: 10,
  commentCount: 2,
  isLiked: false
}

function mountComponent(post = basePost) {
  return mount(FeedCard, {
    props: {
      post
    },
    global: {
      stubs: {
        Icon: {
          props: ['name', 'size', 'color'],
          template: '<i class="icon-stub" :data-name="name" :data-color="color"></i>'
        },
        'uni-tag': {
          props: ['text'],
          template: '<span class="tag-stub">{{ text }}</span>'
        }
      }
    }
  })
}

describe('FeedCard', () => {
  beforeEach(() => {
    ;(globalThis as any).uni = {
      navigateTo: vi.fn(),
      showToast: vi.fn()
    }
  })

  it('renders post content and tags', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('匿名松鼠')
    expect(wrapper.text()).toContain('最近准备考试有点焦虑')
    expect(wrapper.findAll('.tag-stub')).toHaveLength(2)
  })

  it('falls back to icon when avatar is missing', () => {
    const wrapper = mountComponent({ ...basePost, avatar: '' })
    expect(wrapper.find('.avatar-image').exists()).toBe(false)
    expect(wrapper.find('.icon-stub').attributes('data-name')).toBe('person')
  })

  it('toggles like state and updates like count', async () => {
    const wrapper = mountComponent()
    const likeAction = wrapper.findAll('.action-item')[0]
    await likeAction.trigger('tap')

    expect(wrapper.text()).toContain('11')
    expect(wrapper.find('.action-count.liked').exists()).toBe(true)
    expect(wrapper.emitted('like')?.[0]).toEqual([1])
  })

  it('increments comment count and navigates to comment page', async () => {
    const wrapper = mountComponent()
    const commentAction = wrapper.findAll('.action-item')[1]
    await commentAction.trigger('tap')

    expect(wrapper.text()).toContain('3')
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/pages/common/post-comment?id=1'
      })
    )
  })

  it('navigates to post detail when tapping card', async () => {
    const wrapper = mountComponent()
    await wrapper.find('.feed-card').trigger('tap')

    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/pages/common/post-detail?id=1'
      })
    )
    expect(wrapper.emitted('tap')?.[0]).toEqual([1])
  })
})

