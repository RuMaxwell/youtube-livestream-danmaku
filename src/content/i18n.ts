import { DanmakuDensity } from './config'

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
}

export const i18n = contentI18n['en']
