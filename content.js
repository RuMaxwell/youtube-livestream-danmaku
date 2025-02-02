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
        const liveChatAppIFrame = Array.from(window.frames).find(frame => {
            try {
                // Can fail because of cross-origin security
                return frame.document.querySelector('yt-live-chat-app')
            } catch (_) {
                return false
            }
        })
        const liveChatApp = liveChatAppIFrame?.document?.querySelector('yt-live-chat-app')
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

let chatChangesObserver

function watchChatChanges(liveChatApp, danmakuContainer) {
    let chats = []

    chatChangesObserver = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const lastChatOrd = chats[chats.length - 1]?.ord ?? -Infinity
                const newChats = getChats(liveChatApp)
                const newerChats = newChats.filter(chat => chat.ord > lastChatOrd)
                console.log('Newer chats:', newerChats)
                if (!chats.length) { // Don't display old chats when the page is first loaded or when the live chat is reloaded
                    chats = newChats
                    continue
                } else {
                    chats = newChats
                    const newDanmakuElements = newerChats.map((chat, i) => makeDanmakuElement(chat, i))
                    danmakuContainer.append(...newDanmakuElements)
                    animateDanmakuElements(newDanmakuElements)
                }
            }
        }
    })
    // Automatically calls `getChats` once immediately
    chatChangesObserver.observe(liveChatApp.querySelector('#items'), { childList: true })
}

function unwatchChatChanges() {
    chatChangesObserver?.disconnect()
    chatChangesObserver = undefined
}

let playerChangesObserver

function watchPlayerChanges() {
    const playerContainer = document.querySelector('#player-container')
    playerChangesObserver = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                if (mutation.removedNodes.length && mutation.removedNodes[0].tagName === 'YTD-PLAYER') {
                    console.log('Player removed')
                    detachDanmakuContainer()
                    unwatchChatChanges()
                    unwatchVideoResize()
                    unwatchVideoPausePlay()
                } else if (mutation.addedNodes.length && mutation.addedNodes[0].tagName === 'YTD-PLAYER') {
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
    // Moves live chat away from the right side of the video, making the video full width in cinema mode.
    const ytdWatchFlexy = document.querySelector('ytd-watch-flexy')
    if (ytdWatchFlexy?.attributes['fixed-panels']) {
        ytdWatchFlexy.removeAttribute('fixed-panels')
        // Because the container of the live chat app iframe has a CSS rule that selects `ytd-watch-flexy[fixed-panels]`
        // and sets `position: fixed` and a bunch of stuff to make the live chat stick to the right side of the video.
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
        unwatchChatChanges()
        getLiveChatApp((liveChatApp) => {
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

function getChats(liveChatApp) {
    const chatRenderers = liveChatApp.querySelectorAll('yt-live-chat-text-message-renderer')
    const chats = Array.from(chatRenderers.values().map(renderer => {
        return {
            ord: timestampToId(renderer.querySelector('#timestamp').innerText),
            message: renderer.querySelector('#message').innerText,
            messageHtml: renderer.querySelector('#message').innerHTML,
        }
    }))
    console.log('Chats:', chats)
    return chats
}

function timestampToId(timestamp) {
    const [mins, secs] = timestamp.split(':')
    const sign = mins.startsWith('-') ? -1 : 1
    return parseInt(mins) * 60 + sign * parseInt(secs)
}

const danmakuFontSize = '20px'

function makeDanmakuElement(chat, index) {
    const danmakuElement = document.createElement('div')
    // danmakuElement.innerText = chat.message
    danmakuElement.innerHTML = chat.messageHtml
    danmakuElement.querySelectorAll('img').forEach(img => {
        img.style.maxHeight = danmakuFontSize
        img.style.maxWidth = danmakuFontSize
        img.style.objectFit = 'contain'
    })
    danmakuElement.style.position = 'absolute'
    danmakuElement.style.top = `${index * 2}em`
    danmakuElement.style.left = window.innerWidth + 'px'
    // danmakuElement.style.left = '100%'
    danmakuElement.style.whiteSpace = 'nowrap'
    // danmakuElement.style.transform = 'translateX(-100%)'
    // danmakuElement.style.transition = 'left 5s linear'
    danmakuElement.style.fontSize = danmakuFontSize
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
            danmakuElement.style.left = parseFloat(danmakuElement.style.left) - danmakuSpeed * deltaTime / 1000 + 'px'
        }
        requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
}

window.addEventListener('load', () => {
    console.log('YouTube Livestream Danmaku extension loaded')
    initializeApp()
})

function softUnload() {
    detachDanmakuContainer()
    unwatchChatChanges()
    unwatchVideoResize()
    unwatchVideoPausePlay(getVideoElement())
}

window.addEventListener('unload', () => {
    softUnload()
    unwatchPlayerChanges()
    console.log('YouTube Livestream Danmaku extension unloaded')
})
