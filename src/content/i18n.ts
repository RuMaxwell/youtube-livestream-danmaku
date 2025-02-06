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
      panelButtonTooltip: 'Danmaku settings',
    },
  },
  jp: {
    config: {
      danmaku: {
        self: '弾幕',
        onOff: 'オン/オフ (d)',
        speed: 'スピード',
        fontSize: 'フォントサイズ',
        lineGap: '行間距離',
        density: '密度',
        densityTips:
          '弾幕の密度、"全て"より低い値は一部のメッセージを落とす可能性があります。',
        densityOption: {
          [DanmakuDensity.all]: '全て',
          [DanmakuDensity.noOverlap]: '無重叠',
          [DanmakuDensity.dense]: '密集',
          [DanmakuDensity.moderate]: '中等',
          [DanmakuDensity.sparse]: '稀疏',
        },
        densityOptionTips: {
          [DanmakuDensity.all]:
            '全メッセージを表示します。長時間の多くのメッセージが短時間内に集まると重なります。',
          [DanmakuDensity.noOverlap]:
            '重ならないように、すべてのメッセージをできるだけ表示する。',
          [DanmakuDensity.dense]: '大部分のメッセージを残す。',
          [DanmakuDensity.moderate]: '約半分のメッセージを残す。',
          [DanmakuDensity.sparse]: '少数のメッセージのみ残す。',
        },
      },
      panelButtonTooltip: '弾幕設定',
    },
  },
  'zh-CN': {
    config: {
      danmaku: {
        self: '弹幕',
        onOff: '开/关 (d)',
        speed: '速度',
        fontSize: '字号',
        lineGap: '行间距',
        density: '密度',
        densityTips: '弹幕的密度，设置为“全部”之外的值可能会丢弃一些消息。',
        densityOption: {
          [DanmakuDensity.all]: '全部',
          [DanmakuDensity.noOverlap]: '无重叠',
          [DanmakuDensity.dense]: '密集',
          [DanmakuDensity.moderate]: '中等',
          [DanmakuDensity.sparse]: '稀疏',
        },
        densityOptionTips: {
          [DanmakuDensity.all]:
            '显示所有消息。如果短时间内消息太多，可能会重叠。',
          [DanmakuDensity.noOverlap]: '在不重叠的情况下尽可能显示所有消息。',
          [DanmakuDensity.dense]: '保留大部分消息。',
          [DanmakuDensity.moderate]: '保留大约一半的消息。',
          [DanmakuDensity.sparse]: '只保留少量消息。',
        },
      },
      panelButtonTooltip: '弹幕设置',
    },
  },
  'zh-TW': {
    config: {
      danmaku: {
        self: '彈幕',
        onOff: '開/關 (d)',
        speed: '速度',
        fontSize: '字級',
        lineGap: '行間距',
        density: '密度',
        densityTips: '彈幕的密度，設定為「全部」以外的值可能會忽略一些訊息。',
        densityOption: {
          [DanmakuDensity.all]: '全部',
          [DanmakuDensity.noOverlap]: '無重疊',
          [DanmakuDensity.dense]: '密集',
          [DanmakuDensity.moderate]: '中等',
          [DanmakuDensity.sparse]: '稀疏',
        },
        densityOptionTips: {
          [DanmakuDensity.all]:
            '顯示所有訊息。如果短時間內訊息過多，可能會發生重疊。',
          [DanmakuDensity.noOverlap]: '在不重疊的情況下儘可能顯示所有訊息。',
          [DanmakuDensity.dense]: '保留大部分訊息。',
          [DanmakuDensity.moderate]: '保留約一半的訊息。',
          [DanmakuDensity.sparse]: '僅保留少量訊息。',
        },
      },
      panelButtonTooltip: '彈幕設定',
    },
  },
}

const userPreferredLanguage = navigator.language

export const i18n =
  userPreferredLanguage in contentI18n
    ? contentI18n[userPreferredLanguage as keyof typeof contentI18n]
    : userPreferredLanguage.slice(0, 2) in contentI18n
    ? contentI18n[userPreferredLanguage.slice(0, 2) as keyof typeof contentI18n]
    : contentI18n.en
