export enum DanmakuDensity {
  all = 'all',
  noOverlap = 'noOverlap',
  dense = 'dense',
  moderate = 'moderate',
  sparse = 'sparse',
}

export const extensionConfig = {
  getLiveAppTimeout: 10, // seconds
  danmakuDensityLimits: {
    [DanmakuDensity.all]: 1,
    [DanmakuDensity.noOverlap]: 1,
    [DanmakuDensity.dense]: 0.75,
    [DanmakuDensity.moderate]: 0.5,
    [DanmakuDensity.sparse]: 0.25,
  },
}

// To add a new configuration:
// 1. add the key and the default value to this object
// 2. add the label to the i18n object
// 3. add the option to the danmaku config panel
// 4. add an assignment to the loadConfig function
// 5. add an entry to the resetPanelOptions function of src/options/options.ts
export const config = {
  danmaku: {
    on: true,
    speed: 100, // px per second
    fontSize: 20, // px
    lineGap: 20, // px
    density: DanmakuDensity.noOverlap,
    opacity: 1,
  },
}

export function setConfig(setter: (value: typeof config) => void): void {
  setter(config)
  saveConfig()
}

function saveConfig(): void {
  chrome.storage.sync.set({ panel: config })
}

export function loadConfig(): void {
  chrome.storage.sync.get(
    { getLiveAppTimeout: extensionConfig.getLiveAppTimeout },
    (result) => {
      extensionConfig.getLiveAppTimeout = result.getLiveAppTimeout
    }
  )

  chrome.storage.sync.get('panel', (result) => {
    config.danmaku.on = result?.panel?.danmaku?.on ?? true
    config.danmaku.speed = result?.panel?.danmaku?.speed ?? 100
    config.danmaku.fontSize = result?.panel?.danmaku?.fontSize ?? 20
    config.danmaku.lineGap = result?.panel?.danmaku?.lineGap ?? 20
    config.danmaku.density =
      result?.panel?.danmaku?.density ?? DanmakuDensity.noOverlap
    config.danmaku.opacity = result?.panel?.danmaku?.opacity ?? 1
  })
}
