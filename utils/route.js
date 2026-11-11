// 일정 → 구간(legs) 만들기, Routes API 로 이동 시간·거리 계산, 표시용 포맷
import { t } from '~/plugins/i18n'

// 이동 수단: 도보만 (대중교통·자동차는 안 씀)
export const MODES = [
  { value: 'walking', label: '도보', api: 'WALK' }
]

export const modeInfo = value => MODES.find(m => m.value === value) || MODES[0]

// 지도 검색어: address(장소 이름) → 없으면 place. 입력한 그대로 씀 (도시 이름을 앞에 붙이지 않음)
// region 인자는 예전 호출 모양을 유지하려고 남겨 둠 (쓰지 않음)
// eslint-disable-next-line no-unused-vars
export function placeQuery (s, region) {
  return (s.address || s.place || '').trim()
}

// 같은 장소인지 비교할 때 쓰는 값 (자동완성으로 고른 장소는 placeId 가 있음)
export function placeKey (s, region) {
  return s.placeId || placeQuery(s, region)
}

// 시간순 일정 → 이어지는 구간 목록
export function buildLegs (schedules, region) {
  const stops = schedules
    .map((s, index) => ({ ...s, index }))
    .filter(s => placeQuery(s, region))
  const legs = []
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i]
    const to = stops[i + 1]
    if (placeKey(from, region) !== placeKey(to, region)) legs.push({ from, to })
  }
  return legs
}

// Firestore 에 저장할 캐시 키 (짧은 해시)
function hash (str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function routeKey (mode, from, to, region) {
  return `${mode}_${hash(`${placeKey(from, region)}→${placeKey(to, region)}`)}`
}

// Routes API 에 넘길 출발/도착 지점
export function toWaypoint (s, region) {
  if (s.lat != null && s.lng != null) {
    return { location: { latLng: { latitude: s.lat, longitude: s.lng } } }
  }
  if (s.placeId) return { placeId: s.placeId }
  return { address: placeQuery(s, region) }
}

// Routes API 호출 (한 번 = 하루 상한 320번 중 1번)
export async function computeRoute (apiKey, origin, destination, mode) {
  const body = {
    origin,
    destination,
    travelMode: modeInfo(mode).api,
    languageCode: 'ko',
    regionCode: 'JP',
    units: 'METRIC'
  }

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = new Error(`경로 계산 실패 (${res.status})`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  const route = data.routes && data.routes[0]
  if (!route) return { none: true }
  return {
    duration: parseInt(route.duration, 10) || 0,
    distance: route.distanceMeters || 0,
    polyline: (route.polyline && route.polyline.encodedPolyline) || ''
  }
}

export function formatDuration (sec) {
  const min = Math.max(1, Math.round(sec / 60))
  if (min < 60) return t('{n}분', { n: min })
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? t('{h}시간 {m}분', { h, m }) : t('{h}시간', { h })
}

export function formatDistance (m) {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)}km`
}

export function formatRoute (info, mode) {
  if (!info) return ''
  if (info.none) return t('경로 없음')
  return `${t(modeInfo(mode).label)} ${formatDuration(info.duration)} · ${formatDistance(info.distance)}`
}

// 키 없이 열리는 구글 지도 길찾기 링크 (앱/웹)
export function googleMapsDirLink (points, mode, region) {
  const q = p => encodeURIComponent(
    p.lat != null && p.lng != null && !p.address && !p.place ? `${p.lat},${p.lng}` : placeQuery(p, region)
  )
  const origin = points[0]
  const dest = points[points.length - 1]
  const waypoints = points.slice(1, -1).map(q).join('%7C')
  return 'https://www.google.com/maps/dir/?api=1' +
    (origin ? `&origin=${q(origin)}` : '') +
    `&destination=${q(dest)}` +
    (waypoints ? `&waypoints=${waypoints}` : '') +
    `&travelmode=${mode}`
}
