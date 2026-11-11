<template>
  <section v-if="!dayData" class="missing">
    <p>{{ $t('없는 날짜예요') }}</p>
    <NuxtLink to="/" class="btn btn-chip back">{{ $t('← 전체 일정') }}</NuxtLink>
  </section>
  <section v-else>
    <NuxtLink to="/" class="btn btn-chip back">{{ $t('← 전체 일정') }}</NuxtLink>

    <header class="day-hero rise">
      <span class="num">{{ dayData.day | pad2 }}</span>
      <div class="hero-text">
        <div class="eyebrow-row">
          <p class="eyebrow">{{ $t('{day}일차', { day: dayData.day }) }}</p>
          <button v-if="canEdit" type="button" class="btn btn-chip edit-day" @click="openRouteDialog('day')">{{ $t('수정') }}</button>
        </div>
        <h1>{{ $tx(dayData.title) }}</h1>
        <div class="date-row">
          <p class="date date-line">
            <span class="date-text">{{ dayData.date | koDateLong }}</span>
            <span v-if="dayData.region" class="city-tag">{{ $tx(dayData.region) }}</span>
          </p>
          <button v-if="canEdit" type="button" class="btn btn-primary add-btn" @click="openAdd()">{{ $t('+ 일정 추가') }}</button>
          <!-- 로그인 안 했으면 버튼이 그냥 사라지지 않고 로그인 안내 -->
          <button
            v-else-if="authReady && !user"
            type="button"
            class="btn btn-glass add-btn"
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
        class="rise"
        :style="{ '--i': staggered ? index + 1 : 0 }"
        :schedule="item"
        :editable="canEdit"
        @remove="pendingRemove = index"
        @edit="openEdit(index)"
        @navigate="$refs.route.openFromHere(item)"
        @comment-add="addComment(index, $event)"
        @comment-edit="openMemo(index, $event)"
        @comment-delete="pendingMemoDelete = { index, ci: $event }"
      />
    </ul>

    <RouteMap
      class="rise"
      :style="{ '--i': staggered ? dayData.schedules.length + 1 : 0 }"
      ref="route"
      :day="dayData.day"
      :schedules="dayData.schedules"
      :routes="dayData.routes || {}"
      :region="dayData.region || ''"
      @add-place="openAdd"
    />

    <nav class="day-nav">
      <NuxtLink v-if="prevDay" :to="`/days/${prevDay}`" class="btn btn-glass">← {{ $t('{day}일차', { day: prevDay }) }}</NuxtLink>
      <span v-else />
      <NuxtLink v-if="nextDay" :to="`/days/${nextDay}`" class="btn btn-glass">{{ $t('{day}일차', { day: nextDay }) }} →</NuxtLink>
    </nav>

    <ScheduleDialog
      :open="addOpen || editOpen"
      :editing="editOpen"
      :subtitle="`${$t('{day}일차', { day: dayData.day })} · ${$tx(dayData.title)}`"
      :initial="editOpen ? editInitial : dialogInitial"
      :near="dayCenter"
      @close="closeRouteDialog"
      @submit="onScheduleSubmit"
    />

    <!-- 날짜 수정: 제목·날짜·도시 -->
    <DayDialog
      :open="dayOpen"
      :day="dayData"
      :taken-dates="takenDates"
      @close="closeRouteDialog"
      @save="saveDay"
    />

    <!-- 시간마다 메모: 쓰기/고치기 -->
    <MemoDialog
      :open="memoOpen"
      :title="memoTitle"
      :initial="memoComment ? memoComment.text : ''"
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
import { commentList } from '~/store'

export default {
  name: 'DayPage',
  mixins: [routeDialog],
  data () {
    return { dialogInitial: null, authReady: false, pendingRemove: null, memoIndex: null, memoCi: null, pendingMemoDelete: null, editIndex: null, staggered: true }
  },
  computed: {
    ...mapState(['canEdit', 'user']),
    // 주소가 ?dialog=add 일 때 열림 → 뒤로 가기 스와이프로 닫힘
    addOpen () {
      return this.routeDialog === 'add' && this.canEdit
    },
    // ?dialog=edit: 일정 수정
    editOpen () {
      return this.routeDialog === 'edit' && this.canEdit && this.editIndex !== null && !!this.dayData.schedules[this.editIndex]
    },
    editInitial () {
      const s = this.editIndex !== null && this.dayData.schedules[this.editIndex]
      if (!s) return null
      return { time: s.time, place: s.place, address: s.address || '', placeId: s.placeId || null, lat: s.lat != null ? s.lat : null, lng: s.lng != null ? s.lng : null }
    },
    // ?dialog=day: 날짜 수정
    dayOpen () {
      return this.routeDialog === 'day' && this.canEdit
    },
    // 다른 날에 쓰인 날짜 (같은 날짜 두 번 못 쓰게)
    takenDates () {
      return this.$store.getters.days.filter(d => d.day !== this.dayNumber).map(d => d.date)
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
    // 고치는 중인 댓글
    memoComment () {
      const s = this.memoSchedule
      return s && this.memoCi !== null ? commentList(s)[this.memoCi] : null
    },
    memoDeleteMessage () {
      const p = this.pendingMemoDelete
      const s = p && this.dayData.schedules[p.index]
      const c = s && commentList(s)[p.ci]
      return c ? `${s.time} ${this.$tx(s.place)} — ${p.ci + 1}. ${this.$tx(c.text)}` : ''
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
    // 이날 일정 장소들의 가운데 (장소 검색에서 근처를 먼저 보여줄 때 씀). 좌표가 없으면 null
    dayCenter () {
      const pts = ((this.dayData && this.dayData.schedules) || []).filter(s => s.lat != null && s.lng != null)
      if (!pts.length) return null
      return {
        lat: pts.reduce((a, s) => a + s.lat, 0) / pts.length,
        lng: pts.reduce((a, s) => a + s.lng, 0) / pts.length
      }
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
    // 처음 열 때만 일정이 하나씩 차례로 (나중에 추가한 건 바로 나타남)
    setTimeout(() => { this.staggered = false }, 1200)
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
    openEdit (index) {
      this.editIndex = index
      this.openRouteDialog('edit')
    },
    // 추가 창/수정 창 공통 "추가·저장"
    onScheduleSubmit (schedule) {
      if (this.editOpen) {
        const { memo, ...rest } = schedule // 메모는 메모칸에서 따로 관리
        this.$store.dispatch('updateSchedule', { day: this.dayNumber, index: this.editIndex, schedule: rest })
        this.closeRouteDialog()
      } else {
        this.add(schedule)
      }
    },
    async saveDay (form) {
      const newDay = await this.$store.dispatch('updateDay', { day: this.dayNumber, ...form })
      this.closeRouteDialog()
      // 날짜를 바꿔 순서(Day 번호)가 달라졌으면 그 번호의 페이지로
      if (newDay && newDay !== this.dayNumber) {
        setTimeout(() => this.$router.replace(`/days/${newDay}`), 300)
      }
    },
    addComment (index, text) {
      this.$store.dispatch('addComment', { day: this.dayNumber, index, text })
    },
    // 댓글 고치기 창
    openMemo (index, ci) {
      this.memoIndex = index
      this.memoCi = ci
      this.openRouteDialog('memo')
    },
    saveMemo (text) {
      if (this.memoIndex !== null && this.memoCi !== null) {
        // 내용을 다 지우고 저장하면 그 댓글 삭제
        const action = text.trim() ? 'updateComment' : 'removeComment'
        this.$store.dispatch(action, { day: this.dayNumber, index: this.memoIndex, ci: this.memoCi, text })
      }
      this.closeRouteDialog()
    },
    confirmMemoDelete () {
      const p = this.pendingMemoDelete
      this.pendingMemoDelete = null
      if (p) this.$store.dispatch('removeComment', { day: this.dayNumber, index: p.index, ci: p.ci })
    },
    confirmRemove () {
      const index = this.pendingRemove
      this.pendingRemove = null
      if (index !== null) this.$store.dispatch('removeSchedule', { day: this.dayNumber, index })
    }
  },
  head () {
    return { title: this.dayData ? `${this.dayData.day}일차 - ${this.dayData.title}` : '여행 계획' }
  }
}
</script>

<style scoped>
.back { margin-bottom: 4px; }
.eyebrow-row { display: flex; align-items: center; gap: 10px; }
.edit-day { padding: 2px 10px; font-size: 12px; }
.missing { padding: 60px 0; text-align: center; color: var(--muted); }

.day-hero {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  margin: 24px 0 16px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
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
.add-btn { flex-shrink: 0; }

.schedule-list { list-style: none; padding: 0; margin: 0 0 32px; }

.day-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
}

@media (max-width: 480px) {
  .day-hero { gap: 16px; }
  .num { font-size: 64px; }
  h1 { font-size: 24px; }
  .add-btn { padding: 6px 12px; font-size: 13px; }
}
</style>
