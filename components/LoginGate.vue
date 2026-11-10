<template>
  <section class="gate">
    <template v-if="!authChecked">
      <span class="spinner" aria-hidden="true" />
      <p class="muted">{{ $t('불러오는 중…') }}</p>
    </template>

    <template v-else-if="!user">
      <h1>Travel Journal</h1>
      <p class="muted">{{ $t('로그인한 사람만 볼 수 있어요') }}</p>
      <button type="button" class="primary" @click="signIn">{{ $t('구글로 로그인') }}</button>
      <p v-if="error" class="error">{{ error }}</p>
    </template>

    <template v-else>
      <h1>Travel Journal</h1>
      <p class="muted">{{ $t('이 계정으로는 볼 수 없어요') }}</p>
      <button type="button" class="ghost" @click="$tripAuth.signOut()">{{ $t('다른 계정으로 로그인') }}</button>
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
    ...mapState(['authChecked', 'user'])
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
.gate {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
}
h1 { margin: 0; font-size: 30px; font-weight: 400; font-style: italic; }
.muted { margin: 0; color: var(--muted); }
.error { margin: 0; color: var(--accent); font-size: 13px; }
button { padding: 10px 22px; cursor: pointer; border: 1px solid var(--ink); font-size: 15px; }
.primary { background: var(--ink); color: var(--bg); }
.primary:hover { background: var(--accent); border-color: var(--accent); }
.ghost { background: none; color: var(--ink); }
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
