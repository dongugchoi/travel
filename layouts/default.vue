<template>
  <div>
    <AppHeader />
    <main class="container">
      <!-- 두 분(편집자)만 일정을 볼 수 있음. 아니면 로그인 안내 -->
      <LoginGate v-if="locked" />
      <Nuxt v-else />
    </main>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  computed: {
    ...mapState(['sync', 'canEdit', 'authChecked']),
    // Firebase 설정이 없으면(sync=disabled) 잠그지 않음 (로컬 미리보기용)
    locked () {
      if (this.sync === 'disabled') return false
      return !this.authChecked || !this.canEdit
    }
  },
  // <html lang> 을 고른 언어에 맞춤 (화면 읽기 프로그램·글꼴 선택에 쓰임)
  head () {
    return { htmlAttrs: { lang: this.$lang } }
  }
}
</script>
