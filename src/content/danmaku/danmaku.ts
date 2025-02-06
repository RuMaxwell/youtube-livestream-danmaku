import { config, DanmakuDensity, extensionConfig } from '../config'
import { states } from '../states'
import { px } from '../utils'
import { Chat } from './types'

export function makeDanmakuElements(
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

export function animateDanmakuElements(danmakuElements: HTMLElement[]) {
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

    if (!states.videoPaused) {
      danmakuElement.style.left = px(
        parseFloat(danmakuElement.style.left) -
          (config.danmaku.speed * deltaTime) / 1000
      )
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
