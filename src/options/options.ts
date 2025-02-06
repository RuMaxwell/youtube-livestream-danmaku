const optionsI18n = {
  en: {
    getLiveAppTimeoutOption:
      'Timeout before giving up finding live chat container (in seconds):',
    resetPanelDescription:
      "Reset options from the video player's panel to default (you need to reload the video page to see the change):",
    resetPanel: 'Reset panel',
    save: 'Save',
    saved: 'Saved!',
    reset: 'Reset to default',
    resetted: 'Resetted!',
    sureToReset: 'Are you sure you want to reset the options to the default?',
  },
}['en']

getElement('#save').textContent = optionsI18n.save
getElement('#reset').textContent = optionsI18n.reset
getElement('#getLiveAppTimeoutOption > .option-label').textContent =
  optionsI18n.getLiveAppTimeoutOption
getElement('#resetPanel > .option-label').textContent =
  optionsI18n.resetPanelDescription
getElement('#resetPanelButton').value = optionsI18n.resetPanel

const defaultOptions = {
  getLiveAppTimeout: 10,
}

function getElement(query: string) {
  return document.querySelector(query)! as HTMLInputElement
}

function saveOptionsFromDom() {
  const getLiveAppTimeout = parseFloat(getElement('#getLiveAppTimeout').value)
  saveOptions(
    {
      getLiveAppTimeout,
    },
    () => {
      showStatus(optionsI18n.saved)
    }
  )
}

function saveOptions(options: typeof defaultOptions, then: () => void) {
  chrome.storage.sync.set(options, then)
}

function restoreOptions(): void {
  chrome.storage.sync.get(defaultOptions, (result) => {
    getElement('#getLiveAppTimeout').value = result.getLiveAppTimeout
  })
}

let statusTimeout: number | null = null

function showStatus(text: string) {
  const statusEl = getElement('#status')
  statusEl.textContent = text
  statusEl.style.opacity = '1'
  if (statusTimeout !== null) {
    clearTimeout(statusTimeout)
  }
  statusTimeout = setTimeout(() => {
    statusEl.style.opacity = '0'
    statusTimeout = null
  }, 1500)
}

let thingToReset: 'options' | 'panel' | null = null

function openDialog(thing: typeof thingToReset) {
  thingToReset = thing
  getElement('#dialog-overlay').style.display = 'block'
  getElement('#dialog-content').innerHTML = optionsI18n.sureToReset
}

function closeDialog() {
  thingToReset = null
  getElement('#dialog-overlay').style.display = 'none'
}

function handleConfirm() {
  if (thingToReset === 'options') {
    resetOptions()
  } else if (thingToReset === 'panel') {
    resetPanelOptions()
  }
  closeDialog()
}

function handleCancel() {
  closeDialog()
}

function resetOptions() {
  saveOptions(defaultOptions, () => {
    showStatus(optionsI18n.resetted)
  })
  restoreOptions()
}

function resetPanelOptions() {
  chrome.storage.sync.set(
    {
      panel: {
        danmaku: {
          on: true,
          speed: 100,
          fontSize: 20,
          lineGap: 20,
          density: 'noOverlap',
        },
      },
    },
    () => {
      showStatus(optionsI18n.resetted)
    }
  )
}

document.addEventListener('DOMContentLoaded', restoreOptions)
getElement('#save').addEventListener('click', saveOptionsFromDom)
getElement('#reset').addEventListener('click', () => openDialog('options'))
getElement('#resetPanelButton').addEventListener('click', () =>
  openDialog('panel')
)
getElement('#dialog-overlay').addEventListener('click', closeDialog)
getElement('#dialog-confirm').addEventListener('click', handleConfirm)
getElement('#dialog-cancel').addEventListener('click', handleCancel)
