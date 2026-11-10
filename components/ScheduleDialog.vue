<template>
  <transition name="fade">
    <div v-if="open" class="backdrop" @click.self="close">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-dialog-title"
      >
        <header class="head">
          <div>
            <p class="eyebrow">ADD SCHEDULE</p>
            <h2 id="schedule-dialog-title">{{ subtitle }}</h2>
          </div>
          <button type="button" class="x" :aria-label="$t('닫기')" @click="close">×</button>
        </header>

        <form @submit.prevent="submit">
          <div class="field">
            <span class="field-label">{{ $t('시간 *') }}</span>
            <TimePicker ref="time" v-model="form.time" :invalid="timeError" @input="timeError = false" />
            <small v-if="timeError" class="warn">{{ $t('시간을 골라 주세요') }}</small>
          </div>

          <!-- 장소 검색 (자동완성) -->
          <div class="field place-field">
            <label for="place-search"><span>{{ $t('장소 검색') }}</span></label>
            <input
              id="place-search"
              v-model="form.address"
              autocomplete="off"
              role="combobox"
              :aria-expanded="suggestions.length > 0"
              aria-controls="place-suggestions"
              @input="onSearchInput"
              @keydown.down.prevent="move(1)"
              @keydown.up.prevent="move(-1)"
              @keydown.enter="onEnter"
            >
            <ul v-if="suggestions.length" id="place-suggestions" class="suggestions" role="listbox">
              <li
                v-for="(s, i) in suggestions"
                :key="i"
                role="option"
                :aria-selected="i === active"
                :class="{ active: i === active }"
                @mousedown.prevent="choose(s)"
              >
                <strong>{{ s.main }}</strong>
                <small>{{ s.secondary }}</small>
              </li>
            </ul>
            <small v-if="form.placeId" class="ok">{{ $t('지도 위치 확정') }}</small>
            <small v-else-if="searchError" class="warn">{{ searchError }}</small>
            <small v-else>{{ $t('목록에서 고르면 지도 위치가 정확해요') }}</small>
          </div>

          <label>
            <span>{{ $t('할 일 *') }}</span>
            <input v-model="form.place" required>
          </label>

          <footer class="actions">
            <button type="button" class="ghost" @click="close">{{ $t('취소') }}</button>
            <button type="submit" class="primary">{{ $t('추가') }}</button>
          </footer>
        </form>
      </div>
    </div>
  </transition>
</template>

<script>
import { importMapsLibrary } from '~/utils/googleMaps'

const emptyForm = () => ({
  // 종류·메모는 추가 창에서 뺌 (메모는 일정 아래 메모칸에서 씀)
  time: '', place: '', address: '', placeId: null, lat: null, lng: null, jaName: null, memo: ''
})

export default {
  name: 'ScheduleDialog',
  props: {
    open: { type: Boolean, default: false },
    subtitle: { type: String, default: '' },
    // 지도에서 고른 장소 등 미리 채울 값
    initial: { type: Object, default: null },
    region: { type: String, default: '' }
  },
  data () {
    return {
      form: emptyForm(),
      suggestions: [],
      active: -1,
      searchError: '',
      timeError: false
    }
  },
  watch: {
    open (value) {
      if (value) {
        this.form = { ...emptyForm(), ...(this.initial || {}) }
        this.suggestions = []
        this.searchError = ''
        this.timeError = false
        this.sessionToken = null
        // 시간이 비어 있으면 시간 선택판부터 열어 줌
        this.$nextTick(() => {
          if (this.$refs.time && !this.form.time) this.$refs.time.open = true
        })
        document.addEventListener('keydown', this.onKey, true)
      } else {
        clearTimeout(this.searchTimer)
        document.removeEventListener('keydown', this.onKey, true)
      }
    }
  },
  beforeDestroy () {
    clearTimeout(this.searchTimer)
    document.removeEventListener('keydown', this.onKey, true)
  },
  methods: {
    onKey (e) {
      if (e.key !== 'Escape') return
      if (this.suggestions.length) {
        this.suggestions = []
        return
      }
      if (this.$refs.time && this.$refs.time.open) {
        this.$refs.time.open = false
        return
      }
      this.close()
    },
    close () {
      this.$emit('close')
    },
    submit () {
      if (!this.form.time) {
        this.timeError = true
        if (this.$refs.time) this.$refs.time.open = true
        return
      }
      this.$emit('submit', { ...this.form })
    },

    // 글자를 칠 때마다 바로 부르지 않고 0.4초 멈추면 검색 (자동완성 요청 수 절약)
    onSearchInput () {
      this.form.placeId = null
      this.form.lat = null
      this.form.lng = null
      this.form.jaName = null
      this.searchError = ''
      clearTimeout(this.searchTimer)
      const text = this.form.address.trim()
      if (text.length < 2) {
        this.suggestions = []
        return
      }
      this.searchTimer = setTimeout(() => this.search(text), 400)
    },

    async search (text) {
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          await importMapsLibrary(this.$config.googleMapsKey, 'places')
        if (!this.sessionToken) this.sessionToken = new AutocompleteSessionToken()
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: this.region && !text.includes(this.region) ? `${this.region} ${text}` : text,
          sessionToken: this.sessionToken,
          language: this.$lang,
          region: 'jp',
          includedRegionCodes: ['jp']
        })
        if (text !== this.form.address.trim()) return // 그 사이에 더 입력했으면 무시
        this.suggestions = suggestions
          .filter(s => s.placePrediction)
          .slice(0, 5)
          .map(s => ({
            prediction: s.placePrediction,
            main: s.placePrediction.mainText ? s.placePrediction.mainText.toString() : s.placePrediction.text.toString(),
            secondary: s.placePrediction.secondaryText ? s.placePrediction.secondaryText.toString() : ''
          }))
        this.active = -1
      } catch (e) {
        console.warn('[autocomplete]', e)
        this.suggestions = []
        this.searchError = this.$t('장소 검색을 쓸 수 없어요. 이름을 그대로 입력해도 돼요.')
      }
    },

    move (step) {
      if (!this.suggestions.length) return
      const n = this.suggestions.length
      this.active = (this.active + step + n) % n
    },
    onEnter (e) {
      if (this.suggestions.length && this.active >= 0) {
        e.preventDefault()
        this.choose(this.suggestions[this.active])
      }
    },

    async choose (s) {
      this.suggestions = []
      this.form.address = s.main
      if (!this.form.place) this.form.place = s.main
      try {
        const place = s.prediction.toPlace()
        await place.fetchFields({ fields: ['displayName', 'location'] })
        this.form.placeId = place.id
        this.form.lat = place.location.lat()
        this.form.lng = place.location.lng()
        // 일본어 화면용: 구글이 가진 일본어 장소 이름 (예: 센소지 → 浅草寺). 번역보다 정확
        const { Place } = await importMapsLibrary(this.$config.googleMapsKey, 'places')
        const ja = new Place({ id: place.id, requestedLanguage: 'ja' })
        await ja.fetchFields({ fields: ['displayName'] })
        this.form.jaName = ja.displayName || null
      } catch (e) {
        console.warn('[place]', e)
      }
      this.sessionToken = null // 장소를 고르면 검색 세션 끝
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
  max-width: 440px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  background: var(--bg);
  border: 1px solid var(--line);
  padding: 24px 28px;
  box-shadow: 0 12px 40px rgba(43, 38, 34, 0.2);
}
.head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
.head h2 { margin: 4px 0 0; font-size: 20px; font-weight: 600; }
.x {
  border: none;
  background: none;
  font-size: 26px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
}
.x:hover { color: var(--accent); }

form { display: flex; flex-direction: column; gap: 14px; }
label, .field { display: flex; flex-direction: column; gap: 4px; }
label span, .field-label { font-size: 12px; letter-spacing: 1px; color: var(--muted); }
.field small { font-size: 12px; color: var(--muted); }
.field small.ok { color: #3f7a4a; }
.field small.warn { color: var(--accent); }
input, select {
  padding: 9px 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: 0;
}
input:focus, select:focus { outline: none; border-color: var(--accent); }

.place-field { position: relative; }
.suggestions {
  position: absolute;
  top: 62px;
  left: 0;
  right: 0;
  z-index: 2;
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--bg);
  border: 1px solid var(--line);
  box-shadow: 0 8px 20px rgba(43, 38, 34, 0.15);
}
.suggestions li { padding: 8px 10px; cursor: pointer; border-bottom: 1px solid var(--line); }
.suggestions li:last-child { border-bottom: none; }
.suggestions li.active, .suggestions li:hover { background: var(--surface); }
.suggestions strong { display: block; font-size: 14px; }
.suggestions small { font-size: 12px; color: var(--muted); }

.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
.actions button { padding: 8px 18px; cursor: pointer; border: 1px solid var(--ink); }
.ghost { background: none; color: var(--ink); }
.primary { background: var(--ink); color: var(--bg); }
.primary:hover { background: var(--accent); border-color: var(--accent); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
