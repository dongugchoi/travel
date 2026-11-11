<template>
  <header class="app-header">
    <div class="inner" :class="{ sub: !isHome }">
      <!-- 저장 상태는 글자 대신 제목 색으로: 저장 중 회색 → 저장됨 초록 / 실패 빨강 -->
      <!-- 첫 화면: "여행" / 날짜 화면 등: 뒤로가기 -->
      <NuxtLink v-if="isHome" to="/" class="logo" :class="logoState" :title="label ? $t(label) : null">{{ $t('여행') }}</NuxtLink>
      <template v-else>
        <button type="button" class="back" :aria-label="$t('뒤로가기')" @click="goBack">
          <span class="back-arrow" aria-hidden="true">←</span>{{ $t('전체 일정') }}
        </button>
        <!-- 날짜 화면에서는 "여행" 이 가운데 -->
        <NuxtLink to="/" class="logo center" :class="logoState" :title="label ? $t(label) : null">{{ $t('여행') }}</NuxtLink>
      </template>

      <div class="right">
        <!-- 로그인한 구글 계정 사진: 한국어 버튼 왼쪽 -->
        <template v-if="authReady && user && !hideAccount">
          <img v-if="user.photo" :src="user.photo" alt="" class="avatar" referrerpolicy="no-referrer">
          <span v-if="!canEdit" class="viewer" :title="$t('이 계정은 일정을 고칠 수 없어요')">{{ $t('보기 전용') }}</span>
        </template>

        <!-- 언어 버튼 하나: 지금 언어가 보이고, 누르면 다른 언어로 바뀜 -->
        <button
          type="button"
          class="btn btn-chip lang"
          :lang="currentLang.value"
          :aria-label="$t('언어')"
          @click="setLang(otherLang.value)"
        >
          {{ currentLang.label }}
        </button>

        <!-- 로그인은 브라우저에서만 동작 (mounted 뒤에 authReady 가 켜짐). 날짜 화면·창에서는 숨김 -->
        <template v-if="authReady && !hideAccount">
          <button v-if="!user" type="button" class="btn btn-chip auth-btn" @click="signIn">{{ $t('로그인') }}</button>
          <button v-else type="button" class="btn btn-chip auth-btn" @click="signOut">{{ $t('로그아웃') }}</button>
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
    // 날짜 화면(자유 일정 등)에 들어갔거나 창이 열려 있으면 프로필·로그아웃을 숨김
    hideAccount () {
      return !this.isHome || !!this.$route.query.dialog
    },
    isHome () {
      return this.$route.path === '/'
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
    // 사이트 안에서 왔으면 진짜 뒤로가기(아이폰 스와이프와 같게), 바로 들어왔으면 전체 일정으로
    goBack () {
      const from = this.$nuxt && this.$nuxt.context && this.$nuxt.context.from
      if (from && from.path !== this.$route.path) this.$router.back()
      else this.$router.push('/')
    },
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
.app-header {
  border-bottom: 1px solid var(--line);
  /* 유리처럼 비치는 헤더 */
  background: rgba(17, 26, 38, 0.35);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
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
/* 날짜 화면: [← 전체 일정] [여행(가운데)] [오른쪽 버튼들]
   양옆 칸을 같은 너비로 두어 "여행" 이 화면 가운데 오게 (휴대폰처럼 좁으면 자연스럽게 밀림) */
.inner.sub { display: grid; grid-template-columns: 1fr auto 1fr; }
.inner.sub .right { justify-self: end; }
.logo.center { justify-self: center; }
/* 휴대폰 날짜 화면: 자리가 좁아 "여행" 이 밀리지 않게 프로필 사진만 숨김 */
@media (max-width: 480px) {
  .inner.sub .avatar { display: none; }
}
.back {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  padding: 4px 0;
  font: inherit;
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
  cursor: pointer;
}
.back:hover { color: #fff; }
.back-arrow { font-size: 16px; line-height: 1; }
.logo.is-loading,
.logo.is-saving { color: var(--muted); }
.logo.is-saved { color: var(--sage); }
.logo.is-error,
.logo.is-disabled { color: var(--accent); }
.right { display: flex; align-items: center; gap: 10px; }
/* 언어가 바뀌어도 버튼 위치가 움직이지 않게 너비 고정 (두 언어 중 긴 쪽에 맞춤) */
.lang { width: 64px; padding-left: 0; padding-right: 0; }

@media (max-width: 480px) {
  .right { gap: 6px; }
  .app-header .lang { width: 56px; }
  .app-header .auth-btn { width: 80px; }
}
.user { display: flex; align-items: center; gap: 8px; }
.avatar { width: 26px; height: 26px; border-radius: 50%; box-shadow: 0 0 0 2px rgba(241, 235, 224, 0.2); }
.viewer { font-size: 12px; color: var(--muted); }
/* 로그인/로그아웃 ↔ ログイン/ログアウト: 긴 쪽(ログアウト)에 맞춘 고정 너비 */
.auth-btn { width: 88px; padding-left: 0; padding-right: 0; }
.auth-error {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 16px 10px;
  font-size: 12px;
  color: var(--accent);
}
</style>
