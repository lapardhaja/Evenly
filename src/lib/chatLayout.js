/** Instagram-style message clustering: avatar on the last incoming in a run, name on the first. */

export const CHAT_AVATAR_PX = 28;
export const CHAT_AVATAR_GAP_PX = 8;
export const CHAT_NAME_GUTTER_PX = CHAT_AVATAR_PX + CHAT_AVATAR_GAP_PX;

export function isSameSender(a, b) {
  return Boolean(a?.sender_id && b?.sender_id && a.sender_id === b.sender_id);
}

export function chatClusterMeta(messages, index, { myUserId, isGroup } = {}) {
  const m = messages?.[index];
  if (!m) {
    return {
      mine: false,
      firstInRun: true,
      lastInRun: true,
      showName: false,
      showAvatar: false,
    };
  }
  const prev = index > 0 ? messages[index - 1] : null;
  const next = index < messages.length - 1 ? messages[index + 1] : null;
  const mine = Boolean(myUserId) && m.sender_id === myUserId;
  const firstInRun = !isSameSender(prev, m);
  const lastInRun = !isSameSender(next, m);
  return {
    mine,
    firstInRun,
    lastInRun,
    showName: Boolean(isGroup) && !mine && firstInRun,
    showAvatar: !mine && lastInRun,
  };
}

/** 22px bubbles with a 4px tail on the last in a run (18px for photos). */
export function chatBubbleRadii({ mine, firstInRun, lastInRun, isMedia } = {}) {
  const r = isMedia ? 18 : 22;
  const inner = isMedia ? 8 : 10;
  const tail = 4;
  if (mine) {
    return {
      borderTopLeftRadius: r,
      borderTopRightRadius: firstInRun ? r : inner,
      borderBottomLeftRadius: r,
      borderBottomRightRadius: lastInRun ? tail : inner,
    };
  }
  return {
    borderTopLeftRadius: firstInRun ? r : inner,
    borderTopRightRadius: r,
    borderBottomLeftRadius: lastInRun ? tail : inner,
    borderBottomRightRadius: r,
  };
}
