<template>
  <header class="app-header">
    <div class="inner">
      <!-- 저장 상태는 글자 대신 제목 색으로: 저장 중 회색 → 저장됨 초록 / 실패 빨강 -->
      <NuxtLink to="/" class="logo" :class="logoState" :title="label ? $t(label) : null">{{ $t('여행') }}</NuxtLink>

      <div class="right">
        <!-- 언어 버튼 하나: 지금 언어가 보이고, 누르면 다른 언어로 바뀜 -->
        <button
          type="button"
          class="lang"
          :lang="currentLang.value"
          :aria-label="$t('언어')"
          @click="setLang(otherLang.value)"
        >
          {{ currentLang.label }}
        </button>

        <!-- 로그인은 브라우저에서만 동작 (mounted 뒤에 authReady 가 켜짐) -->
        <template v-if="authReady">
          <button v-if="!user" type="button" class="auth-btn" @click="signIn">{{ $t('로그인') }}</button>
          <div v-else class="user">
            <img v-if="user.photo" :src="user.photo" alt="" class="avatar" referrerpolicy="no-referrer">
            <span v-if="!canEdit" class="viewer" :title="$t('이 계정은 일정을 고칠 수 없어요')">{{ $t('보기 전용') }}</span>
            <button type="button" class="auth-btn" @click="signOut">{{ $t('로그아웃') }}</button>
          </div>
        </template>
      </div>
    </div>
    <p v-if="authError" class="auth-error">{{ authError }}</p>
  </header>
</template>

<script>
import { mapState } from 'vuex'
import { LANGS, setLang } from '~/plugins/i18n'

const LABELS = {
  loading: '불러오는 중…',
  saving: '저장 중…',
  saved: '저장됨',
  error: '저장 실패',
  disabled: '저장 안 됨 (DB 미설정)'
}

export default {
  name: 'AppHeader',
  data () {
    return { authError: '', authReady: false, langs: LANGS }
  },
  mounted () {
    this.authReady = !!this.$tripAuth
  },
  computed: {
    ...mapState(['sync', 'user', 'canEdit']),
    currentLang () {
      return this.langs.find(l => l.value === this.$lang) || this.langs[0]
    },
    otherLang () {
      return this.langs.find(l => l.value !== this.$lang) || this.langs[0]
    },
    logoState () {
      return this.label ? 'is-' + this.sync : ''
    },
    label () {
      // 로그인 안 했으면 "저장됨" 대신 아무것도 안 보여줌
      if (!this.canEdit && (this.sync === 'saved' || this.sync === 'saving')) return ''
      return LABELS[this.sync] || ''
    }
  },
  methods: {
    setLang,
    async signIn () {
      this.authError = ''
      try {
        await this.$tripAuth.signIn()
      } catch (e) {
        if (e && e.code === 'auth/popup-closed-by-user') return
        this.authError = this.$t('로그인하지 못했어요. 팝업 차단을 확인해 주세요.')
      }
    },
    signOut () {
      this.$tripAuth.signOut()
    }
  }
}
</script>

<style scoped>
.app-header { border-bottom: 1px solid var(--line); }
.inner {
  max-width: 760px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.logo { font-size: 17px; font-weight: 600; letter-spacing: 3px; transition: color 0.4s; }
.logo.is-loading,
.logo.is-saving { color: var(--muted); }
.logo.is-saved { color: var(--sage); }
.logo.is-error,
.logo.is-disabled { color: var(--accent); }
.right { display: flex; align-items: center; gap: 10px; }
/* 언어가 바뀌어도 버튼 위치가 움직이지 않게 너비 고정 (두 언어 중 긴 쪽에 맞춤) */
.lang {
  width: 64px;
  border: 1px solid var(--line);
  background: none;
  padding: 4px 0;
  font-size: 13px;
  text-align: center;
  color: var(--ink);
  cursor: pointer;
}
.lang:hover { border-color: var(--accent); color: var(--accent); }

@media (max-width: 480px) {
  .right { gap: 6px; }
  .app-header .lang { width: 56px; }
  .app-header .auth-btn { width: 80px; }
}
.user { display: flex; align-items: center; gap: 8px; }
.avatar { width: 26px; height: 26px; border-radius: 50%; }
.viewer { font-size: 12px; color: var(--muted); }
/* 로그인/로그아웃 ↔ ログイン/ログアウト: 긴 쪽(ログアウト)에 맞춘 고정 너비 */
.auth-btn {
  width: 88px;
  border: 1px solid var(--line);
  background: none;
  padding: 4px 0;
  font-size: 13px;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
}
.auth-btn:hover { border-color: var(--accent); color: var(--accent); }
.auth-error {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 16px 10px;
  font-size: 12px;
  color: var(--accent);
}
</style>
