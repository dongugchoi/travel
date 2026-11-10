// GitHub Pages 주소는 https://dongugchoi.github.io/travel/ 이라 /travel/ 아래에서 동작해야 함
// (로컬 개발은 / 그대로, 배포 빌드에서만 DEPLOY_BASE=/travel/ 를 줌)
const base = process.env.DEPLOY_BASE || '/'

export default {
  // 정적 사이트 + 브라우저에서만 그리기(SPA)
  // → 미리 그려진 HTML 에 일정 내용이 들어가지 않음 (일정은 로그인 후 DB 에서만 불러옴)
  target: 'static',
  ssr: false,

  router: { base },

  generate: {
    // GitHub Pages 는 없는 주소(/travel/days/2 등)에 404.html 을 보여줌 → 그걸 앱으로 씀
    fallback: '404.html'
  },

  head: {
    title: '여행 계획',
    htmlAttrs: { lang: 'ko' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '날짜별 여행 계획 페이지' }
    ],
    link: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;600&display=swap'
      }
    ]
  },

  css: ['~/assets/css/main.css'],

  // .env 값을 브라우저에서 this.$config 로 사용
  publicRuntimeConfig: {
    googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || '',
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      appId: process.env.FIREBASE_APP_ID || ''
    }
  },

  plugins: [
    '~/plugins/i18n.js',
    '~/plugins/filters.js',
    '~/plugins/firebase.client.js'
  ],

  // components/ 폴더의 컴포넌트를 자동 import
  components: true,

  buildModules: [],
  modules: [],

  build: {
    // Firebase SDK 는 최신 문법을 써서 webpack 4 가 읽을 수 있게 babel 로 변환
    transpile: [/@firebase/, /firebase/, /idb/]
  }
}
