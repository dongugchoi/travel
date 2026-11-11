<template>
  <transition name="fade">
    <div v-if="open" class="backdrop" @click.self="$emit('close')">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="day-dialog-title">
        <header class="head">
          <div>
            <h2 id="day-dialog-title">{{ $t('날짜 수정') }}</h2>
          </div>
          <button type="button" class="x" :aria-label="$t('닫기')" @click="$emit('close')">×</button>
        </header>

        <form @submit.prevent="save">
          <label>
            <span>{{ $t('제목 *') }}</span>
            <input ref="title" v-model="form.title" required>
          </label>
          <label>
            <span>{{ $t('날짜 *') }}</span>
            <input v-model="form.date" type="date" required @input="dateError = ''">
            <small v-if="dateError" class="warn">{{ dateError }}</small>
          </label>
          <label>
            <span>{{ $t('도시') }}</span>
            <input v-model="form.region">
            <small>{{ $t('지도에서 장소를 찾을 때 앞에 붙여요') }}</small>
          </label>
          <footer class="actions">
            <button type="button" class="btn btn-glass" @click="$emit('close')">{{ $t('취소') }}</button>
            <button type="submit" class="btn btn-primary">{{ $t('저장') }}</button>
          </footer>
        </form>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'DayDialog',
  props: {
    open: { type: Boolean, default: false },
    day: { type: Object, default: null },
    // 다른 날에 이미 쓰인 날짜들 (같은 날짜 두 번 못 쓰게)
    takenDates: { type: Array, default: () => [] }
  },
  data () {
    return { form: { title: '', date: '', region: '' }, dateError: '' }
  },
  watch: {
    open (value) {
      if (value && this.day) {
        this.form = { title: this.day.title || '', date: this.day.date || '', region: this.day.region || '' }
        this.dateError = ''
        this.$nextTick(() => this.$refs.title && this.$refs.title.focus())
        document.addEventListener('keydown', this.onKey, true)
      } else {
        document.removeEventListener('keydown', this.onKey, true)
      }
    }
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.onKey, true)
  },
  methods: {
    onKey (e) {
      if (e.key === 'Escape') this.$emit('close')
    },
    save () {
      if (this.takenDates.includes(this.form.date)) {
        this.dateError = this.$t('이미 있는 날짜예요')
        return
      }
      this.$emit('save', { ...this.form })
    }
  }
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(43, 38, 34, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dialog {
  width: 100%;
  max-width: 420px;
  background: var(--bg);
  border: 1px solid var(--line);
  padding: 24px 28px;
  box-shadow: 0 12px 40px rgba(43, 38, 34, 0.2);
}
.head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.head h2 { margin: 4px 0 0; font-size: 20px; font-weight: 600; }
.x { border: none; background: none; font-size: 26px; line-height: 1; color: var(--muted); cursor: pointer; }
.x:hover { color: var(--accent); }
form { display: flex; flex-direction: column; gap: 14px; }
label { display: flex; flex-direction: column; gap: 4px; }
label span { font-size: 12px; letter-spacing: 1px; color: var(--muted); }
label small { font-size: 12px; color: var(--muted); }
label small.warn { color: var(--accent); }
input {
  padding: 9px 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: 10px;
  font: inherit;
  font-size: 15px;
  min-height: 40px;
}
input:focus { outline: none; border-color: var(--accent); }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.fade-enter-active { transition: opacity 0.28s; }
.fade-leave-active { transition: opacity 0.15s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
