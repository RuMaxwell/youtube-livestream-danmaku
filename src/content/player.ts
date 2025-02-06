import { unwatchChatChanges, watchChatChanges } from './danmaku/chats'
import {
  attachDanmakuContainer,
  detachDanmakuContainer,
} from './danmaku/container'
import { getLiveChatApp } from './livechat'
import {
  getVideoElement,
  unwatchVideoPausePlay,
  unwatchVideoResize,
  watchVideoPausePlay,
  watchVideoResize,
} from './video'

let playerChangesObserver: MutationObserver | undefined

export function watchPlayerChanges() {
  const playerContainer = document.querySelector('#player-container')
  if (!playerContainer) return
  playerChangesObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        if (
          mutation.removedNodes.length &&
          (mutation.removedNodes[0] as Element).tagName === 'YTD-PLAYER'
        ) {
          console.log('Player removed')
          detachDanmakuContainer()
          unwatchChatChanges()
          unwatchVideoResize()
          unwatchVideoPausePlay(getVideoElement())
        } else if (
          mutation.addedNodes.length &&
          (mutation.addedNodes[0] as Element).tagName === 'YTD-PLAYER'
        ) {
          console.log('Player added')
          getLiveChatApp((liveChatApp) => {
            const danmakuContainer = attachDanmakuContainer()
            const videoElement = getVideoElement()
            watchVideoResize(videoElement)
            watchVideoPausePlay(videoElement)
            watchChatChanges(liveChatApp, danmakuContainer)
          })
        }
      }
    }
  })
  playerChangesObserver.observe(playerContainer, { childList: true })
}

export function unwatchPlayerChanges() {
  playerChangesObserver?.disconnect()
  playerChangesObserver = undefined
}
