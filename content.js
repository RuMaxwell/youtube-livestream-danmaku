function initializeApp() {
  getLiveChatApp((liveChatApp) => {
    relocateLiveChat()

    const danmakuContainer = attachDanmakuContainer()

    const videoElement = getVideoElement()
    watchVideoResize(videoElement)
    watchVideoPausePlay(videoElement)

    watchPlayerChanges()
    watchChatChanges(liveChatApp, danmakuContainer)
  })
}

function getLiveChatApp(then) {
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
      if (Date.now() - startTime > 10000) {
        console.warn('Failed to find live chat container after 10 seconds')
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

let playerChangesObserver

function watchPlayerChanges() {
  const playerContainer = document.querySelector('#player-container')
  playerChangesObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        if (
          mutation.removedNodes.length &&
          mutation.removedNodes[0].tagName === 'YTD-PLAYER'
        ) {
          console.log('Player removed')
          detachDanmakuContainer()
          unwatchChatChanges()
          unwatchVideoResize()
          unwatchVideoPausePlay()
        } else if (
          mutation.addedNodes.length &&
          mutation.addedNodes[0].tagName === 'YTD-PLAYER'
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

function unwatchPlayerChanges() {
  playerChangesObserver?.disconnect()
  playerChangesObserver = undefined
}

function relocateLiveChat() {
  // Moves live chat away from the right side of the video, making the video
  // full width in theater mode.
  const ytdWatchFlexy = document.querySelector('ytd-watch-flexy')
  if (ytdWatchFlexy?.attributes['fixed-panels']) {
    ytdWatchFlexy.removeAttribute('fixed-panels')
    // Because the container of the live chat app iframe has a CSS rule that
    // selects `ytd-watch-flexy[fixed-panels]` and sets `position: fixed` and a
    // bunch of stuff to make the live chat stick to the right side of the
    // video.
  }
}

const danmakuContainerId = 'danmaku-container'

function attachDanmakuContainer() {
  console.log('Attaching danmaku container')
  const playerContainer = document.querySelector('#player-container') //?.querySelector('.ytp-player-content')
  const danmakuContainer = document.createElement('div')
  danmakuContainer.id = danmakuContainerId
  danmakuContainer.style.position = 'absolute'
  danmakuContainer.style.top = '0'
  danmakuContainer.style.left = '0'
  danmakuContainer.style.width = '100%'
  danmakuContainer.style.height = '100%'
  danmakuContainer.style.overflow = 'hidden'
  danmakuContainer.style.pointerEvents = 'none'
  danmakuContainer.style.zIndex = '2'
  playerContainer.appendChild(danmakuContainer)
  return danmakuContainer
}

function getDanmakuContainer() {
  return document.querySelector(`#${danmakuContainerId}`)
}

function detachDanmakuContainer() {
  console.log('Detaching danmaku container')
  getDanmakuContainer()?.remove()
}

function getVideoElement() {
  return document.querySelector('.html5-video-container > video')
}

let videoResizeObserver

function watchVideoResize(videoElement) {
  videoResizeObserver = new ResizeObserver(() => {
    console.log('Video resized')
    relocateLiveChat()
    getLiveChatApp((liveChatApp) => {
      unwatchChatChanges()
      watchChatChanges(liveChatApp, getDanmakuContainer())
    })
    window.dispatchEvent(new Event('resize')) // Makes the video place itself correctly
  })
  videoResizeObserver.observe(videoElement)
}

function unwatchVideoResize() {
  videoResizeObserver?.disconnect()
  videoResizeObserver = undefined
}

let videoPaused = false

function watchVideoPausePlay(videoElement) {
  videoElement.addEventListener('pause', onVideoPause)
  videoElement.addEventListener('play', onVideoPlay)
}

function unwatchVideoPausePlay(videoElement) {
  videoElement?.removeEventListener('pause', onVideoPause)
  videoElement?.removeEventListener('play', onVideoPlay)
}

function onVideoPause() {
  console.log('Video paused')
  videoPaused = true
}

function onVideoPlay() {
  console.log('Video played')
  videoPaused = false
}

let isFirstChange = true
let chatChangesObserver

function watchChatChanges(liveChatApp, danmakuContainer) {
  // The cache of the previous incoming chats.
  let chats = []
  isFirstChange = true

  chatChangesObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        // Uses the last chat as the reference to get newer chats.
        const lastChatOrd = chats[chats.length - 1]?.ord ?? -Infinity
        const { newer: newerChats, last: lastChat } = getChats(
          liveChatApp,
          lastChatOrd
        )
        // Caches newer incoming chats if there are newer chats. Replaces the
        // cache with the last incoming chat when all incoming chats are older
        // than the cache. This can happen when the user seeks the video to a
        // time before the current playback position. The live chat area is
        // refreshed, so we need to refresh our cache, too. This can also happen
        // in other cases, but the solution is the same.
        chats = newerChats.length ? newerChats : [lastChat]
        console.log('Newer chats:', newerChats)
        if (isFirstChange) {
          // Don't display old chats when the page is first loaded or when the
          // live chat is reloaded.
          isFirstChange = false
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
  chatChangesObserver.observe(liveChatApp.querySelector('#items'), {
    childList: true,
  })
}

function unwatchChatChanges() {
  chatChangesObserver?.disconnect()
  chatChangesObserver = undefined
}

/**
 * Gets chats that are newer than the latest old chat.
 * @returns {{ newer: any[]; last?: any }} Newer chats (may be empty if none is
 * newer than the given `lastChatOrd`) and the last existing chat (may be
 * `undefined` if no existing chat).
 */
function getChats(liveChatApp, latestChatOrd) {
  const chatRenderers = liveChatApp.querySelectorAll(
    'yt-live-chat-text-message-renderer'
  )
  let lastChat
  const chats = Array.from(
    chatRenderers
      .values()
      .map((renderer) => {
        lastChat = {
          ord: timestampToOrd(renderer.querySelector('#timestamp').innerText),
          message: renderer.querySelector('#message').innerText,
          messageHtml: renderer.querySelector('#message').innerHTML,
        }
        return lastChat
      })
      .filter((chat) => chat.ord > latestChatOrd)
  )
  return { newer: chats, last: lastChat }
}

function timestampToOrd(timestamp) {
  const [mins, secs] = timestamp.split(':')
  const sign = mins.startsWith('-') ? -1 : 1
  return parseInt(mins) * 60 + sign * parseInt(secs)
}

const danmakuFontSize = 20
const danmakuLineGap = 20

function makeDanmakuElements(chats, danmakuContainer) {
  // Gets the the right position of the rightmost existing element of every line
  // from top to bottom. The indices of this array are the line indices of the
  // elements. An array is used so that the iteration will be from top to
  // bottom.
  //
  // Example rightmost shape:
  // -------   ---------]
  //    ----- -----]
  //        ----------]
  //             ------]
  const rightmostShape = []
  const containerRect = danmakuContainer.getBoundingClientRect()
  for (const currentEl of danmakuContainer.children) {
    const currentRect = currentEl.getBoundingClientRect()
    const lineIndex = Math.round(
      (currentRect.top - containerRect.top) / (danmakuFontSize + danmakuLineGap)
    )
    const previousRight = rightmostShape[lineIndex]
    const currentRight = currentRect.left + currentRect.width
    if (previousRight !== undefined) {
      if (currentRight > previousRight) {
        rightmostShape[lineIndex] = currentRight
      }
    } else {
      rightmostShape[lineIndex] = currentRight
    }
  }

  let nextLineIndex = -1
  let bottomOverflowStartIndex = undefined
  return chats.map((chat, i) => {
    // There have been elements that are placed in spite of overlapping because
    // of overflow, so just put the next under it.
    if (bottomOverflowStartIndex !== undefined) {
      nextLineIndex = i - bottomOverflowStartIndex
      return makeDanmakuElement(chat, nextLineIndex)
    }

    if (nextLineIndex >= rightmostShape.length) {
      // The previous element was placed at the bottom, so just place this
      // element under it.
      nextLineIndex++
    } else {
      // Detects the topmost position that can place a new element without
      // overlapping with existing elements.
      let lineIndex
      for (
        lineIndex = nextLineIndex + 1;
        lineIndex < rightmostShape.length;
        lineIndex++
      ) {
        const right = rightmostShape[lineIndex]
        // If there is no element in this line, place the new element in this line.
        if (right === undefined) {
          nextLineIndex = lineIndex
          break
        }
        // If the rightmost element in this line is far away to the right edge,
        // place the new element in this line. The definition of "far away" is
        // that the right position of the rightmost element is at least 1em away
        // from the right edge.
        if (
          right <=
          containerRect.left + containerRect.width - danmakuFontSize
        ) {
          nextLineIndex = lineIndex
          break
        }
      }
      if (nextLineIndex === -1 || lineIndex === rightmostShape.length) {
        // If no previous line is available, place the new element at the
        // bottom.
        nextLineIndex = rightmostShape.length
      }
    }
    if (
      nextLineIndex * (danmakuFontSize + danmakuLineGap) + danmakuFontSize >
      containerRect.height
    ) {
      // If the new element will be placed out of the container, place it from
      // the top. In this case, there are too many elements, so overlapping is
      // not avoidable.
      nextLineIndex = 0
      bottomOverflowStartIndex = i
    }

    return makeDanmakuElement(chat, nextLineIndex)
  })
}

function px(value) {
  return `${value}px`
}

function makeDanmakuElement(chat, lineIndex) {
  const danmakuElement = document.createElement('div')
  // danmakuElement.innerText = chat.message
  danmakuElement.innerHTML = chat.messageHtml
  danmakuElement.querySelectorAll('img').forEach((img) => {
    img.style.maxHeight = px(danmakuFontSize)
    img.style.maxWidth = px(danmakuFontSize)
    img.style.objectFit = 'contain'
  })
  danmakuElement.style.position = 'absolute'
  danmakuElement.style.top = px(lineIndex * (danmakuFontSize + danmakuLineGap))
  danmakuElement.style.left = px(window.innerWidth)
  danmakuElement.style.whiteSpace = 'nowrap'
  danmakuElement.style.fontSize = px(danmakuFontSize)
  danmakuElement.style.color = 'white'
  danmakuElement.style.textShadow = '0 0 5px black'
  return danmakuElement
}

function animateDanmakuElements(danmakuElements) {
  danmakuElements.forEach((element) => {
    animateDanmakuElement(element)
  })
}

const danmakuSpeed = 100 // px per second

function animateDanmakuElement(danmakuElement) {
  let lastTime = null
  function frame(currentTime) {
    if (parseFloat(danmakuElement.style.left) < -danmakuElement.clientWidth) {
      danmakuElement.remove()
      return
    }

    if (!lastTime) {
      lastTime = currentTime
    }
    const deltaTime = currentTime - lastTime
    lastTime = currentTime

    if (deltaTime < 0) {
      requestAnimationFrame(frame)
      return
    }

    if (!videoPaused) {
      danmakuElement.style.left = px(
        parseFloat(danmakuElement.style.left) -
          (danmakuSpeed * deltaTime) / 1000
      )
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
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
  unwatchPlayerChanges()
  console.log('YouTube Livestream Danmaku extension unloaded')
})
