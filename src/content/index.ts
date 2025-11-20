'use strict'

import { loadConfig } from './config'
import { unwatchChatChanges, watchChatChanges } from './danmaku/chats'
import {
  attachDanmakuContainer,
  detachDanmakuContainer,
} from './danmaku/container'
import { getLiveChatApp, relocateLiveChat } from './livechat'
import { bindHotKeys, unbindHotKeys } from './panel/hotkeys'
import {
  attachDanmakuConfigPanel,
  unwatchSettingsMenuChange,
  watchSettingsMenuChange,
} from './panel/panel'
import { unwatchPlayerChanges, watchPlayerChanges } from './player'
import {
  centerVideo,
  getVideoElement,
  unwatchVideoPausePlay,
  unwatchVideoResize,
  watchVideoPausePlay,
  watchVideoResize,
} from './video'

loadConfig()

function initializeApp() {
  getLiveChatApp((liveChatApp: HTMLElement) => {
    relocateLiveChat()

    const danmakuContainer = attachDanmakuContainer()

    watchSettingsMenuChange()
    attachDanmakuConfigPanel()
    bindHotKeys()

    const videoElement = getVideoElement()
    centerVideo(videoElement)
    watchVideoResize(videoElement)
    watchVideoPausePlay(videoElement)

    watchPlayerChanges()
    watchChatChanges(liveChatApp, danmakuContainer)
  })
}

window.addEventListener('load', () => {
  console.log('YouTube Livestream Danmaku extension loaded')
  initializeApp()
})

window.addEventListener('unload', () => {
  detachDanmakuContainer()
  unwatchChatChanges()
  unwatchVideoResize()
  unwatchVideoPausePlay(getVideoElement())

  unwatchSettingsMenuChange()
  unwatchPlayerChanges()
  unbindHotKeys()
  console.log('YouTube Livestream Danmaku extension unloaded')
})
