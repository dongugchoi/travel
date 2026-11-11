<template>
  <div class="mag-wrap">
    <NuxtLink :to="`/days/${day.day}`" class="mag">
      <div class="mag-num">{{ day.day | pad2 }}</div>
      <div class="mag-body">
        <h3 class="mag-title">{{ $tx(day.title) }}</h3>
        <p class="mag-date date-line">
          <span class="date-text">{{ day.date | koDateLong }}</span>
          <span v-if="day.region" class="city-tag">{{ $tx(day.region) }}</span>
        </p>
        <ul class="mag-preview">
          <li v-for="(s, i) in day.schedules.slice(0, 3)" :key="i">
            <span class="t">{{ s.time }}</span>{{ $tx(s.place) }}
          </li>
        </ul>
        <p v-if="day.schedules.length > 3" class="mag-more">
          {{ $t('외 {n}개 일정', { n: day.schedules.length - 3 }) }}
        </p>
      </div>
    </NuxtLink>

    <div v-if="canEdit" class="card-actions">
      <!-- 이 날짜로 가서 일정 추가 창을 바로 엶 -->
      <NuxtLink :to="{ path: `/days/${day.day}`, query: { dialog: 'add' } }" class="btn btn-primary btn-sm add">
        {{ $t('+ 일정 추가') }}
      </NuxtLink>
      <!-- 날짜 삭제 (아이폰은 호버가 없어서 항상 보이게) -->
      <button
        v-if="removable"
        type="button"
        class="text-btn danger remove"
        :aria-label="$t('{day}일차 날짜 삭제', { day: day.day })"
        @click="$emit('remove')"
      >
        {{ $t('삭제') }}
      </button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'DayCard',
  props: {
    day: { type: Object, required: true },
    removable: { type: Boolean, default: false }
  },
  computed: {
    ...mapState(['canEdit'])
  }
}
</script>

<style scoped>
.mag-wrap { position: relative; border-top: 1px solid var(--line); }
/* 첫 카드 위 줄은 없음 (붓글씨 제목 아래를 시원하게) */
.mag-wrap:first-child { border-top: none; }
.mag {
  display: flex;
  gap: 24px;
  padding: 28px 0;
}
.mag:hover .mag-title { color: var(--accent); }
.mag-num {
  font-size: 64px;
  line-height: 0.9;
  color: var(--accent);
  min-width: 84px;
}
.mag-body { flex: 1; min-width: 0; }
.mag-title { margin: 0; font-size: 22px; font-weight: 600; transition: color 0.15s; padding-right: 104px; }
.mag-date { margin: 4px 0 12px; color: var(--muted); font-size: 14px; }
.mag-preview { list-style: none; margin: 0; padding: 0; font-size: 15px; line-height: 1.9; }
.mag-preview .t { display: inline-block; width: 56px; color: var(--muted); font-style: italic; }
.mag-more { margin: 4px 0 0; color: var(--muted); font-size: 13px; }

/* "+ 일정 추가" 아래에 "삭제" */
.card-actions {
  position: absolute;
  top: 28px;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

@media (max-width: 480px) {
  .mag { gap: 16px; }
  .mag-num { font-size: 44px; min-width: 56px; }
  .mag-title { font-size: 20px; padding-right: 92px; }
  .add { padding: 4px 10px; font-size: 12px; }
}
</style>
