'use strict'

enum DanmakuDensity {
  all = 'all',
  noOverlap = 'noOverlap',
  dense = 'dense',
  moderate = 'moderate',
  sparse = 'sparse',
}

const extensionConfig = {
  getLiveAppTimeout: 10, // seconds
  danmakuDensityLimits: {
    [DanmakuDensity.all]: 1,
    [DanmakuDensity.noOverlap]: 1,
    [DanmakuDensity.dense]: 0.75,
    [DanmakuDensity.moderate]: 0.5,
    [DanmakuDensity.sparse]: 0.25,
  },
}

chrome.storage.sync.get(
  { getLiveAppTimeout: extensionConfig.getLiveAppTimeout },
  (result) => {
    extensionConfig.getLiveAppTimeout = result.getLiveAppTimeout
  }
)

const config = {
  danmaku: {
    on: true,
    speed: 100, // px per second
    fontSize: 20, // px
    lineGap: 20, // px
    density: DanmakuDensity.noOverlap,
  },
}

function saveConfig(): void {
  chrome.storage.sync.set({ panel: config })
}

function loadConfig(): void {
  chrome.storage.sync.get('panel', (result) => {
    config.danmaku.on = result?.panel?.danmaku?.on ?? true
    config.danmaku.speed = result?.panel?.danmaku?.speed ?? 100
    config.danmaku.fontSize = result?.panel?.danmaku?.fontSize ?? 20
    config.danmaku.lineGap = result?.panel?.danmaku?.lineGap ?? 20
    config.danmaku.density =
      result?.panel?.danmaku?.density ?? DanmakuDensity.noOverlap
  })
}

loadConfig()

const contentI18n = {
  en: {
    config: {
      danmaku: {
        self: 'Danmaku',
        onOff: 'On/Off (d)',
        speed: 'Speed',
        fontSize: 'Font size',
        lineGap: 'Line gap',
        density: 'Density',
        densityTips:
          'The density config determines how dense the danmaku are. Density lower than "All" may drop some messages.',
        densityOption: {
          [DanmakuDensity.all]: 'All',
          [DanmakuDensity.noOverlap]: 'No overlap',
          [DanmakuDensity.dense]: 'Dense',
          [DanmakuDensity.moderate]: 'Moderate',
          [DanmakuDensity.sparse]: 'Sparse',
        },
        densityOptionTips: {
          [DanmakuDensity.all]:
            'Display all messages. If too many messages crowd in a very short amount of time, they may overlap.',
          [DanmakuDensity.noOverlap]:
            'Display all messages unless they are possible to overlap.',
          [DanmakuDensity.dense]: 'Keep most of the messages.',
          [DanmakuDensity.moderate]: 'Keep about a half of the messages.',
          [DanmakuDensity.sparse]: 'Keep only a few of the messages.',
        },
      },
    },
  },
}['en']

type Chat = {
  id: string
  ord: number
  messageHtml: string
}

function initializeApp() {
  getLiveChatApp((liveChatApp: HTMLElement) => {
    relocateLiveChat()

    const danmakuContainer = attachDanmakuContainer()

    watchSettingsMenuChange()
    const danmakuConfigPanel = attachDanmakuConfigPanel()
    bindHotKeys()

    const videoElement = getVideoElement()
    watchVideoResize(videoElement)
    watchVideoPausePlay(videoElement)

    watchPlayerChanges()
    watchChatChanges(liveChatApp, danmakuContainer)
  })
}

function getLiveChatApp(then: (liveChatApp: any) => void) {
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

let playerChangesObserver: MutationObserver | undefined

function watchPlayerChanges() {
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

function unwatchPlayerChanges() {
  playerChangesObserver?.disconnect()
  playerChangesObserver = undefined
}

function relocateLiveChat() {
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
}

const danmakuContainerId = 'danmaku-container'

function attachDanmakuContainer() {
  console.log('Attaching danmaku container')
  // const playerContainer = document.querySelector('#player-container')
  const playerContent = document.querySelector(
    '#player-container .ytp-player-content'
  )
  if (!playerContent) {
    throw new Error('Cannot find player content')
  }
  const danmakuContainer = document.createElement('div')
  danmakuContainer.id = danmakuContainerId
  danmakuContainer.style.position = 'absolute'
  danmakuContainer.style.top = '0'
  danmakuContainer.style.left = '0'
  danmakuContainer.style.width = '100%'
  danmakuContainer.style.height = '100%'
  danmakuContainer.style.overflow = 'hidden'
  danmakuContainer.style.pointerEvents = 'none'
  danmakuContainer.style.zIndex = '10'
  playerContent.parentElement!.insertBefore(danmakuContainer, playerContent)
  return danmakuContainer
}

function getDanmakuContainer() {
  return document.querySelector(`#${danmakuContainerId}`) as HTMLDivElement
}

function detachDanmakuContainer() {
  console.log('Detaching danmaku container')
  getDanmakuContainer()?.remove()
}

let isSettingsMenuOpen = false
let settingsMenuChangeObserver: MutationObserver | undefined

function watchSettingsMenuChange() {
  const settingsMenuEl = document.querySelector(
    '.ytp-settings-menu'
  ) as HTMLElement
  if (!settingsMenuEl) {
    throw new Error('Settings menu not found')
  }
  const danmakuConfigPanel = makeDanmakuConfigPanel()
  settingsMenuEl.insertAdjacentElement('afterend', danmakuConfigPanel)
  settingsMenuChangeObserver = new MutationObserver((mutationsList) => {
    isSettingsMenuOpen = settingsMenuEl.style.display !== 'none'
  })
  settingsMenuChangeObserver.observe(settingsMenuEl, {
    attributes: true,
    attributeFilter: ['style'],
  })
}

function unwatchSettingsMenuChange() {
  settingsMenuChangeObserver?.disconnect()
  settingsMenuChangeObserver = undefined
}

const danmakuConfigPanelId = 'danmaku-config-panel'
const danmakuConfigPanelToggleId = 'danmaku-config-panel-toggle'
const danmakuOffSvg =
  '<svg class="icon" viewBox="-224 -224 1440 1440" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M558.545 721.455H155.927c-32.582 0-62.836-30.255-62.836-62.837V318.836c0-32.581 30.254-62.836 62.836-62.836h572.51c32.581 0 62.836 30.255 62.836 62.836v30.255c0 13.964 9.309 23.273 23.272 23.273s23.273-9.31 23.273-23.273v-30.255c0-58.181-51.2-109.381-109.382-109.381H155.927c-58.182 0-109.382 51.2-109.382 109.381v339.782C46.545 716.8 97.745 768 155.927 768h402.618c13.964 0 23.273-9.31 23.273-23.273s-9.309-23.272-23.273-23.272" fill="#fff"/><path d="M325.818 349.09h46.546v46.546h-46.546zm93.091 0h186.182v46.546H418.909zM186.182 465.456h46.545V512h-46.545zm93.09 0h186.183V512H279.273zm0 116.363h46.546v46.546h-46.545zm93.092 0h186.181v46.546H372.364zm430.545-116.363c-95.418 0-174.545 79.127-174.545 174.545s79.127 174.545 174.545 174.545S977.455 735.418 977.455 640s-79.128-174.545-174.546-174.545m0 302.545c-69.818 0-128-58.182-128-128 0-23.273 6.982-44.218 16.291-62.836l174.545 174.545C847.127 761.02 826.182 768 802.91 768m97.746-46.545-179.2-179.2C744.728 523.636 772.656 512 802.91 512c69.818 0 128 58.182 128 128 0 30.255-11.636 60.51-30.254 81.455" fill="#fff"/></svg>'
const danmakuOnSvg =
  '<svg class="icon" viewBox="-224 -224 1440 1440" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M558.545 721.455H155.927c-32.582 0-62.836-30.255-62.836-62.837V318.836c0-32.581 30.254-62.836 62.836-62.836h572.51c32.581 0 62.836 30.255 62.836 62.836v30.255c0 13.964 9.309 23.273 23.272 23.273s23.273-9.31 23.273-23.273v-30.255c0-58.181-51.2-109.381-109.382-109.381H155.927c-58.182 0-109.382 51.2-109.382 109.381v339.782C46.545 716.8 97.745 768 155.927 768h402.618c13.964 0 23.273-9.31 23.273-23.273s-9.309-23.272-23.273-23.272" fill="#fff"/><path d="M325.818 349.09h46.546v46.546h-46.546zm93.091 0h186.182v46.546H418.909zM186.182 465.456h46.545V512h-46.545zm93.09 0h186.183V512H279.273zm93.092 116.363h186.181v46.546H372.364zm-93.091 0h46.545v46.546h-46.545zm523.636-116.363c-95.418 0-174.545 79.127-174.545 174.545s79.127 174.545 174.545 174.545S977.455 735.418 977.455 640s-79.128-174.545-174.546-174.545m0 302.545c-69.818 0-128-58.182-128-128s58.182-128 128-128 128 58.182 128 128-58.182 128-128 128" fill="#fff"/><path d="M900.655 586.473c-9.31-9.31-23.273-9.31-32.582 0l-81.455 81.454-48.873-48.872c-9.309-9.31-23.272-9.31-32.581 0-9.31 9.309-9.31 23.272 0 32.581l65.163 65.164c9.31 9.31 23.273 9.31 32.582 0l97.746-97.745c9.309-9.31 9.309-23.273 0-32.582" fill="#fff"/></svg>'
const danmakuConfigButtonText = 'Danmaku Settings'

let isDanmakuConfigPanelOpen = false

function attachDanmakuConfigPanel() {
  getPlayerRightControls((controls: HTMLElement) => {
    const toggle = makeDanmakuConfigPanelToggleButton()

    // Inserts the toggle button before the settings button.
    const settingsButton = controls.querySelector('.ytp-settings-button')
    if (settingsButton) {
      controls.insertBefore(toggle, settingsButton)
    } else {
      controls.prepend(toggle)
    }

    toggle.addEventListener('click', (e) => {
      e.preventDefault()
      toggleDanmakuConfigPanel()
    })

    let cancelKeepDisplay: () => void

    // Displays the tooltip when the mouse enters the toggle button.
    toggle.addEventListener('mouseenter', () => {
      if (isDanmakuConfigPanelOpen || isSettingsMenuOpen) {
        // Prevents tooltip from showing when the settings menu or the danmaku
        // config panel is open.
        return
      }

      const toggleRect = toggle.getBoundingClientRect()
      const midX = toggleRect.left + toggleRect.width / 2
      const tooltipEl = document.querySelector('.ytp-tooltip') as HTMLElement
      const tooltipTextEl = tooltipEl?.querySelector('.ytp-tooltip-text')
      if (!tooltipEl || !tooltipTextEl) return
      tooltipTextEl.innerHTML = danmakuConfigButtonText
      tooltipEl.style.left = px(
        midX - tooltipTextEl.getBoundingClientRect().width / 2
      )
      cancelKeepDisplay = keepDisplayForShortTime(tooltipEl)
    })

    // Hides the tooltip when the mouse leaves the toggle button.
    toggle.addEventListener('mouseleave', () => {
      cancelKeepDisplay?.()
      const tooltipEl = document.querySelector('.ytp-tooltip') as HTMLElement
      const tooltipTextEl = tooltipEl?.querySelector('.ytp-tooltip-text')
      if (!tooltipEl || !tooltipTextEl) return
      tooltipEl.style.display = 'none'
    })
  })
}

function keepDisplayForShortTime(el: HTMLElement) {
  const startTime = Date.now()
  let cancelled = false
  function cancel() {
    cancelled = true
  }
  function inner() {
    if (cancelled || Date.now() - startTime > 200) {
      return
    }
    el.style.removeProperty('display')
    requestAnimationFrame(inner)
  }
  inner()

  return cancel
}

function makeDanmakuConfigPanelToggleButton() {
  const toggle = document.createElement('button')
  toggle.id = danmakuConfigPanelToggleId
  toggle.classList.add('ytp-subtitles-button', 'ytp-button')
  toggle.dataset.priority = '11'
  toggle.ariaKeyShortcuts = 'd'
  toggle.title = danmakuConfigButtonText
  toggle.innerHTML = danmakuOnSvg
  return toggle
}

function getDanmakuConfigPanelToggle() {
  return document.querySelector('#' + danmakuConfigPanelToggleId)
}

function toggleDanmakuConfigPanel(on?: boolean) {
  const isOpen = on === undefined ? !isDanmakuConfigPanelOpen : on
  isDanmakuConfigPanelOpen = isOpen
  const panel = document.querySelector(
    '#' + danmakuConfigPanelId
  ) as HTMLElement
  if (!panel) return
  panel.style.display = isOpen ? 'block' : 'none'
  saveConfig()
}

function makeDanmakuConfigPanel() {
  const panel = document.createElement('div')
  panel.id = danmakuConfigPanelId
  panel.classList.add('ytp-popup', 'ytp-settings-menu')
  panel.style.display = 'none'
  panel.appendChild(makeDanmakuConfigPanelContent())
  return panel
}

function makeDanmakuConfigPanelContent() {
  const content = document.createElement('div')
  content.classList.add('danmaku-config-panel-content')
  {
    // Danmaku group
    const danmakuGroup = document.createElement('div')
    danmakuGroup.classList.add('danmaku-config-group')
    {
      // Group label
      const danmakuGroupLabel = document.createElement('div')
      danmakuGroupLabel.classList.add('danmaku-config-group-label')
      danmakuGroupLabel.innerHTML = contentI18n.config.danmaku.self
      // On/Off option
      const onOffOption = document.createElement('label')
      onOffOption.classList.add('danmaku-config-option')
      {
        // Option label
        const onOffOptionLabel = document.createElement('span')
        onOffOptionLabel.innerText = contentI18n.config.danmaku.onOff
        // Option input
        const onOffOptionInput = document.createElement('input')
        onOffOptionInput.type = 'checkbox'
        onOffOptionInput.checked = config.danmaku.on
        onOffOptionInput.addEventListener('change', toggleDanmaku)

        onOffOption.append(onOffOptionLabel, onOffOptionInput)
      }
      // Speed option
      const speedOption = document.createElement('label')
      speedOption.classList.add('danmaku-config-option')
      {
        // Option label
        const speedOptionLabel = document.createElement('span')
        speedOptionLabel.innerText = contentI18n.config.danmaku.speed
        // Option input
        const speedOptionInput = document.createElement('input')
        speedOptionInput.type = 'number'
        speedOptionInput.value = config.danmaku.speed.toString()
        speedOptionInput.step = '50'
        speedOptionInput.min = '50'
        speedOptionInput.max = '950'
        speedOptionInput.style.width = '3em'
        speedOptionInput.addEventListener('keydown', (e) => {
          e.stopPropagation()
        })
        speedOptionInput.addEventListener('input', (e) => {
          config.danmaku.speed = parseInt(
            (e.target as HTMLInputElement | null)?.value || '100'
          )
          saveConfig()
        })

        speedOption.append(speedOptionLabel, speedOptionInput)
      }
      // Font size option
      const fontSizeOption = document.createElement('label')
      fontSizeOption.classList.add('danmaku-config-option')
      {
        // Option label
        const fontSizeOptionLabel = document.createElement('span')
        fontSizeOptionLabel.innerText = contentI18n.config.danmaku.fontSize
        // Option input
        const fontSizeOptionInput = document.createElement('input')
        fontSizeOptionInput.type = 'number'
        fontSizeOptionInput.value = config.danmaku.fontSize.toString()
        fontSizeOptionInput.step = '2'
        fontSizeOptionInput.min = '2'
        fontSizeOptionInput.max = '100'
        fontSizeOptionInput.style.width = '3em'
        fontSizeOptionInput.addEventListener('keydown', (e) => {
          e.stopPropagation()
        })
        fontSizeOptionInput.addEventListener('input', (e) => {
          config.danmaku.fontSize = parseInt(
            (e.target as HTMLInputElement | null)?.value || '20'
          )
          saveConfig()
        })

        fontSizeOption.append(fontSizeOptionLabel, fontSizeOptionInput)
      }
      // Line gap option
      const lineGapOption = document.createElement('label')
      lineGapOption.classList.add('danmaku-config-option')
      {
        // Option label
        const lineGapOptionLabel = document.createElement('span')
        lineGapOptionLabel.innerText = contentI18n.config.danmaku.lineGap
        // Option input
        const lineGapOptionInput = document.createElement('input')
        lineGapOptionInput.type = 'number'
        lineGapOptionInput.value = config.danmaku.lineGap.toString()
        lineGapOptionInput.step = '2'
        lineGapOptionInput.min = '0'
        lineGapOptionInput.max = '100'
        lineGapOptionInput.style.width = '3em'
        lineGapOptionInput.addEventListener('keydown', (e) => {
          e.stopPropagation()
        })
        lineGapOptionInput.addEventListener('input', (e) => {
          config.danmaku.lineGap = parseInt(
            (e.target as HTMLInputElement | null)?.value || '20'
          )
          saveConfig()
        })

        lineGapOption.append(lineGapOptionLabel, lineGapOptionInput)
      }
      // Density option
      const densityOption = document.createElement('label')
      densityOption.classList.add('danmaku-config-option')
      {
        // Option label
        const densityOptionLabel = document.createElement('span')
        densityOptionLabel.innerText = contentI18n.config.danmaku.density
        densityOptionLabel.title = contentI18n.config.danmaku.densityTips
        // Option input
        const densityOptionInput = document.createElement('select')
        Object.values(DanmakuDensity).forEach((key) => {
          const option = document.createElement('option')
          option.value = key
          option.innerText =
            contentI18n.config.danmaku.densityOption[
              key as keyof typeof DanmakuDensity
            ]
          option.title =
            contentI18n.config.danmaku.densityOptionTips[
              key as keyof typeof DanmakuDensity
            ]
          densityOptionInput.appendChild(option)
        })
        densityOptionInput.value = config.danmaku.density
        densityOptionInput.addEventListener('change', (e) => {
          config.danmaku.density =
            DanmakuDensity[
              (e.target as HTMLSelectElement | null)
                ?.value as keyof typeof DanmakuDensity
            ] || DanmakuDensity.all
          toggleDanmakuConfigPanel(false)
        })

        densityOption.append(densityOptionLabel, densityOptionInput)
      }
      danmakuGroup.append(
        danmakuGroupLabel,
        onOffOption,
        speedOption,
        fontSizeOption,
        lineGapOption,
        densityOption
      )
    }
    content.append(danmakuGroup)
  }
  return content
}

function toggleDanmaku() {
  const on = !config.danmaku.on
  config.danmaku.on = on
  const danmakuToggle = getDanmakuConfigPanelToggle()
  if (danmakuToggle) {
    danmakuToggle.innerHTML = on ? danmakuOnSvg : danmakuOffSvg
  }
  const danmakuContainer = getDanmakuContainer()
  if (danmakuContainer) {
    danmakuContainer.style.visibility = on ? 'visible' : 'hidden'
  }
  saveConfig()
}

function getPlayerRightControls(then: (controls: HTMLElement) => void) {
  function inner() {
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement
    if (controls) {
      then(controls)
      return
    }
    requestAnimationFrame(inner)
  }

  inner()
}

function getVideoElement() {
  return document.querySelector(
    '.html5-video-container > video'
  ) as HTMLVideoElement
}

let videoResizeObserver: ResizeObserver | undefined

function watchVideoResize(videoElement: HTMLVideoElement) {
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

function watchVideoPausePlay(videoElement: HTMLVideoElement) {
  videoElement.addEventListener('pause', onVideoPause)
  videoElement.addEventListener('play', onVideoPlay)
}

function unwatchVideoPausePlay(videoElement: HTMLVideoElement) {
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
let chatChangesObserver: MutationObserver | undefined

function watchChatChanges(
  liveChatApp: HTMLElement,
  danmakuContainer: HTMLElement
) {
  unwatchChatChanges()

  // The cache of the previous incoming chats.
  let chats: Chat[] = []
  isFirstChange = true

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
  chatChangesObserver.observe(liveChatApp.querySelector('#items')!, {
    childList: true,
  })
}

function unwatchChatChanges() {
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

function makeDanmakuElements(
  chats: Chat[],
  danmakuContainer: HTMLElement
): HTMLElement[] {
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
  const rightmostShape: number[] = []
  const containerRect = danmakuContainer.getBoundingClientRect()
  for (const currentEl of danmakuContainer.children) {
    const currentRect = currentEl.getBoundingClientRect()
    const lineIndex = Math.round(
      (currentRect.top - containerRect.top) /
        (config.danmaku.fontSize + config.danmaku.lineGap)
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
  let bottomOverflowStartIndex: number | undefined = undefined
  const danmakuElements: HTMLElement[] = []
  for (const [i, chat] of chats.entries()) {
    // There have been elements that are placed in spite of overlapping because
    // of overflow, so just put the next under it.
    if (bottomOverflowStartIndex !== undefined) {
      nextLineIndex = i - bottomOverflowStartIndex
      pushDanmakuElement(
        danmakuElements,
        makeDanmakuElement(chat, nextLineIndex)
      )
      continue
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
          containerRect.left + containerRect.width - config.danmaku.fontSize
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
      nextLineIndex * (config.danmaku.fontSize + config.danmaku.lineGap) +
        config.danmaku.fontSize >
      containerRect.height
    ) {
      // If the new element will be placed out of the container...
      if (config.danmaku.density !== DanmakuDensity.all) {
        // If density is not "all", avoid overlapping.
        break
      }

      // place it from
      // the top. In this case, there are too many elements, so overlapping is
      // not avoidable.
      nextLineIndex = 0
      bottomOverflowStartIndex = i
    }

    pushDanmakuElement(danmakuElements, makeDanmakuElement(chat, nextLineIndex))
  }
  return danmakuElements
}

function pushDanmakuElement(array: HTMLElement[], item: HTMLElement): void {
  // Uses the density config to decide whether to push the element.
  if (
    Math.random() < extensionConfig.danmakuDensityLimits[config.danmaku.density]
  ) {
    array.push(item)
  }
}

function px(value: number) {
  return `${value}px`
}

function makeDanmakuElement(chat: Chat, lineIndex: number) {
  const danmakuElement = document.createElement('div')
  // danmakuElement.innerText = chat.message
  danmakuElement.innerHTML = chat.messageHtml
  danmakuElement.querySelectorAll('img').forEach((img) => {
    img.style.maxHeight = px(config.danmaku.fontSize)
    // img.style.maxWidth = px(config.danmaku.fontSize)
    img.style.objectFit = 'contain'
  })
  danmakuElement.style.position = 'absolute'
  danmakuElement.style.top = px(
    lineIndex * (config.danmaku.fontSize + config.danmaku.lineGap)
  )
  danmakuElement.style.left = px(window.innerWidth)
  danmakuElement.style.whiteSpace = 'nowrap'
  danmakuElement.style.fontSize = px(config.danmaku.fontSize)
  danmakuElement.style.color = 'white'
  danmakuElement.style.textShadow = '0 0 5px black'
  return danmakuElement
}

function animateDanmakuElements(danmakuElements: HTMLElement[]) {
  danmakuElements.forEach((element) => {
    animateDanmakuElement(element)
  })
}

function animateDanmakuElement(danmakuElement: HTMLElement) {
  let lastTime: number | null = null
  function frame(currentTime: number) {
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
          (config.danmaku.speed * deltaTime) / 1000
      )
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function bindHotKeys() {
  document.addEventListener('keydown', hotKeyHandler)
}

function hotKeyHandler(e: KeyboardEvent) {
  if (e.key === 'd') {
    e.preventDefault()
    toggleDanmaku()
  }
}

function unbindHotKeys() {
  document.removeEventListener('keydown', hotKeyHandler)
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
