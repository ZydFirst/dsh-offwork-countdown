/**
 * 下班倒计时 — Host 半边。
 *
 * 这个插件只在浏览器里画东西：倒计时胶囊由 `client.js` 注册到
 * `conversation.composer.dock`。Host 侧没有 Service、工具或事件，
 * 但 bundle 仍需要一行 Host 插件让它出现在插件清单里，并让
 * `dsh.client` 有归属的 loader entry。
 */
export function apply() {}
