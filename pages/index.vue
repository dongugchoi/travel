<template>
  <section>
    <h1 class="trip-title">{{ $tx(trip.title) }}</h1>
    <div class="summary-row">
      <p class="summary">
        {{ trip.startDate | koDate }} – {{ trip.endDate | koDate }}
      </p>
      <button v-if="canEdit" type="button" class="add-day" @click="addDay">{{ $t('+ 날짜 추가') }}</button>
    </div>

    <div class="day-list">
      <DayCard
        v-for="day in days"
        :key="day.day"
        :day="day"
        :removable="days.length > 1"
        @remove="pendingDay = day.day"
      />
    </div>

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
import { koDateLong, shortDate } from '~/plugins/filters'
import { t } from '~/plugins/i18n'

export default {
  name: 'IndexPage',
  data () {
    return { pendingDay: null }
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
      if (index === 0) {
        parts.push(t('여행 시작일이 {date}로 바뀌어요.', { date: koDateLong(this.days[1].date) }))
      } else if (index === last) {
        parts.push(t('여행 마지막 날이 {date}로 바뀌어요.', { date: koDateLong(this.days[last - 1].date) }))
      } else {
        const after = this.days.slice(index + 1)
        const range = after.length > 1
          ? `${shortDate(after[0].date)}~${shortDate(after[after.length - 1].date)}`
          : shortDate(after[0].date)
        parts.push(t('{range} 일정이 하루씩 앞당겨지고, 여행 마지막 날이 {date}로 바뀌어요.', { range, date: koDateLong(this.days[last - 1].date) }))
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
.trip-title { margin: 6px 0; font-size: 34px; font-weight: 400; }
.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 32px;
}
.summary { margin: 0; color: var(--muted); }
.add-day {
  flex-shrink: 0;
  padding: 5px 12px;
  border: 1px solid var(--ink);
  background: none;
  color: var(--ink);
  font-size: 13px;
  cursor: pointer;
}
.add-day:hover { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.day-list { border-bottom: 1px solid var(--line); }
</style>
