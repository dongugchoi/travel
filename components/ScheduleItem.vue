<template>
  <li class="schedule-item">
    <div class="time">{{ schedule.time }}</div>
    <div class="body">
      <!-- 종류가 있는 예전 일정만 표시 (새 일정은 종류 없음) -->
      <div class="meta">
        <span v-if="schedule.category" class="tag">{{ schedule.category | category }}</span>
        <!-- 누가 추가했는지 -->
        <span v-if="schedule.by" class="by">{{ $t(schedule.by) }}</span>
      </div>
      <strong class="place">{{ $tx(schedule.place) }}</strong>
      <p v-if="schedule.address" class="address">{{ $tx(schedule.address) }}</p>

      <!-- 시간마다 메모칸 -->
      <div v-if="schedule.memo" class="memo-box">
        <p class="memo-text">{{ $tx(schedule.memo) }}</p>
        <!-- 왼쪽: 메모 수정·삭제 / 오른쪽 끝: 쓴 사람 -->
        <div v-if="editable || schedule.memoBy" class="memo-foot">
          <div class="memo-actions">
            <template v-if="editable">
              <button type="button" class="link" @click="$emit('memo-edit')">{{ $t('메모 수정') }}</button>
              <button type="button" class="link" @click="$emit('memo-delete')">{{ $t('메모 삭제') }}</button>
            </template>
          </div>
          <span v-if="schedule.memoBy" class="memo-by">{{ $t(schedule.memoBy) }}</span>
        </div>
      </div>

      <div class="links">
        <button
          v-if="schedule.address || schedule.place"
          type="button"
          class="link"
          @click="$emit('navigate')"
        >
          {{ $t('지도 보기') }}
        </button>
        <button v-if="editable && !schedule.memo" type="button" class="link" @click="$emit('memo-edit')">
          {{ $t('메모 추가') }}
        </button>
      </div>
    </div>
    <div v-if="editable" class="item-actions">
      <button type="button" class="remove" @click="$emit('edit')">{{ $t('수정') }}</button>
      <button type="button" class="remove" :aria-label="$t('일정 삭제')" @click="$emit('remove')">{{ $t('삭제') }}</button>
    </div>
  </li>
</template>

<script>
export default {
  name: 'ScheduleItem',
  props: {
    schedule: { type: Object, required: true },
    editable: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
.schedule-item {
  display: flex;
  gap: 16px;
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
}
.time {
  width: 64px;
  flex-shrink: 0;
  font-size: 18px;
  font-style: italic;
  color: var(--accent);
}
.body { flex: 1; min-width: 0; }
.meta { display: flex; gap: 10px; align-items: baseline; min-height: 0; }
.tag { font-size: 11px; letter-spacing: 2px; color: var(--muted); }
.by { font-size: 11px; color: var(--muted); }
.memo-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 6px; }
.memo-by { font-size: 12px; color: var(--muted); }
.place { display: block; font-size: 18px; font-weight: 600; margin-top: 2px; }
.address { margin: 2px 0 0; font-size: 13px; color: var(--muted); }

/* 메모칸: 얇은 테두리 상자 */
.memo-box {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--line);
}
.memo-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-line; /* 줄바꿈 그대로 */
  word-break: break-word;
}
.memo-actions { display: flex; gap: 12px; }

.links { display: flex; gap: 14px; margin-top: 8px; }
/* 테두리 없이 밑줄만 있는 글자 버튼 */
.link {
  border: none;
  border-bottom: 1px solid var(--muted);
  background: none;
  padding: 0 0 1px;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
}
.link:hover { border-bottom-color: var(--accent); color: var(--accent); }
.item-actions { align-self: center; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.remove {
  border: none;
  background: none;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
}
.remove:hover { color: var(--accent); }
</style>
