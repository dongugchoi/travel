// 다이얼로그를 브라우저 기록(주소 ?dialog=이름)에 올려서
// 아이폰 "뒤로 가기" 스와이프 / 브라우저 뒤로 버튼을 누르면 페이지를 떠나지 않고 다이얼로그만 닫히게 함

// 이 사이트가 직접 기록을 하나 쌓았는지 (닫을 때 back() 으로 그 기록을 지움)
let pushedByUs = false

export default {
  computed: {
    routeDialog () {
      return this.$route.query.dialog || null
    }
  },
  watch: {
    // 뒤로 가기로 다이얼로그가 닫히면 표시 초기화
    routeDialog (value) {
      if (!value) pushedByUs = false
    }
  },
  methods: {
    openRouteDialog (name) {
      if (this.routeDialog === name) return
      const location = { query: { ...this.$route.query, dialog: name } }
      if (this.routeDialog) {
        // 다이얼로그 → 다른 다이얼로그: 기록을 늘리지 않고 바꿈 (뒤로 가면 바로 페이지로)
        this.$router.replace(location)
      } else {
        pushedByUs = true
        this.$router.push(location)
      }
    },
    closeRouteDialog () {
      if (!this.routeDialog) return
      if (pushedByUs) {
        pushedByUs = false
        this.$router.back()
      } else {
        // 주소에 ?dialog= 가 붙은 채로 처음 열었을 때 (새로고침 등)
        const query = { ...this.$route.query }
        delete query.dialog
        this.$router.replace({ query })
      }
    }
  }
}
