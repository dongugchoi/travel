import Vue from 'vue'
import { i18n, t } from './i18n'

const WEEKDAYS = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  ja: ['日', '月', '火', '水', '木', '金', '土']
}

const toDate = value => new Date(value + 'T00:00:00')
const wd = d => WEEKDAYS[i18n.lang === 'ja' ? 'ja' : 'ko'][d.getDay()]

// 2026-12-01 -> 12월 1일 (화) / 12月1日(火)
export function koDate (value) {
  if (!value) return ''
  const d = toDate(value)
  return i18n.lang === 'ja'
    ? `${d.getMonth() + 1}月${d.getDate()}日(${wd(d)})`
    : `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd(d)})`
}
Vue.filter('koDate', koDate)

// 2026-12-01 -> 12월 1일 화요일 / 12月1日 火曜日 (스크립트에서도 쓰도록 export)
export function koDateLong (value) {
  if (!value) return ''
  const d = toDate(value)
  return i18n.lang === 'ja'
    ? `${d.getMonth() + 1}月${d.getDate()}日 ${wd(d)}曜日`
    : `${d.getMonth() + 1}월 ${d.getDate()}일 ${wd(d)}요일`
}
Vue.filter('koDateLong', koDateLong)

// 2026-12-01 -> 12월 1일 / 12月1日
export function shortDate (value) {
  if (!value) return ''
  const d = toDate(value)
  return i18n.lang === 'ja' ? `${d.getMonth() + 1}月${d.getDate()}日` : `${d.getMonth() + 1}월 ${d.getDate()}일`
}

// 1 -> 01
Vue.filter('pad2', value => String(value).padStart(2, '0'))

const CATEGORY_LABELS = {
  move: '이동',
  stay: '숙소',
  food: '식사',
  tour: '관광',
  shopping: '쇼핑'
}

Vue.filter('category', value => t(CATEGORY_LABELS[value] || '기타'))
