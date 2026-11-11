<template>
  <div class="tp">
    <button
      ref="field"
      type="button"
      class="tp-field"
      :class="{ empty: !value, open, invalid }"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <span v-if="value" class="tp-value">{{ value }}</span>
      <span v-else class="tp-ph">{{ $t('시간 선택') }}</span>
      <span class="tp-caret" aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>

    <transition name="tp-slide">
      <div v-if="open" class="tp-panel" role="dialog" :aria-label="$t('시간 선택')">
        <!-- 시: 여행 하루 흐름대로 아침부터 -->
        <div v-for="row in hourRows" :key="row.label" class="tp-row">
          <span class="tp-row-label">{{ $t(row.label) }}</span>
          <div class="tp-grid">
            <button
              v-for="h in row.hours"
              :key="h"
              type="button"
              :class="{ on: h === hour }"
              :aria-pressed="h === hour"
              @click="pickHour(h)"
            >
              {{ h }}
            </button>
          </div>
        </div>

        <div class="tp-divider" />

        <div class="tp-row">
          <span class="tp-row-label">{{ $t('분') }}</span>
          <div class="tp-grid minutes">
            <button
              v-for="m in minutes"
              :key="m"
              type="button"
              :class="{ on: m === minute }"
              :aria-pressed="m === minute"
              :disabled="!hour"
              @click="pickMinute(m)"
            >
              {{ m }}
            </button>
          </div>
        </div>

        <div class="tp-foot">
          <span class="tp-preview">
            <em>{{ hour || '--' }}</em>:<em>{{ minute || '--' }}</em>
          </span>
          <button type="button" class="btn btn-primary btn-sm tp-done" :disabled="!hour" @click="close">{{ $t('확인') }}</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
const pad = n => String(n).padStart(2, '0')
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => pad(from + i))

export default {
  name: 'TimePicker',
  props: {
    value: { type: String, default: '' },
    invalid: { type: Boolean, default: false }
  },
  data () {
    return {
      open: false,
      hourRows: [
        { label: '아침', hours: range(6, 11) },
        { label: '오후', hours: range(12, 17) },
        { label: '저녁', hours: range(18, 23) },
        { label: '새벽', hours: range(0, 5) }
      ],
      minutes: Array.from({ length: 12 }, (_, i) => pad(i * 5))
    }
  },
  computed: {
    hour () { return this.value ? this.value.split(':')[0] : '' },
    minute () { return this.value ? this.value.split(':')[1] : '' }
  },
  methods: {
    toggle () {
      this.open = !this.open
    },
    close () {
      this.open = false
      this.$nextTick(() => this.$refs.field && this.$refs.field.focus())
    },
    pickHour (h) {
      // 시만 골라도 바로 값이 되도록 (분은 00부터)
      this.$emit('input', `${h}:${this.minute || '00'}`)
    },
    pickMinute (m) {
      this.$emit('input', `${this.hour}:${m}`)
      this.close() // 분까지 고르면 자동으로 닫힘
    }
  }
}
</script>

<style scoped>
.tp { display: flex; flex-direction: column; }

.tp-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, border-radius 0.15s;
}
.tp-field:focus { outline: none; border-color: var(--accent); }
.tp-field.open { border-color: var(--ink); border-radius: 10px 10px 0 0; }
.tp-field.invalid { border-color: var(--accent); }
.tp-value { font-size: 20px; font-style: italic; color: var(--accent); letter-spacing: 1px; }
.tp-ph { color: var(--muted); }
.tp-caret { color: var(--muted); font-size: 12px; }

.tp-panel {
  border: 1px solid var(--ink);
  border-top: none;
  border-radius: 0 0 10px 10px;
  background: var(--surface);
  padding: 14px 14px 12px;
}

.tp-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.tp-row-label {
  width: 30px;
  flex-shrink: 0;
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--muted);
}
.tp-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}
.tp-grid button {
  padding: 7px 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: none;
  font-size: 15px;
  font-style: italic;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.tp-grid button:hover:not(:disabled) { border-color: var(--line); }
.tp-grid button.on { background: var(--ink); color: var(--bg); }
.tp-grid button:disabled { color: var(--line); cursor: default; }
.tp-grid.minutes button { font-size: 14px; }

.tp-divider { height: 1px; background: var(--line); margin: 10px 0 12px; }

.tp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.tp-preview { font-size: 22px; color: var(--muted); }
.tp-preview em { color: var(--accent); }

.tp-slide-enter-active, .tp-slide-leave-active { transition: opacity 0.15s, transform 0.15s; }
.tp-slide-enter, .tp-slide-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
