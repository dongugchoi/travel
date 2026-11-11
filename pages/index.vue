<template>
  <section>
    <div class="summary-row rise">
      <div class="headline">
        <!-- 여행 제목: 붓글씨 -->
        <h1 v-if="trip.title" class="brush-title">{{ $tx(trip.title) }}</h1>
      </div>
      <button v-if="canEdit" type="button" class="btn btn-glass btn-sm add-day" @click="addDay">{{ $t('+ 날짜 추가') }}</button>
    </div>

    <div v-if="days.length" class="day-list">
      <DayCard
        v-for="(day, i) in days"
        :key="day.day"
        class="rise"
        :style="{ '--i': staggered ? i + 1 : 0 }"
        :day="day"
        :removable="canEdit"
        @remove="pendingDay = day.day"
      />
    </div>
    <!-- 날짜가 하나도 없을 때: 화면 가운데 안내 -->
    <p v-else class="empty rise">{{ $t('일정을 추가해주세요.') }}</p>

    <ConfirmDialog
      :open="pendingDay !== null"
      :title="removeTitle"
      :message="removeMessage"
      :confirm-label="$t('날짜 삭제')"
      @cancel="pendingDay = null"
      @confirm="removeDay"
    />
  </section>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { koDateLong } from '~/plugins/filters'
import { t } from '~/plugins/i18n'

export default {
  name: 'IndexPage',
  data () {
    // staggered: 처음 열 때만 카드가 하나씩 차례로 (나중에 추가한 건 바로 나타남)
    return { pendingDay: null, staggered: true }
  },
  mounted () {
    setTimeout(() => { this.staggered = false }, 1200)
  },
  computed: {
    ...mapState(['trip', 'canEdit']),
    ...mapGetters(['days']),
    target () {
      return this.pendingDay !== null ? this.days.find(d => d.day === this.pendingDay) : null
    },
    removeTitle () {
      return this.target ? t('{date}({day}일차)을 삭제할까요?', { date: koDateLong(this.target.date), day: this.target.day }) : ''
    },
    // 지웠을 때 날짜가 어떻게 바뀌는지 미리 알려줌
    removeMessage () {
      const day = this.target
      if (!day) return ''
      const parts = []
      const n = day.schedules.length
      if (n) parts.push(t('이 날의 일정 {n}개도 같이 지워져요.', { n }))

      const index = this.days.indexOf(day)
      const last = this.days.length - 1
      if (last === 0) {
        // 마지막 남은 날짜
        parts.push(t('남은 날짜가 없어져요.'))
      } else if (index === 0) {
        parts.push(t('여행 시작일이 {date}로 바뀌어요.', { date: koDateLong(this.days[1].date) }))
      } else if (index === last) {
        parts.push(t('여행 마지막 날이 {date}로 바뀌어요.', { date: koDateLong(this.days[last - 1].date) }))
      } else {
        // 중간 날짜: 그 날만 지워지고 다른 날짜는 그대로
        parts.push(t('다른 날짜는 그대로예요.'))
      }
      return parts.join(' ')
    }
  },
  methods: {
    async addDay () {
      await this.$store.dispatch('addDay')
      // 새로 생긴 날짜 카드가 보이게 아래로
      this.$nextTick(() => {
        const cards = this.$el.querySelectorAll('.mag-wrap')
        const last = cards[cards.length - 1]
        if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    async removeDay () {
      const day = this.pendingDay
      this.pendingDay = null
      if (day !== null) await this.$store.dispatch('removeDay', day)
    }
  }
}
</script>

<style scoped>
/* 여행 제목은 빼고 날짜를 맨 위에 */
.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: -8px 0 16px;
}
.headline { min-width: 0; }
/* 붓으로 쓴 듯한 제목, 타워 불빛처럼 은은한 주황 번짐 */
.brush-title {
  margin: 0 0 2px;
  font-family: 'Nanum Brush Script', var(--font);
  font-weight: 400;
  font-size: 46px;
  line-height: 1.05;
  letter-spacing: 1px;
  color: var(--ink);
  text-shadow: 0 0 18px rgba(240, 138, 84, 0.45), 0 2px 4px rgba(0, 0, 0, 0.5);
  transform: rotate(-2deg);
  transform-origin: left center;
  word-break: keep-all;
}
.add-day { flex-shrink: 0; }
.day-list { border-bottom: 1px solid var(--line); }
/* 날짜가 없을 때 안내: 남은 화면 높이의 가운데 */
.empty {
  min-height: calc(100dvh - 240px);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 17px;
  color: var(--muted);
  letter-spacing: 0.5px;
}
</style>
