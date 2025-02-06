const userPreferredLanguage = navigator.language

const optionsI18n = {
  en: {
    getLiveAppTimeoutOption:
      'Timeout before giving up detecting the live chat area (in seconds):',
    resetPanelDescription:
      "Reset options of the video player's panel to default (you need to reload the video page to see the change):",
    resetPanel: 'Reset panel',
    save: 'Save',
    saved: 'Saved!',
    reset: 'Reset to default',
    resetted: 'Resetted!',
    sureToReset: 'Are you sure you want to reset the options to the default?',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
  jp: {
    getLiveAppTimeoutOption:
      'ライブチャットのエリアの検出を諦めるまでのタイムアウト（秒）：',
    resetPanelDescription:
      'ビデオプレーヤーのパネルでのオプションをリセットする（ビデオページをリフレッシュして変化する）：',
    resetPanel: 'パネルをリセット',
    save: '保存',
    saved: '保存されました!',
    reset: 'デフォルトにリセット',
    resetted: 'リセットされました!',
    sureToReset: 'オプションをデフォルトにリセットしてもよろしいですか？',
    confirm: '確認',
    cancel: 'キャンセル',
  },
  'zh-CN': {
    getLiveAppTimeoutOption: '检测直播聊天区域的最大等待时间（秒）：',
    resetPanelDescription:
      '重置视频播放器面板的选项（需要重新加载视频页面才能生效）：',
    resetPanel: '重置面板设置',
    save: '保存',
    saved: '保存成功！',
    reset: '恢复默认设置',
    resetted: '重置成功！',
    sureToReset: '确定要恢复设置为默认值吗？',
    confirm: '确定',
    cancel: '取消',
  },
  'zh-TW': {
    getLiveAppTimeoutOption: '檢測直播聊天區域的最長等待時間（秒）：',
    resetPanelDescription:
      '重設影片播放器面板的選項（需要重新載入影片頁面才能生效）：',
    resetPanel: '重設面板設定',
    save: '儲存',
    saved: '儲存成功！',
    reset: '恢復預設設定',
    resetted: '重設成功！',
    sureToReset: '确定要恢復設定為預設值吗？',
    confirm: '確認',
    cancel: '取消',
  },
}

const i18n =
  userPreferredLanguage in optionsI18n
    ? optionsI18n[userPreferredLanguage as keyof typeof optionsI18n]
    : userPreferredLanguage.slice(0, 2) in optionsI18n
    ? optionsI18n[userPreferredLanguage.slice(0, 2) as keyof typeof optionsI18n]
    : optionsI18n.en

getElement('#save').textContent = i18n.save
getElement('#reset').textContent = i18n.reset
getElement('#getLiveAppTimeoutOption > .option-label').textContent =
  i18n.getLiveAppTimeoutOption
getElement('#resetPanel > .option-label').textContent =
  i18n.resetPanelDescription
getElement('#resetPanelButton').value = i18n.resetPanel
getElement('#dialog-confirm').textContent = i18n.confirm
getElement('#dialog-cancel').textContent = i18n.cancel

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
      showStatus(i18n.saved)
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
  getElement('#dialog-content').innerHTML = i18n.sureToReset
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
    showStatus(i18n.resetted)
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
      showStatus(i18n.resetted)
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
