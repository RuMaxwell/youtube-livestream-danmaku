const danmakuContainerId = 'danmaku-container'

export function attachDanmakuContainer() {
  console.log('Attaching danmaku container')
  // const playerContainer = document.querySelector('#player-container')
  const playerContent = document.querySelector(
    '#player-container .html5-video-container'
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
  danmakuContainer.style.zIndex = '11'
  playerContent.parentElement!.insertBefore(danmakuContainer, playerContent)
  return danmakuContainer
}

export function getDanmakuContainer() {
  return document.querySelector(`#${danmakuContainerId}`) as HTMLDivElement
}

export function detachDanmakuContainer() {
  console.log('Detaching danmaku container')
  getDanmakuContainer()?.remove()
}

export function setDanmakuContainerOpacity(opacity: number): void {
  const danmakuContainer = getDanmakuContainer()
  if (!danmakuContainer) return
  danmakuContainer.style.opacity = opacity.toString()
}
