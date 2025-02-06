import { config, DanmakuDensity, saveConfig } from '../config'
import { getDanmakuContainer } from '../danmaku/container'
import { i18n } from '../i18n'
import { px } from '../utils'

let isSettingsMenuOpen = false
let settingsMenuChangeObserver: MutationObserver | undefined

export function watchSettingsMenuChange() {
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

export function unwatchSettingsMenuChange() {
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

export function attachDanmakuConfigPanel() {
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
      danmakuGroupLabel.innerHTML = i18n.config.danmaku.self
      // On/Off option
      const onOffOption = document.createElement('label')
      onOffOption.classList.add('danmaku-config-option')
      {
        // Option label
        const onOffOptionLabel = document.createElement('span')
        onOffOptionLabel.innerText = i18n.config.danmaku.onOff
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
        speedOptionLabel.innerText = i18n.config.danmaku.speed
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
        fontSizeOptionLabel.innerText = i18n.config.danmaku.fontSize
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
        lineGapOptionLabel.innerText = i18n.config.danmaku.lineGap
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
        densityOptionLabel.innerText = i18n.config.danmaku.density
        densityOptionLabel.title = i18n.config.danmaku.densityTips
        // Option input
        const densityOptionInput = document.createElement('select')
        Object.values(DanmakuDensity).forEach((key) => {
          const option = document.createElement('option')
          option.value = key
          option.innerText =
            i18n.config.danmaku.densityOption[
              key as keyof typeof DanmakuDensity
            ]
          option.title =
            i18n.config.danmaku.densityOptionTips[
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

export function toggleDanmaku() {
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
