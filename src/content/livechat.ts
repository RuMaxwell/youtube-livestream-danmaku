import { extensionConfig } from './config'

export function getLiveChatApp(then: (liveChatApp: any) => void) {
  const startTime = Date.now()

  function inner() {
    const liveChatAppIFrame = Array.from(window.frames).find((frame) => {
      try {
        // Can fail because of cross-origin security
        return frame.document.querySelector('yt-live-chat-app')
      } catch (_) {
        return false
      }
    })
    const liveChatApp =
      liveChatAppIFrame?.document?.querySelector('yt-live-chat-app')
    if (!liveChatAppIFrame || !liveChatApp) {
      if (Date.now() - startTime > extensionConfig.getLiveAppTimeout * 1000) {
        console.log(
          `Failed to find live chat container after ${extensionConfig.getLiveAppTimeout} seconds.` +
            'If this is a livestream video, please make sure the live chat replay can be displayed.' +
            `If it actually loaded after ${extensionConfig.getLiveAppTimeout} seconds, you can adjust the timeout in the extension settings.`
        )
      } else {
        requestAnimationFrame(inner)
      }
      return
    }
    console.log('Found live chat container', liveChatApp)
    then(liveChatApp)
  }
  inner()
}

export function relocateLiveChat() {
  // Moves live chat away from the right side of the video, making the video
  // full width in theater mode.
  const ytdWatchFlexy = document.querySelector('ytd-watch-flexy')
  if (ytdWatchFlexy?.attributes?.getNamedItem('fixed-panels')) {
    ytdWatchFlexy.removeAttribute('fixed-panels')
    // Because the container of the live chat app iframe has a CSS rule that
    // selects `ytd-watch-flexy[fixed-panels]` and sets `position: fixed` and a
    // bunch of stuff to make the live chat stick to the right side of the
    // video.
  }

  // Removes the empty panel container after we moved the live chat panel away.
  const fullBleedContainerPanel = document.querySelector(
    '#panels-full-bleed-container'
  )
  fullBleedContainerPanel?.remove()
}
