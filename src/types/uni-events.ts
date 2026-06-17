/**
 * uni-app 组件事件类型辅助
 *
 * 背景：vue-tsc 会按原生 HTML 元素类型（<switch>/<input>）校验 @change/@input
 * 处理函数，期望参数为标准 `Event`/`InputEvent`；而 uni-app 运行时分发的是
 * `{ detail: { value } }` 形态的事件对象。
 *
 * - <switch> 的 change 事件被 vue-tsc 当作通用 `Event`，可直接交集扩展 detail。
 * - <input> 的 input 事件被 vue-tsc 当作 `InputEvent`（其 detail 为 number），
 *   与 uni-app 的 `{ value }` 冲突，故提供 `readUniInputValue` 在运行时安全取值。
 *
 * 用法：
 *   <switch @change="onChange" />
 *   function onChange(e: UniSwitchEvent) { e.detail?.value }
 *
 *   <input @input="onInput" />
 *   function onInput(e: InputEvent) { const v = readUniInputValue(e) }
 */

/** uni-app switch 组件 change 事件（vue-tsc 当作通用 Event，可安全交集 detail） */
export type UniSwitchEvent = Event & { detail?: { value?: boolean } }

/** 从 uni-app input 事件中安全读取 detail.value（兼容 vue-tsc 的 InputEvent 校验） */
export function readUniInputValue(e: Event): string {
  const detail = (e as unknown as { detail?: { value?: unknown } }).detail
  return String(detail?.value ?? '')
}
