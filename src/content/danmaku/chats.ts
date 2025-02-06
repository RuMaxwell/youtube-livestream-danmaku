import { states } from '../states'
import { animateDanmakuElements, makeDanmakuElements } from './danmaku'
import { Chat } from './types'

let chatChangesObserver: MutationObserver | undefined

export function watchChatChanges(
  liveChatApp: HTMLElement,
  danmakuContainer: HTMLElement
) {
  unwatchChatChanges()

  // The cache of the previous incoming chats.
  let chats: Chat[] = []
  states.isFirstChange = true

  chatChangesObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        // Uses the last chat as the reference to get newer chats.
        const lastCachedChat = chats[chats.length - 1] ?? { ord: -Infinity }
        const { newer: newerChats, last: lastChat } = getChats(
          liveChatApp,
          lastCachedChat
        )
        if (newerChats.length === 0 && !lastChat) {
          continue
        }
        // Caches newer incoming chats if there are newer chats. Replaces the
        // cache with the last incoming chat when all incoming chats are older
        // than the cache. This can happen when the user seeks the video to a
        // time before the current playback position. The live chat area is
        // refreshed, so we need to refresh our cache, too. This can also happen
        // in other cases, but the solution is the same.
        chats = newerChats.length ? newerChats : [lastChat!]
        console.log('Newer chats:', newerChats)
        if (states.isFirstChange) {
          // Don't display old chats when the page is first loaded or when the
          // live chat is reloaded.
          states.isFirstChange = false
          continue
        } else {
          const newDanmakuElements = makeDanmakuElements(
            newerChats,
            danmakuContainer
          )
          danmakuContainer.append(...newDanmakuElements)
          animateDanmakuElements(newDanmakuElements)
        }
      }
    }
  })
  // This calls the handler immediately and all pre-existing chats will be
  // stored to `chats`, and `isFirstChange` will be changed to `false`.
  chatChangesObserver.observe(liveChatApp.querySelector('#items')!, {
    childList: true,
  })
}

export function unwatchChatChanges() {
  chatChangesObserver?.disconnect()
  chatChangesObserver = undefined
}

const newerChatAmountUpperLimit = 30

/**
 * Gets chats that are newer than the latest old chat.
 * @returns Newer chats (may be empty if none is newer than the given
 * `lastChatOrd`) and the last existing chat (may be `undefined` if no existing
 * chat).
 */
function getChats(
  liveChatApp: HTMLElement,
  lastCachedChat: Chat
): { newer: Chat[]; last?: Chat } {
  const chatRenderers = liveChatApp.querySelectorAll(
    '#items .yt-live-chat-item-list-renderer'
  )

  // Saves the last chat to return to the caller as the time reference if no
  // newer chat is found.
  let lastChat: Chat | undefined
  const newerChats: Chat[] = []
  let foundIdenticalChat = false
  for (const renderer of chatRenderers) {
    if (!renderer.querySelector('#timestamp')) {
      // Some items have no timestamp (e.g. system messages), no need to
      // include them.
      continue
    }
    // Known handled cases:
    // renderer.tagName.toLowerCase() === 'yt-live-chat-paid-message-renderer'
    // renderer.tagName.toLowerCase() === 'yt-live-chat-membership-item-renderer'
    // renderer.tagName.toLowerCase() === 'yt-live-chat-text-message-renderer'
    const id = renderer.id
    const ord = timestampToOrd(
      (renderer.querySelector('#timestamp')! as HTMLElement).innerText
    )
    const messageHtml = (renderer.querySelector('#message') as HTMLElement)
      ?.innerHTML
    if (!messageHtml) {
      // Some items have no message (e.g. joining subscription), no need to
      // include them.
      continue
    }
    const chat = {
      id,
      ord,
      messageHtml,
    }
    if (chat.ord < lastCachedChat.ord) {
      // Drops older chats.
      continue
    } else if (chat.ord === lastCachedChat.ord) {
      // When ord is equal, the chat is newer if it is after the id of the
      // cached chat.
      if (chat.id === lastCachedChat.id) {
        foundIdenticalChat = true
        continue
      } else if (!foundIdenticalChat) {
        continue
      }
    }
    newerChats.push(chat)
    lastChat = chat

    if (newerChats.length > newerChatAmountUpperLimit) {
      // Prevents too many new danmaku from being added at once, causing the
      // browser to hang.
      break
    }
  }

  return { newer: newerChats, last: lastChat }
}

function timestampToOrd(timestamp: string) {
  const [mins, secs] = timestamp.split(':')
  const sign = mins.startsWith('-') ? -1 : 1
  return parseInt(mins) * 60 + sign * parseInt(secs)
}
