<template>
  <transition name="fade">
    <div v-if="open" class="backdrop">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="memo-dialog-title">
        <header class="head">
          <div>
            <h2 id="memo-dialog-title">{{ title }}</h2>
          </div>
          <button type="button" class="x" :aria-label="$t('닫기')" @click="$emit('close')">×</button>
        </header>

        <form @submit.prevent="save">
          <label>
            <span>{{ $t('메모 내용') }}</span>
            <textarea
              ref="text"
              v-model="text"
              rows="5"
            />
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
  name: 'MemoDialog',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    initial: { type: String, default: '' }
  },
  data () {
    return { text: '' }
  },
  watch: {
    open (value) {
      if (value) {
        this.text = this.initial || ''
        this.$nextTick(() => this.$refs.text && this.$refs.text.focus())
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
      this.$emit('save', this.text)
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
textarea {
  padding: 10px 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  font: inherit;
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
}
textarea:focus { outline: none; border-color: var(--accent); }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.fade-enter-active { transition: opacity 0.28s; }
.fade-leave-active { transition: opacity 0.15s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
