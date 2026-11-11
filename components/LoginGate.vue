<template>
  <section class="gate">
    <template v-if="!authChecked || (canEdit && !tripLoaded && sync !== 'error')">
      <span class="spinner" aria-hidden="true" />
      <p class="muted">{{ $t('불러오는 중…') }}</p>
    </template>

    <template v-else-if="canEdit && sync === 'error'">
      <h1>{{ $t('여행') }}</h1>
      <p class="muted">{{ $t('일정을 불러오지 못했어요. 새로고침해 주세요.') }}</p>
    </template>

    <template v-else-if="!user">
      <h1>{{ $t('여행') }}</h1>
      <p class="muted">{{ $t('로그인한 사람만 볼 수 있어요') }}</p>
      <button type="button" class="btn btn-primary" @click="signIn">{{ $t('구글로 로그인') }}</button>
      <p v-if="error" class="error">{{ error }}</p>
    </template>

    <template v-else>
      <h1>{{ $t('여행') }}</h1>
      <p class="muted">{{ $t('이 계정으로는 볼 수 없어요') }}</p>
      <button type="button" class="btn btn-glass" @click="$tripAuth.signOut()">{{ $t('다른 계정으로 로그인') }}</button>
    </template>
  </section>
</template>

<script>
import { mapState } from 'vuex'

// 일정은 두 분만 볼 수 있어서, 편집자가 아니면 이 화면만 보여줌
export default {
  name: 'LoginGate',
  data () {
    return { error: '' }
  },
  computed: {
    ...mapState(['authChecked', 'user', 'canEdit', 'tripLoaded', 'sync'])
  },
  methods: {
    async signIn () {
      this.error = ''
      try {
        await this.$tripAuth.signIn()
      } catch (e) {
        if (e && e.code === 'auth/popup-closed-by-user') return
        this.error = this.$t('로그인하지 못했어요. 팝업 차단을 확인해 주세요.')
      }
    }
  }
}
</script>

<style scoped>
/* 화면 세로 가운데: 전체 높이에서 헤더(약 57px)와 본문 위아래 여백(32+64px)을 뺀 만큼 */
.gate {
  min-height: calc(100vh - 160px);
  min-height: calc(100dvh - 160px); /* 아이폰 주소창 높이까지 반영 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
}
h1 { margin: 0; font-size: 30px; font-weight: 600; letter-spacing: 6px; }
.muted { margin: 0; color: var(--muted); }
.error { margin: 0; color: var(--accent); font-size: 13px; }
button { padding: 10px 24px; font-size: 15px; }
.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--line);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
