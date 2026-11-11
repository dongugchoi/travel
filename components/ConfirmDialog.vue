<template>
  <transition name="fade">
    <div v-if="open" class="backdrop" @click.self="$emit('cancel')">
      <div class="box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body">
        <h2 id="confirm-title">{{ title }}</h2>
        <p id="confirm-body">{{ message }}</p>
        <div class="actions">
          <button ref="cancel" type="button" class="btn btn-glass" @click="$emit('cancel')">{{ $t('취소') }}</button>
          <button type="button" class="btn btn-danger" @click="$emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'ConfirmDialog',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    confirmLabel: { type: String, default: '삭제' }
  },
  watch: {
    open (value) {
      if (value) {
        // 실수로 지우지 않게 "취소"에 먼저 초점
        this.$nextTick(() => this.$refs.cancel && this.$refs.cancel.focus())
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
      if (e.key === 'Escape') this.$emit('cancel')
    }
  }
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  background: rgba(43, 38, 34, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.box {
  border-radius: 18px;
  width: 100%;
  max-width: 360px;
  background: var(--bg);
  border: 1px solid var(--line);
  padding: 24px 24px 20px;
  box-shadow: 0 12px 40px rgba(43, 38, 34, 0.2);
}
h2 { margin: 0 0 8px; font-size: 19px; font-weight: 600; }
p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.7; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }

.fade-enter-active { transition: opacity 0.28s; }
.fade-leave-active { transition: opacity 0.15s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
