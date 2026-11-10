import trip from '~/data/trip'
import { buildLegs, routeKey, toWaypoint, computeRoute, MODES } from '~/utils/route'
import { collectTexts, translateToJa } from '~/utils/translate'

// 원본 데이터가 변경되지 않도록 복사해서 사용
const defaultTrip = () => JSON.parse(JSON.stringify(trip))

// 일본에서는 구글 API 가 대중교통 경로를 주지 않아 도보만 계산 (대중교통은 지도에서 확인)
export const COMPUTABLE_MODES = ['walking']

// 같은 구간을 동시에 두 번 계산하지 않도록
const inflight = new Set()
let translating = false

// 지금 로그인한 사람 이름: '동욱' / '유나' (목록에 없으면 구글 이름)
const authorName = state => (state.user && (state.user.member || state.user.name)) || null

export const state = () => ({
  trip: defaultTrip(),
  // 저장 상태: disabled(DB 미설정) | loading | saving | saved | error
  sync: 'loading',
  // 로그인한 사용자 { email, name, photo } 또는 null
  user: null,
  // 이 계정이 일정을 고칠 수 있는지 (Firestore 규칙의 편집자 목록에 있는지)
  canEdit: false,
  // 오늘 Routes API 상한에 걸렸는지
  routesBlocked: false,
  // 오늘 번역 API 상한에 걸렸는지
  translateBlocked: false,
  // 로그인 상태 확인이 끝났는지 (끝나기 전엔 로딩 화면)
  authChecked: false
})

export const getters = {
  days: state => state.trip.days,
  getDay: state => dayNumber =>
    state.trip.days.find(d => d.day === Number(dayNumber))
}

// '2026-12-12' + 1일 → '2026-12-13'
function nextDate (date) {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export const mutations = {
  SET_TRIP (state, trip) {
    state.trip = trip
  },
  // 마지막 날 다음 날짜로 하루 추가 + 여행 마지막 날짜도 같이 바꿈
  ADD_DAY (state) {
    const days = state.trip.days
    const last = days[days.length - 1]
    const date = last ? nextDate(last.date) : state.trip.startDate
    days.push({
      day: last ? last.day + 1 : 1,
      date,
      region: last ? last.region : '',
      title: '자유 일정',
      schedules: []
    })
    state.trip.endDate = date
  },
  // 하루 삭제 (최소 하루는 남김). 날짜가 끊기지 않게:
  // - 첫날 삭제: 여행 시작일이 하루 늦어지고 나머지 날짜는 그대로
  // - 중간/마지막 삭제: 뒤의 날들이 하루씩 앞당겨짐
  // 그 뒤 Day 번호를 1부터 다시 매기고 시작일·마지막 날을 맞춤
  REMOVE_DAY (state, dayNumber) {
    const days = state.trip.days
    if (days.length <= 1) return
    const index = days.findIndex(d => d.day === dayNumber)
    if (index < 0) return
    if (index > 0) {
      for (let i = days.length - 1; i > index; i--) days[i].date = days[i - 1].date
    }
    days.splice(index, 1)
    days.forEach((d, i) => { d.day = i + 1 })
    state.trip.startDate = days[0].date
    state.trip.endDate = days[days.length - 1].date
  },
  SET_SYNC (state, status) {
    state.sync = status
  },
  SET_USER (state, user) {
    state.user = user
  },
  SET_CAN_EDIT (state, value) {
    state.canEdit = value
  },
  SET_ROUTES_BLOCKED (state, value) {
    state.routesBlocked = value
  },
  SET_AUTH_CHECKED (state, value) {
    state.authChecked = value
  },
  SET_TRANSLATE_BLOCKED (state, value) {
    state.translateBlocked = value
  },
  // 번역 사전에 추가 { '한국어': '日本語' }
  MERGE_TR (state, entries) {
    state.trip = { ...state.trip, tr: { ...(state.trip.tr || {}), ...entries } }
  },
  // 더 이상 쓰지 않는 글자의 번역은 지움
  PRUNE_TR (state, keep) {
    const tr = state.trip.tr || {}
    const next = {}
    keep.forEach((k) => { if (tr[k] !== undefined) next[k] = tr[k] })
    state.trip = { ...state.trip, tr: next }
  },
  ADD_SCHEDULE (state, { day, schedule }) {
    const target = state.trip.days.find(d => d.day === day)
    if (target) {
      target.schedules.push(schedule)
      target.schedules.sort((a, b) => a.time.localeCompare(b.time))
    }
  },
  // 일정 메모 쓰기/고치기/지우기 (빈 글자면 지움)
  SET_MEMO (state, { day, index, memo, by }) {
    const target = state.trip.days.find(d => d.day === day)
    const s = target && target.schedules[index]
    if (!s) return
    s.memo = (memo || '').trim()
    // 메모를 쓴 사람 (지우면 같이 지움)
    if (s.memo && by) s.memoBy = by
    if (!s.memo) delete s.memoBy
  },
  REMOVE_SCHEDULE (state, { day, index }) {
    const target = state.trip.days.find(d => d.day === day)
    if (target) target.schedules.splice(index, 1)
  },
  SET_ROUTE (state, { day, key, info }) {
    const target = state.trip.days.find(d => d.day === day)
    if (!target) return
    target.routes = { ...(target.routes || {}), [key]: info }
  },
  // 지금 일정에 없는 구간의 캐시는 지움
  PRUNE_ROUTES (state, { day, keep }) {
    const target = state.trip.days.find(d => d.day === day)
    if (!target || !target.routes) return
    const next = {}
    Object.keys(target.routes).forEach((k) => { if (keep.includes(k)) next[k] = target.routes[k] })
    target.routes = next
  }
}

export const actions = {
  // Firestore 에서 일정 불러오기. 처음이면 data/trip.js 내용으로 문서를 만든다(편집 권한이 있을 때).
  async loadTrip ({ commit, state, dispatch }) {
    if (!this.$tripDb) return
    commit('SET_SYNC', 'loading')
    try {
      const saved = await this.$tripDb.load()
      if (saved) {
        commit('SET_TRIP', saved)
      } else if (state.canEdit) {
        await this.$tripDb.save(state.trip)
      }
      commit('SET_SYNC', 'saved')
      dispatch('ensureTranslations')
    } catch (e) {
      console.error('[firestore] 불러오기 실패', e)
      commit('SET_SYNC', 'error')
    }
  },

  async saveTrip ({ commit, state }) {
    if (!this.$tripDb || !state.canEdit) return
    commit('SET_SYNC', 'saving')
    try {
      await this.$tripDb.save(state.trip)
      commit('SET_SYNC', 'saved')
    } catch (e) {
      console.error('[firestore] 저장 실패', e)
      commit('SET_SYNC', 'error')
    }
  },

  async addDay ({ state, commit, dispatch }) {
    if (!state.canEdit) return
    commit('ADD_DAY')
    await dispatch('saveTrip')
    dispatch('ensureTranslations')
  },

  async removeDay ({ state, commit, dispatch }, dayNumber) {
    if (!state.canEdit || state.trip.days.length <= 1) return
    commit('REMOVE_DAY', dayNumber)
    await dispatch('saveTrip')
    dispatch('ensureTranslations')
  },

  async addSchedule ({ state, commit, dispatch }, { day, schedule }) {
    // 장소 검색으로 고른 장소는 구글의 일본어 이름(jaName)을 번역 대신 씀 (더 정확)
    const { jaName, ...rest } = schedule
    // 일정을 추가한 사람
    const by = authorName(state)
    if (by) rest.by = by
    if (jaName && rest.address) commit('MERGE_TR', { [rest.address.trim()]: jaName })
    commit('ADD_SCHEDULE', { day, schedule: rest })
    await dispatch('saveTrip')
    dispatch('ensureTranslations')
  },

  // 아직 번역 안 된 글자만 모아서 일본어로 번역하고 저장 (편집자만 → 남이 한도를 쓰지 않음)
  async ensureTranslations ({ state, commit, dispatch }) {
    const apiKey = this.$config.googleMapsKey
    if (!apiKey || !state.canEdit || state.translateBlocked || translating) return
    translating = true
    try {
      const texts = collectTexts(state.trip)
      const tr = state.trip.tr || {}
      const missing = texts.filter(t => tr[t] === undefined)
      const stale = Object.keys(tr).some(k => !texts.includes(k))
      if (!missing.length && !stale) return

      if (missing.length) {
        const result = await translateToJa(apiKey, missing)
        commit('MERGE_TR', result)
      }
      commit('PRUNE_TR', texts)
      await dispatch('saveTrip')
    } catch (e) {
      console.warn('[translate]', e.message)
      // 429: 하루 상한 도달, 403: 권한/키 문제 → 오늘은 더 부르지 않음
      if (e.status === 429 || e.status === 403) commit('SET_TRANSLATE_BLOCKED', true)
    } finally {
      translating = false
    }
  },

  async setMemo ({ state, commit, dispatch }, payload) {
    if (!state.canEdit) return
    commit('SET_MEMO', { ...payload, by: authorName(state) })
    await dispatch('saveTrip')
    dispatch('ensureTranslations')
  },

  async removeSchedule ({ commit, dispatch }, payload) {
    commit('REMOVE_SCHEDULE', payload)
    await dispatch('saveTrip')
  },

  // 그날 구간들의 이동 시간·거리를 계산해서 캐시에 저장 (이미 계산한 구간은 다시 부르지 않음)
  async ensureRoutes ({ state, getters, commit, dispatch }, { day, mode }) {
    const apiKey = this.$config.googleMapsKey
    const target = getters.getDay(day)
    if (!apiKey || !target || !COMPUTABLE_MODES.includes(mode)) return
    // 편집자(두 분)만 계산 → 결과가 저장되어 다른 사람은 저장된 값만 봄. 남이 한도를 쓰지 않게 함
    if (!state.canEdit) return

    const legs = buildLegs(target.schedules, target.region)
    const keep = []
    legs.forEach((leg) => {
      MODES.forEach(m => keep.push(routeKey(m.value, leg.from, leg.to, target.region)))
    })
    const before = Object.keys(target.routes || {}).length
    commit('PRUNE_ROUTES', { day, keep })
    let changed = Object.keys(target.routes || {}).length !== before

    for (const leg of legs) {
      if (state.routesBlocked) break
      const key = routeKey(mode, leg.from, leg.to, target.region)
      if ((target.routes && target.routes[key]) || inflight.has(key)) continue
      inflight.add(key)
      try {
        const info = await computeRoute(
          apiKey,
          toWaypoint(leg.from, target.region),
          toWaypoint(leg.to, target.region),
          mode
        )
        commit('SET_ROUTE', { day, key, info })
        changed = true
      } catch (e) {
        console.warn('[routes]', e.message)
        // 429: 하루 상한 도달, 403: 권한/키 문제 → 오늘은 더 부르지 않음
        if (e.status === 429 || e.status === 403) commit('SET_ROUTES_BLOCKED', true)
      } finally {
        inflight.delete(key)
      }
    }

    if (changed) await dispatch('saveTrip')
  },

  // 지도 다이얼로그에서 쓰는 한 구간 경로 (캐시 우선, 없으면 계산)
  async routeFor ({ state, getters, commit, dispatch }, { day, leg, mode }) {
    const target = getters.getDay(day)
    const key = routeKey(mode, leg.from, leg.to, target.region)
    if (target.routes && target.routes[key]) return target.routes[key]
    if (state.routesBlocked) throw Object.assign(new Error('오늘 경로 계산 한도에 도달했어요'), { status: 429 })
    try {
      const info = await computeRoute(
        this.$config.googleMapsKey,
        toWaypoint(leg.from, target.region),
        toWaypoint(leg.to, target.region),
        mode
      )
      commit('SET_ROUTE', { day, key, info })
      dispatch('saveTrip')
      return info
    } catch (e) {
      if (e.status === 429 || e.status === 403) commit('SET_ROUTES_BLOCKED', true)
      throw e
    }
  }
}
