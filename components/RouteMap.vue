<template>
  <section class="route-map">
    <div class="head">
      <p class="eyebrow">{{ $t('동선') }}</p>
      <span class="basis">{{ $t('도보 기준 시간') }}</span>
    </div>

    <ol v-if="legs.length" class="legs">
      <li v-for="(leg, i) in legs" :key="i">
        <span class="leg-num">{{ i + 1 }}</span>
        <div class="leg-text">
          <span>{{ $tx(leg.from.place) }} <span class="arrow">→</span> {{ $tx(leg.to.place) }}</span>
          <small>
            {{ leg.from.time }} – {{ leg.to.time }}
            <template v-if="infoFor(leg)"> · <b>{{ infoFor(leg) }}</b></template>
            <template v-else-if="routesBlocked"> · {{ $t('오늘 계산 한도 도달') }}</template>
            <template v-else-if="computing"> · {{ $t('계산 중…') }}</template>
          </small>
        </div>
        <div class="leg-actions">
          <button type="button" class="btn btn-chip leg-btn" @click="openMap(i, 'transit')">{{ $t('대중교통') }}</button>
          <button type="button" class="btn btn-chip leg-btn" @click="openMap(i, 'walking')">{{ $t('도보') }}</button>
        </div>
      </li>
    </ol>
    <p v-else class="empty">{{ $t('장소가 있는 일정이 2개 이상이면 구간별 이동 경로가 나와요.') }}</p>

    <div v-if="legs.length" class="foot">
      <button type="button" class="btn btn-primary map-btn" @click="openMap(0, 'walking')">{{ $t('지도 보기') }}</button>
      <button type="button" class="btn btn-glass btn-sm all-route" @click="openAll">{{ $t('이날 전체 동선 보기') }}</button>
    </div>

    <MapDialog
      :open="mapOpen"
      :day="day"
      :region="region"
      :legs="legs"
      :initial-leg="dialog.leg"
      :initial-mode="dialog.mode"
      :target="dialog.target"
      :all-day="dialog.all"
      :can-edit="canEdit"
      @close="closeRouteDialog"
      @add-place="onAddPlace"
    />
  </section>
</template>

<script>
import { mapState } from 'vuex'
import { buildLegs, routeKey, formatRoute } from '~/utils/route'
import routeDialog from '~/mixins/routeDialog'

export default {
  name: 'RouteMap',
  mixins: [routeDialog],
  props: {
    day: { type: Number, required: true },
    schedules: { type: Array, required: true },
    routes: { type: Object, default: () => ({}) },
    region: { type: String, default: '' }
  },
  data () {
    return {
      mode: 'walking',
      computing: false,
      dialog: { leg: 0, mode: 'walking', target: null, all: false }
    }
  },
  computed: {
    ...mapState(['sync', 'canEdit', 'routesBlocked']),
    // 주소가 ?dialog=map 일 때 열림 → 뒤로 가기 스와이프로 닫힘
    mapOpen () {
      return this.routeDialog === 'map'
    },
    legs () {
      return buildLegs(this.schedules, this.region)
    },
    // 일정·모드가 바뀌면 다시 계산 (이미 계산한 구간은 캐시 사용)
    trigger () {
      return [this.sync === 'loading', this.canEdit, this.mode, this.legs.map(l => routeKey('x', l.from, l.to, this.region)).join()].join('|')
    }
  },
  watch: {
    trigger: { handler: 'compute', immediate: true }
  },
  methods: {
    infoFor (leg) {
      const info = this.routes && this.routes[routeKey(this.mode, leg.from, leg.to, this.region)]
      return formatRoute(info, this.mode)
    },
    async compute () {
      // Firestore 에서 일정을 다 불러온 다음에 계산 (브라우저에서만)
      if (process.server || this.sync === 'loading' || !this.legs.length) return
      this.computing = true
      try {
        await this.$store.dispatch('ensureRoutes', { day: this.day, mode: this.mode })
      } finally {
        this.computing = false
      }
    },
    openMap (leg, mode) {
      this.dialog = { leg, mode, target: null, all: false }
      this.openRouteDialog('map')
    },
    // ScheduleItem 의 "여기까지 길찾기" 에서 부름
    openFromHere (schedule) {
      this.dialog = { leg: 0, mode: 'walking', target: schedule, all: false }
      this.openRouteDialog('map')
    },
    // 하루 전체 동선을 내 지도 창에서
    openAll () {
      this.dialog = { leg: 0, mode: 'walking', target: null, all: true }
      this.openRouteDialog('map')
    },
    // 지도 → 일정 추가: 부모가 ?dialog=add 로 바꿔서 지도 다이얼로그는 저절로 닫힘
    onAddPlace (place) {
      this.$emit('add-place', place)
    }
  }
}
</script>

<style scoped>
.route-map { margin: 40px 0; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 12px; }
.basis { font-size: 12px; color: var(--muted); }

.legs { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
.legs li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--line);
  font-size: 15px;
}
.leg-num { font-style: italic; color: var(--accent); width: 18px; flex-shrink: 0; }
.leg-text { flex: 1; min-width: 0; }
.leg-text small { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; }
.leg-text b { color: var(--ink); font-weight: 600; }
.arrow { color: var(--accent); }
.leg-actions { display: flex; gap: 6px; flex-shrink: 0; }

.empty { color: var(--muted); font-size: 14px; }
.foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; flex-wrap: wrap; }

@media (max-width: 480px) {
  .legs li { flex-wrap: wrap; }
  .leg-actions { width: 100%; justify-content: flex-end; }
}
</style>
