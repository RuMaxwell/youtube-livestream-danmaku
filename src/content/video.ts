import { getDanmakuContainer } from './danmaku/container'
import { unwatchChatChanges, watchChatChanges } from './danmaku/chats'
import { getLiveChatApp, relocateLiveChat } from './livechat'
import { states } from './states'

export function getVideoElement() {
  return document.querySelector(
    '.html5-video-container > video'
  ) as HTMLVideoElement
}

export function centerVideo(videoElement: HTMLVideoElement) {
  videoElement.style.left = `calc((100vw - ${videoElement.style.width}) / 2)`
}

let videoResizeObserver: ResizeObserver | undefined

export function watchVideoResize(videoElement: HTMLVideoElement) {
  videoResizeObserver = new ResizeObserver(() => {
    console.log('Video resized')
    relocateLiveChat()
    getLiveChatApp((liveChatApp) => {
      unwatchChatChanges()
      states.isFirstChange = true
      watchChatChanges(liveChatApp, getDanmakuContainer())
    })
    window.dispatchEvent(new Event('resize')) // Makes the video place itself correctly
  })
  videoResizeObserver.observe(videoElement)
}

export function unwatchVideoResize() {
  videoResizeObserver?.disconnect()
  videoResizeObserver = undefined
}

export function watchVideoPausePlay(videoElement: HTMLVideoElement) {
  videoElement.addEventListener('pause', onVideoPause)
  videoElement.addEventListener('play', onVideoPlay)
}

export function unwatchVideoPausePlay(videoElement: HTMLVideoElement) {
  videoElement?.removeEventListener('pause', onVideoPause)
  videoElement?.removeEventListener('play', onVideoPlay)
}

export function onVideoPause() {
  console.log('Video paused')
  states.videoPaused = true
}

export function onVideoPlay() {
  console.log('Video played')
  states.videoPaused = false
}
