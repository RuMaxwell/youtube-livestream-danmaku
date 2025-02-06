import { toggleDanmaku } from './panel'

export function bindHotKeys() {
  document.addEventListener('keydown', hotKeyHandler)
}

function hotKeyHandler(e: KeyboardEvent) {
  if (e.key === 'd') {
    e.preventDefault()
    toggleDanmaku()
  }
}

export function unbindHotKeys() {
  document.removeEventListener('keydown', hotKeyHandler)
}
