<template>
  <section v-if="dayData">
    <NuxtLink to="/" class="back">{{ $t('← 전체 일정') }}</NuxtLink>

    <header class="day-hero">
      <span class="num">{{ dayData.day | pad2 }}</span>
      <div class="hero-text">
        <p class="eyebrow">DAY {{ dayData.day | pad2 }}</p>
        <h1>{{ $tx(dayData.title) }}</h1>
        <div class="date-row">
          <p class="date">
            {{ dayData.date | koDateLong }}<template v-if="dayData.region"> · {{ $tx(dayData.region) }}</template>
          </p>
          <button v-if="canEdit" type="button" class="add-btn" @click="openAdd()">{{ $t('+ 일정 추가') }}</button>
          <!-- 로그인 안 했으면 버튼이 그냥 사라지지 않고 로그인 안내 -->
          <button
            v-else-if="authReady && !user"
            type="button"
            class="add-btn ghost"
            @click="signIn"
          >
            {{ $t('로그인하고 일정 추가') }}
          </button>
        </div>
      </div>
    </header>

    <ul class="schedule-list">
      <ScheduleItem
        v-for="(item, index) in dayData.schedules"
        :key="`${item.time}-${index}`"
        :schedule="item"
        :editable="canEdit"
        @remove="pendingRemove = index"
        @navigate="$refs.route.openFromHere(item)"
        @memo-edit="openMemo(index)"
        @memo-delete="pendingMemoDelete = index"
      />
    </ul>

    <RouteMap
      ref="route"
      :day="dayData.day"
      :schedules="dayData.schedules"
      :routes="dayData.routes || {}"
      :region="dayData.region || ''"
      @add-place="openAdd"
    />

    <nav class="day-nav">
      <NuxtLink v-if="prevDay" :to="`/days/${prevDay}`">← Day {{ prevDay | pad2 }}</NuxtLink>
      <span v-else />
      <NuxtLink v-if="nextDay" :to="`/days/${nextDay}`">Day {{ nextDay | pad2 }} →</NuxtLink>
    </nav>

    <ScheduleDialog
      :open="addOpen"
      :subtitle="`Day ${dayData.day} · ${$tx(dayData.title)}`"
      :initial="dialogInitial"
      :region="dayData.region || ''"
      @close="closeRouteDialog"
      @submit="add"
    />

    <!-- 시간마다 메모: 쓰기/고치기 -->
    <MemoDialog
      :open="memoOpen"
      :title="memoTitle"
      :initial="memoSchedule ? memoSchedule.memo : ''"
      @close="closeRouteDialog"
      @save="saveMemo"
    />

    <!-- 메모 삭제 확인 -->
    <ConfirmDialog
      :open="pendingMemoDelete !== null"
      :title="$t('메모를 삭제할까요?')"
      :message="memoDeleteMessage"
      :confirm-label="$t('메모 삭제')"
      @cancel="pendingMemoDelete = null"
      @confirm="confirmMemoDelete"
    />

    <ConfirmDialog
      :open="pendingRemove !== null"
      :title="removeTitle"
      :message="$t('삭제하면 되돌릴 수 없어요.')"
      :confirm-label="$t('일정 삭제')"
      @cancel="pendingRemove = null"
      @confirm="confirmRemove"
    />
  </section>
</template>

<script>
import { mapState } from 'vuex'
import routeDialog from '~/mixins/routeDialog'

export default {
  name: 'DayPage',
  mixins: [routeDialog],
  validate ({ params, store }) {
    return !!store.getters.getDay(params.day)
  },
  data () {
    return { dialogInitial: null, authReady: false, pendingRemove: null, memoIndex: null, pendingMemoDelete: null }
  },
  computed: {
    ...mapState(['canEdit', 'user']),
    // 주소가 ?dialog=add 일 때 열림 → 뒤로 가기 스와이프로 닫힘
    addOpen () {
      return this.routeDialog === 'add' && this.canEdit
    },
    // 주소가 ?dialog=memo 일 때 열림 → 뒤로 가기 스와이프로 닫힘
    memoOpen () {
      return this.routeDialog === 'memo' && this.canEdit && !!this.memoSchedule
    },
    memoSchedule () {
      return this.memoIndex !== null ? this.dayData.schedules[this.memoIndex] : null
    },
    memoTitle () {
      const s = this.memoSchedule
      return s ? `${s.time} ${this.$tx(s.place)}` : ''
    },
    memoDeleteMessage () {
      const s = this.pendingMemoDelete !== null && this.dayData.schedules[this.pendingMemoDelete]
      return s ? `${s.time} ${this.$tx(s.place)} — ${this.$tx(s.memo)}` : ''
    },
    removeTitle () {
      const s = this.pendingRemove !== null && this.dayData.schedules[this.pendingRemove]
      return s ? this.$t("{time} '{place}' 일정을 삭제할까요?", { time: s.time, place: this.$tx(s.place) }) : ''
    },
    dayNumber () {
      return Number(this.$route.params.day)
    },
    dayData () {
      return this.$store.getters.getDay(this.dayNumber)
    },
    prevDay () {
      return this.$store.getters.getDay(this.dayNumber - 1) ? this.dayNumber - 1 : null
    },
    nextDay () {
      return this.$store.getters.getDay(this.dayNumber + 1) ? this.dayNumber + 1 : null
    }
  },
  mounted () {
    // 로그인 기능은 브라우저에서만 있음
    this.authReady = !!this.$tripAuth
  },
  methods: {
    async signIn () {
      try {
        await this.$tripAuth.signIn()
      } catch (e) {
        if (e && e.code !== 'auth/popup-closed-by-user') {
          alert(this.$t('로그인하지 못했어요. 팝업 차단을 확인해 주세요.'))
        }
      }
    },
    // 지도에서 고른 장소가 있으면 미리 채워서 열기
    openAdd (initial = null) {
      this.dialogInitial = initial
      this.openRouteDialog('add')
    },
    add (schedule) {
      this.$store.dispatch('addSchedule', { day: this.dayNumber, schedule })
      this.closeRouteDialog()
    },
    openMemo (index) {
      this.memoIndex = index
      this.openRouteDialog('memo')
    },
    saveMemo (memo) {
      if (this.memoIndex !== null) {
        this.$store.dispatch('setMemo', { day: this.dayNumber, index: this.memoIndex, memo })
      }
      this.closeRouteDialog()
    },
    confirmMemoDelete () {
      const index = this.pendingMemoDelete
      this.pendingMemoDelete = null
      if (index !== null) this.$store.dispatch('setMemo', { day: this.dayNumber, index, memo: '' })
    },
    confirmRemove () {
      const index = this.pendingRemove
      this.pendingRemove = null
      if (index !== null) this.$store.dispatch('removeSchedule', { day: this.dayNumber, index })
    }
  },
  head () {
    return { title: this.dayData ? `Day ${this.dayData.day} - ${this.dayData.title}` : '여행 계획' }
  }
}
</script>

<style scoped>
.back { color: var(--muted); font-size: 14px; }
.back:hover { color: var(--accent); }

.day-hero {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  margin: 24px 0 16px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--ink);
}
.num { font-size: 96px; line-height: 0.85; color: var(--accent); }
.hero-text { flex: 1; min-width: 0; }
h1 { margin: 6px 0 4px; font-size: 30px; font-weight: 600; }

.date-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.date { margin: 0; color: var(--muted); }
.add-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--bg);
  font-size: 14px;
  cursor: pointer;
}
.add-btn:hover { background: var(--accent); border-color: var(--accent); }
.add-btn.ghost { background: none; color: var(--ink); }
.add-btn.ghost:hover { color: var(--bg); }

.schedule-list { list-style: none; padding: 0; margin: 0 0 32px; }

.day-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
  font-style: italic;
  color: var(--muted);
}
.day-nav a:hover { color: var(--accent); }

@media (max-width: 480px) {
  .day-hero { gap: 16px; }
  .num { font-size: 64px; }
  h1 { font-size: 24px; }
  .add-btn { padding: 5px 10px; font-size: 13px; }
}
</style>
