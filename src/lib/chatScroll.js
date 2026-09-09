/** Pin the message list to the latest row without scrolling the page (`scrollIntoView` would). */
export function scrollChatToBottom(el) {
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}
