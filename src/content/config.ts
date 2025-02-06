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

export const config = {
  danmaku: {
    on: true,
    speed: 100, // px per second
    fontSize: 20, // px
    lineGap: 20, // px
    density: DanmakuDensity.noOverlap,
  },
}

export function saveConfig(): void {
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
  })
}
