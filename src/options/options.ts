const optionsI18n = {
  en: {
    saved: 'Saved!',
  },
}['en']

function getElement(query: string) {
  return document.querySelector(query)! as HTMLInputElement
}

function saveOptions() {
  console.log('log')
  const getLiveAppTimeout = parseFloat(getElement('#getLiveAppTimeout').value)

  chrome.storage.sync.set(
    {
      getLiveAppTimeout,
    },
    () => {
      showStatus(optionsI18n.saved)
    }
  )
}

function restoreOptions() {
  chrome.storage.sync.get({ getLiveAppTimeout: 10 }, (result) => {
    getElement('#getLiveAppTimeout').value = result.getLiveAppTimeout
  })
}

function showStatus(text: string) {
  const statusEl = getElement('#status')
  statusEl.textContent = text
  statusEl.style.display = 'inline-block'
  setTimeout(() => {
    statusEl.style.display = 'none'
  }, 1500)
}

document.addEventListener('DOMContentLoaded', restoreOptions)
getElement('#save').addEventListener('click', saveOptions)
