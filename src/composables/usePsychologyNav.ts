/**
 * Composable for psychology sub-pages: go back to previous page or switch to psychology index.
 */

export function usePsychologyNav() {
  function goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      uni.navigateBack({ delta: 1 })
    } else {
      uni.switchTab({ url: '/pages/psychology/index' })
    }
  }
  return { goBack }
}
