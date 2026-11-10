<template>
  <transition name="fade">
    <div v-if="open" class="backdrop" @click.self="close">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="map-dialog-title">
        <header class="head">
          <div class="title-wrap">
            <p class="eyebrow">{{ fromHere ? 'FROM HERE' : 'ROUTE' }}</p>
            <h2 id="map-dialog-title">
              <template v-if="allDay">{{ $t('이날 전체 동선') }}</template>
              <template v-else-if="to">
                <template v-if="from || fromHere">{{ fromLabel }} <span class="arrow">→</span></template>
                {{ $tx(to.place || to.address) }}
              </template>
              <template v-else>{{ $t('지도') }}</template>
            </h2>
          </div>
          <button type="button" class="x" :aria-label="$t('닫기')" @click="close">×</button>
        </header>

        <!-- 이동 수단 -->
        <div v-if="!allDay" class="modes" role="group" :aria-label="$t('이동 수단')">
          <button
            v-for="m in modes"
            :key="m.value"
            type="button"
            :class="{ active: mode === m.value }"
            @click="setMode(m.value)"
          >
            {{ $t(m.label) }}
          </button>
        </div>

        <!-- 구간 고르기 (현재 위치 모드가 아닐 때) -->
        <div v-if="!fromHere && !allDay && legs.length > 1" class="leg-chips">
          <button
            v-for="(leg, i) in legs"
            :key="i"
            type="button"
            :class="{ active: i === legIdx }"
            @click="setLeg(i)"
          >
            {{ i + 1 }}. {{ $tx(leg.to.place) }}
          </button>
        </div>

        <div class="map-wrap">
          <!-- JavaScript 지도 (도보) -->
          <div v-show="!useEmbed" ref="map" class="map" />
          <!-- 무료 지도 (대중교통, 또는 문제가 생겼을 때) -->
          <iframe
            v-if="useEmbed && embedUrl"
            :key="embedUrl"
            :src="embedUrl"
            class="map"
            title="길찾기 지도"
            allowfullscreen
            referrerpolicy="no-referrer-when-downgrade"
            @load="loading = false"
          />

          <div v-if="loading" class="loading" role="status">
            <span class="spinner" aria-hidden="true" />
            <span>{{ $t(loadingText) }}</span>
          </div>

          <!-- 지도에서 장소를 눌렀을 때 -->
          <div v-if="picked" class="picked">
            <div class="picked-text">
              <strong>{{ picked.name }}</strong>
              <small>{{ picked.address }}</small>
            </div>
            <div class="picked-actions">
              <button type="button" class="ghost" @click="picked = null">{{ $t('닫기') }}</button>
              <button type="button" class="primary" @click="addPicked">{{ $t('일정에 추가') }}</button>
            </div>
          </div>
        </div>

        <footer class="foot">
          <p class="info">
            <template v-if="error">{{ $t(error) }}</template>
            <template v-else-if="mode === 'transit' && !allDay">{{ $t('대중교통 경로는 지도에서 확인하세요 (일본은 시간 계산이 지원되지 않아요)') }}</template>
            <template v-else-if="infoText">{{ infoText }}</template>
          </p>
          <p v-if="canEdit && !useEmbed && !picked" class="hint">{{ $t('지도의 장소를 누르면 일정에 추가할 수 있어요') }}</p>
          <div class="links">
            <button v-if="!useEmbed && mode !== 'transit'" type="button" class="link" @click="forceEmbed">{{ $t('간단 지도로 보기') }}</button>
            <a v-if="appLink" :href="appLink" target="_blank" rel="noopener" class="link">{{ $t('구글 지도 앱에서 열기') }}</a>
          </div>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script>
import { importMapsLibrary } from '~/utils/googleMaps'
import {
  MODES, placeQuery, placeKey, routeKey, computeRoute, toWaypoint, formatRoute, formatDuration, formatDistance, googleMapsDirLink
} from '~/utils/route'

export default {
  name: 'MapDialog',
  props: {
    open: { type: Boolean, default: false },
    day: { type: Number, required: true },
    region: { type: String, default: '' },
    legs: { type: Array, default: () => [] },
    initialLeg: { type: Number, default: 0 },
    initialMode: { type: String, default: 'walking' },
    // "현재 위치에서 여기까지" 일 때 목적지 일정
    target: { type: Object, default: null },
    // 하루 전체 동선을 한 지도에 (도보)
    allDay: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false }
  },
  data () {
    return {
      modes: MODES,
      mode: 'walking',
      legIdx: 0,
      here: null,
      loading: false,
      loadingText: '지도 불러오는 중…',
      error: '',
      info: null,
      allInfo: null,
      useEmbed: false,
      embedForced: false,
      picked: null
    }
  },
  computed: {
    apiKey () { return this.$config.googleMapsKey },
    fromHere () { return !!this.target },
    from () {
      if (this.fromHere) return this.here
      const leg = this.legs[this.legIdx]
      return leg ? leg.from : null
    },
    to () {
      if (this.fromHere) return this.target
      const leg = this.legs[this.legIdx]
      return leg ? leg.to : null
    },
    fromLabel () {
      return this.fromHere ? this.$t('현재 위치') : this.$tx(this.from.place || this.from.address)
    },
    infoText () {
      if (this.allDay) {
        if (!this.allInfo) return ''
        return this.$t('도보 합계 {time} · {dist}', {
          time: formatDuration(this.allInfo.duration),
          dist: formatDistance(this.allInfo.distance)
        })
      }
      return formatRoute(this.info, this.mode)
    },
    // 전체 동선의 정류장들 (첫 구간 출발 + 각 구간 도착)
    allStops () {
      if (!this.legs.length) return []
      return [this.legs[0].from, ...this.legs.map(l => l.to)]
    },
    embedUrl () {
      if (!this.apiKey) return ''
      const q = p => encodeURIComponent(
        p.isHere ? `${p.lat},${p.lng}` : placeQuery(p, this.region)
      )
      const base = 'https://www.google.com/maps/embed/v1'
      const key = encodeURIComponent(this.apiKey)
      if (this.allDay) {
        const stops = this.allStops
        if (stops.length < 2) return ''
        const mids = stops.slice(1, -1).slice(0, 20).map(q).join('|')
        return `${base}/directions?key=${key}&origin=${q(stops[0])}&destination=${q(stops[stops.length - 1])}` +
          (mids ? `&waypoints=${mids}` : '') + `&mode=walking&language=${this.$lang}`
      }
      if (!this.to) return ''
      if (!this.from) return `${base}/place?key=${key}&q=${q(this.to)}&language=${this.$lang}`
      return `${base}/directions?key=${key}&origin=${q(this.from)}&destination=${q(this.to)}&mode=${this.mode}&language=${this.$lang}`
    },
    appLink () {
      if (this.allDay) return this.allStops.length > 1 ? googleMapsDirLink(this.allStops, 'walking', this.region) : ''
      if (!this.to) return ''
      const points = this.from && !this.from.isHere ? [this.from, this.to] : [this.to]
      return googleMapsDirLink(points, this.mode, this.region)
    }
  },
  watch: {
    open (value) {
      if (value) {
        document.addEventListener('keydown', this.onKey, true)
        window.addEventListener('gm-auth-failure', this.onAuthFailure)
        this.start()
      } else {
        this.teardown()
      }
    }
  },
  beforeDestroy () {
    this.teardown()
  },
  methods: {
    close () { this.$emit('close') },
    onKey (e) { if (e.key === 'Escape') this.close() },
    onAuthFailure () {
      this.error = '지도를 불러오지 못해 간단 지도로 보여드려요'
      this.forceEmbed()
    },
    teardown () {
      document.removeEventListener('keydown', this.onKey, true)
      window.removeEventListener('gm-auth-failure', this.onAuthFailure)
      this.clearOverlays()
      this.map = null
    },

    async start () {
      this.mode = this.allDay ? 'walking' : this.initialMode
      this.legIdx = this.initialLeg
      this.allInfo = null
      this.error = ''
      this.info = null
      this.picked = null
      this.embedForced = false
      this.here = null
      this.map = null
      if (this.fromHere) {
        const ok = await this.locate()
        if (!ok) {
          // 위치를 못 받아도 목적지는 지도에 보여줌.
          // 좌표를 알면 Ctrl 안내가 없는 지도(JS)로, 모르면 무료 지도(Embed)로
          const err = this.error
          const shown = await this.showPlaceOnly(this.target)
          this.error = err
          if (!shown) {
            this.embedForced = true
            this.useEmbed = true
            this.loading = true
            this.loadingText = '지도 불러오는 중…'
          }
          return
        }
      }
      this.render()
    },

    // 브라우저 위치 (무료, 요금 없음)
    locate () {
      this.loading = true
      this.loadingText = '현재 위치 확인 중…'
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          this.loading = false
          this.error = '이 브라우저는 위치 확인을 지원하지 않아요'
          return resolve(false)
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.here = { isHere: true, lat: pos.coords.latitude, lng: pos.coords.longitude }
            resolve(true)
          },
          (err) => {
            this.loading = false
            this.error = err.code === 1
              ? '위치 권한이 꺼져 있어요. 브라우저 설정에서 위치 권한을 허용해 주세요.'
              : '현재 위치를 찾지 못했어요'
            resolve(false)
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        )
      })
    },

    setMode (mode) {
      if (mode === this.mode) return
      this.mode = mode
      this.render()
    },
    setLeg (i) {
      this.legIdx = i
      this.picked = null
      this.render()
    },
    forceEmbed () {
      this.embedForced = true
      this.render()
    },

    async render () {
      if (this.allDay) return this.renderAll()
      if (!this.to) return
      this.error = this.error && this.embedForced ? this.error : ''
      this.info = null
      this.loading = true
      this.loadingText = '지도 불러오는 중…'

      // 대중교통은 구글 API 가 일본 경로를 주지 않아 무료 지도(Embed)로 보여줌
      if (this.mode === 'transit' || this.embedForced) {
        this.useEmbed = true
        return
      }

      this.useEmbed = false
      try {
        await this.ensureMap()
        this.loadingText = '경로 계산 중…'
        const info = this.fromHere
          ? await computeRoute(this.apiKey, toWaypoint(this.here), toWaypoint(this.to, this.region), this.mode)
          : await this.$store.dispatch('routeFor', { day: this.day, leg: this.legs[this.legIdx], mode: this.mode })
        this.info = info
        await this.draw(info)
      } catch (e) {
        console.warn('[map]', e)
        this.error = e.status === 429
          ? '오늘 경로 계산 한도(320번)에 도달해서 간단 지도로 보여드려요'
          : '경로를 불러오지 못해 간단 지도로 보여드려요'
        this.embedForced = true
        this.useEmbed = true
        return
      }
      this.loading = false
    },

    // 하루 전체 동선: 구간마다 도보 경로(저장된 값 우선)를 이어서 한 지도에
    async renderAll () {
      this.error = this.error && this.embedForced ? this.error : ''
      this.loading = true
      this.loadingText = '지도 불러오는 중…'
      if (this.embedForced) {
        this.useEmbed = true
        return
      }
      this.useEmbed = false
      try {
        await this.ensureMap()
        this.loadingText = '경로 계산 중…'
        const infos = []
        for (const leg of this.legs) {
          infos.push(await this.$store.dispatch('routeFor', { day: this.day, leg, mode: 'walking' }))
        }
        this.allInfo = infos.reduce((sum, i) => ({
          duration: sum.duration + ((i && i.duration) || 0),
          distance: sum.distance + ((i && i.distance) || 0)
        }), { duration: 0, distance: 0 })
        await this.drawAll(infos)
      } catch (e) {
        console.warn('[map]', e)
        this.error = e.status === 429
          ? '오늘 경로 계산 한도(320번)에 도달해서 간단 지도로 보여드려요'
          : '경로를 불러오지 못해 간단 지도로 보여드려요'
        this.embedForced = true
        this.useEmbed = true
        return
      }
      this.loading = false
    },

    async drawAll (infos) {
      this.clearOverlays()
      const { encoding } = await importMapsLibrary(this.apiKey, 'geometry')
      const g = window.google.maps
      const bounds = new g.LatLngBounds()
      const overlays = []
      const stopPoints = []
      infos.forEach((info, i) => {
        if (!info || info.none || !info.polyline) return
        const path = encoding.decodePath(info.polyline)
        overlays.push(new g.Polyline({ path, map: this.map, strokeColor: '#c0583a', strokeOpacity: 0.9, strokeWeight: 5 }))
        path.forEach(p => bounds.extend(p))
        if (!stopPoints[i]) stopPoints[i] = path[0]
        stopPoints[i + 1] = path[path.length - 1]
      })
      // 정류장 번호 1, 2, 3 …
      stopPoints.forEach((p, i) => {
        if (p) overlays.push(new g.Marker({ position: p, map: this.map, label: { text: String(i + 1), color: '#fff' } }))
      })
      this.overlays = overlays
      if (!bounds.isEmpty()) this.map.fitBounds(bounds, 40)
      else this.error = '이 이동 수단으로는 경로를 찾지 못했어요'
    },

    // 일정 장소의 좌표: 장소 검색으로 고른 좌표 → 없으면 저장된 도보 경로의 끝점에서 찾음 (추가 요금 없음)
    async coordsOf (stop) {
      if (stop.lat != null && stop.lng != null) return { lat: stop.lat, lng: stop.lng }
      const day = this.$store.getters.getDay(this.day)
      const routes = (day && day.routes) || {}
      const key = placeKey(stop, this.region)
      const { encoding } = await importMapsLibrary(this.apiKey, 'geometry')
      for (const leg of this.legs) {
        const info = routes[routeKey('walking', leg.from, leg.to, this.region)]
        if (!info || !info.polyline) continue
        const path = encoding.decodePath(info.polyline)
        if (placeKey(leg.to, this.region) === key) return path[path.length - 1].toJSON()
        if (placeKey(leg.from, this.region) === key) return path[0].toJSON()
      }
      return null
    },

    // 경로 없이 장소 하나만 JS 지도에 표시. 성공하면 true
    async showPlaceOnly (stop) {
      try {
        const pos = await this.coordsOf(stop)
        if (!pos) return false
        this.useEmbed = false
        this.loading = true
        this.loadingText = '지도 불러오는 중…'
        await this.ensureMap()
        this.clearOverlays()
        const g = window.google.maps
        this.overlays = [new g.Marker({ position: pos, map: this.map })]
        this.map.setCenter(pos)
        this.map.setZoom(16)
        this.loading = false
        return true
      } catch (e) {
        console.warn('[map]', e)
        return false
      }
    },

    async ensureMap () {
      if (this.map) return
      const { Map } = await importMapsLibrary(this.apiKey, 'maps')
      await this.$nextTick()
      this.map = new Map(this.$refs.map, {
        center: { lat: 35.681, lng: 139.767 },
        zoom: 12,
        // 한 손가락으로 바로 움직이고, Ctrl/두 손가락 안내가 안 뜸
        gestureHandling: 'greedy',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: true
      })
      this.map.addListener('click', this.onMapClick)
    },

    clearOverlays () {
      (this.overlays || []).forEach(o => o.setMap(null))
      this.overlays = []
    },

    async draw (info) {
      this.clearOverlays()
      if (!info || info.none || !info.polyline) {
        this.error = '이 이동 수단으로는 경로를 찾지 못했어요'
        return
      }
      const { encoding } = await importMapsLibrary(this.apiKey, 'geometry')
      const g = window.google.maps
      const path = encoding.decodePath(info.polyline)
      const line = new g.Polyline({
        path,
        map: this.map,
        strokeColor: '#c0583a',
        strokeOpacity: 0.9,
        strokeWeight: 5
      })
      const start = new g.Marker({ position: path[0], map: this.map, label: { text: 'A', color: '#fff' } })
      const end = new g.Marker({ position: path[path.length - 1], map: this.map, label: { text: 'B', color: '#fff' } })
      this.overlays = [line, start, end]
      const bounds = new g.LatLngBounds()
      path.forEach(p => bounds.extend(p))
      this.map.fitBounds(bounds, 40)
    },

    // 지도의 장소(가게·역 등)를 눌렀을 때 → 일정에 추가할 수 있게
    async onMapClick (e) {
      if (!e.placeId || !this.canEdit) return
      e.stop()
      try {
        const { Place } = await importMapsLibrary(this.apiKey, 'places')
        const place = new Place({ id: e.placeId, requestedLanguage: this.$lang })
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] })
        this.picked = {
          name: place.displayName,
          address: place.formattedAddress,
          placeId: place.id,
          lat: place.location.lat(),
          lng: place.location.lng()
        }
      } catch (err) {
        console.warn('[place]', err)
        this.error = '장소 정보를 불러오지 못했어요'
      }
    },

    addPicked () {
      const p = this.picked
      this.$emit('add-place', { place: p.name, address: p.name, placeId: p.placeId, lat: p.lat, lng: p.lng })
      this.picked = null
    }
  }
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(43, 38, 34, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.sheet {
  width: 100%;
  max-width: 720px;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border: 1px solid var(--line);
  box-shadow: 0 12px 40px rgba(43, 38, 34, 0.2);
}
.head, .modes, .leg-chips, .foot { flex-shrink: 0; }
.head { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px 10px; }
.title-wrap { min-width: 0; }
.head h2 { margin: 4px 0 0; font-size: 18px; font-weight: 600; }
.arrow { color: var(--accent); }
.x { border: none; background: none; font-size: 26px; line-height: 1; color: var(--muted); cursor: pointer; }
.x:hover { color: var(--accent); }

.modes { display: flex; gap: 6px; padding: 0 20px 10px; }
.modes button, .leg-chips button {
  border: 1px solid var(--line);
  background: none;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  color: var(--muted);
  white-space: nowrap;
}
.modes button.active, .leg-chips button.active { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.leg-chips { display: flex; gap: 6px; padding: 0 20px 10px; overflow-x: auto; }

.map-wrap { position: relative; height: 60vh; min-height: 320px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.map { width: 100%; height: 100%; border: 0; display: block; }
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--surface);
  font-size: 13px;
  font-style: italic;
  color: var(--muted);
}
.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--line);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.picked {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  background: var(--bg);
  border: 1px solid var(--line);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 6px 20px rgba(43, 38, 34, 0.2);
}
.picked-text { flex: 1; min-width: 0; }
.picked-text strong { display: block; }
.picked-text small { color: var(--muted); font-size: 12px; }
.picked-actions { display: flex; gap: 6px; flex-shrink: 0; }
.picked-actions button { padding: 6px 12px; cursor: pointer; border: 1px solid var(--ink); font-size: 13px; }
.ghost { background: none; color: var(--ink); }
.primary { background: var(--ink); color: var(--bg); }
.primary:hover { background: var(--accent); border-color: var(--accent); }

.foot { padding: 10px 20px 16px; }
.info { margin: 0; font-size: 15px; min-height: 1.4em; }
.hint { margin: 4px 0 0; font-size: 12px; color: var(--muted); }
.links { display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap; }
.link { border: none; background: none; padding: 0; font-size: 13px; color: var(--muted); cursor: pointer; }
.link:hover { color: var(--accent); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter, .fade-leave-to { opacity: 0; }

@media (max-width: 600px) {
  .backdrop { padding: 0; align-items: flex-end; }
  .sheet { max-height: 100vh; height: 100vh; border: none; }
  .map-wrap { flex: 1; height: auto; }
  .picked { flex-direction: column; align-items: stretch; }
}
</style>
