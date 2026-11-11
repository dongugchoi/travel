<template>
  <div class="page">
    <TowerBackdrop />
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
    ...mapState(['sync', 'canEdit', 'authChecked', 'tripLoaded']),
    // Firebase 설정이 없으면(sync=disabled) 잠그지 않음 (로컬 미리보기용)
    locked () {
      if (this.sync === 'disabled') return false
      // 실제 일정을 다 불러오기 전에도 잠금(로딩 표시) → 견본 데이터가 잠깐 보이거나 "없는 날짜"가 뜨지 않음
      return !this.authChecked || !this.canEdit || !this.tripLoaded
    }
  },
  // <html lang> 을 고른 언어에 맞춤 (화면 읽기 프로그램·글꼴 선택에 쓰임)
  head () {
    return { htmlAttrs: { lang: this.$lang } }
  }
}
</script>

<style scoped>
/* 헤더·본문을 배경 도쿄타워보다 위에 */
.page > header { position: sticky; top: 0; z-index: 30; }
.page > main { position: relative; z-index: 1; }
</style>
