<template>
  <li class="schedule-item">
    <div class="time">{{ schedule.time }}</div>
    <div class="body">
      <!-- 종류가 있는 예전 일정만 표시 (새 일정은 종류 없음) -->
      <!-- 이름은 메모에만 표시 (일정 위에는 안 보임) -->
      <div v-if="schedule.category" class="meta">
        <span class="tag">{{ schedule.category | category }}</span>
      </div>
      <strong class="place">{{ $tx(schedule.place) }}</strong>
      <p v-if="schedule.address" class="address">{{ $tx(schedule.address) }}</p>

      <!-- 댓글형 메모: 1. 2. 3. … (오른쪽 끝에 쓴 사람) -->
      <div v-if="comments.length || writing" class="memo-box">
        <ol v-if="comments.length" class="comments">
          <li v-for="(c, ci) in comments" :key="ci" class="comment">
            <span class="num">{{ ci + 1 }}.</span>
            <div class="comment-body">
              <p class="memo-text">{{ $tx(c.text) }}</p>
              <div v-if="editable" class="memo-actions">
                <button type="button" class="text-btn small" @click="$emit('comment-edit', ci)">{{ $t('수정') }}</button>
                <button type="button" class="text-btn danger small" @click="$emit('comment-delete', ci)">{{ $t('삭제') }}</button>
              </div>
            </div>
            <span v-if="c.by" class="memo-by">{{ $t(c.by) }}</span>
          </li>
        </ol>

        <!-- 댓글 달기: 바로 입력하고 등록 -->
        <form v-if="editable" class="reply" @submit.prevent="submitReply">
          <textarea
            ref="reply"
            v-model="reply"
            rows="1"
            :aria-label="$t('메모 달기')"
            @input="autoGrow"
            @keydown.enter.exact.prevent="submitReply"
          />
          <button type="submit" class="btn btn-primary btn-sm reply-btn" :disabled="!reply.trim()">{{ $t('등록') }}</button>
        </form>
      </div>

      <div class="links">
        <button
          v-if="schedule.address || schedule.place"
          type="button"
          class="btn btn-chip"
          @click="$emit('navigate')"
        >
          {{ $t('지도 보기') }}
        </button>
        <button v-if="editable && !comments.length && !writing" type="button" class="btn btn-chip" @click="startWriting">
          {{ $t('메모 추가') }}
        </button>
      </div>
    </div>
    <div v-if="editable" class="item-actions">
      <button type="button" class="text-btn remove" @click="$emit('edit')">{{ $t('수정') }}</button>
      <button type="button" class="text-btn danger remove" :aria-label="$t('일정 삭제')" @click="$emit('remove')">{{ $t('삭제') }}</button>
    </div>
  </li>
</template>

<script>
import { commentList } from '~/store'

export default {
  name: 'ScheduleItem',
  props: {
    schedule: { type: Object, required: true },
    editable: { type: Boolean, default: false }
  },
  data () {
    return { reply: '', writing: false }
  },
  computed: {
    // 댓글 목록 (예전 한 칸짜리 메모는 1번으로 보여줌 — 화면에서는 데이터를 바꾸지 않음)
    comments () {
      return commentList(this.schedule)
    }
  },
  methods: {
    startWriting () {
      this.writing = true
      this.$nextTick(() => this.$refs.reply && this.$refs.reply.focus())
    },
    submitReply () {
      const text = this.reply.trim()
      if (!text) return
      this.$emit('comment-add', text)
      this.reply = ''
      this.writing = false
      this.$nextTick(() => this.autoGrow())
    },
    // 글이 길어지면 입력칸도 같이 커지게
    autoGrow () {
      const el = this.$refs.reply
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
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
.memo-actions { display: flex; gap: 10px; margin-top: 3px; }

/* 댓글: 번호 · 내용 · (오른쪽 끝) 이름 */
.comments { list-style: none; margin: 0; padding: 0; }
.comment {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
}
.comment:first-child { padding-top: 0; }
.num { flex-shrink: 0; width: 18px; font-size: 14px; line-height: 1.6; color: var(--accent); font-style: italic; }
.comment-body { flex: 1; min-width: 0; }
.comment .memo-by { flex-shrink: 0; line-height: 1.9; }
.text-btn.small { font-size: 12px; }

/* 댓글 달기 */
.reply { display: flex; align-items: flex-end; gap: 8px; margin-top: 10px; }
.comments + .reply { margin-top: 10px; }
.memo-box > .reply:first-child { margin-top: 0; }
.reply textarea {
  flex: 1;
  min-width: 0;
  resize: none;
  overflow: hidden;
  padding: 7px 9px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  border-radius: 10px;
}
.reply textarea:focus { outline: none; border-color: var(--accent); }
.reply-btn { flex-shrink: 0; }

.links { display: flex; gap: 8px; margin-top: 10px; }
.item-actions { align-self: flex-start; margin-top: 4px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
</style>
