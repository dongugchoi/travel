// 브라우저에서만 실행되는 Firebase 초기화 (Firestore + 구글 로그인)
// .env 에 FIREBASE_* 값이 없으면 Firestore 없이 data/trip.js 기본 일정만 보여줍니다.
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { memberName } from '~/utils/members'

export const TRIP_DOC_ID = 'japan-2026'

export default ({ $config, store }, inject) => {
  const cfg = $config.firebase || {}
  if (!cfg.apiKey || !cfg.projectId || !cfg.appId) {
    store.commit('SET_SYNC', 'disabled')
    inject('tripDb', null)
    inject('tripAuth', null)
    return
  }

  const app = initializeApp({
    apiKey: cfg.apiKey,
    authDomain: `${cfg.projectId}.firebaseapp.com`,
    projectId: cfg.projectId,
    appId: cfg.appId
  })
  const db = getFirestore(app)
  const auth = getAuth(app)
  const tripRef = doc(db, 'trips', TRIP_DOC_ID)

  inject('tripDb', {
    async load () {
      const snap = await getDoc(tripRef)
      return snap.exists() ? snap.data() : null
    },
    async save (trip) {
      // Vue 반응형 객체를 순수 객체로 바꿔서 저장
      await setDoc(tripRef, JSON.parse(JSON.stringify(trip)))
    }
  })

  inject('tripAuth', {
    signIn () {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      return signInWithPopup(auth, provider)
    },
    signOut () {
      return signOut(auth)
    }
  })

  // 로그인 상태가 바뀔 때마다 편집 권한 확인
  // editors/{이메일} 문서는 규칙상 "편집자 본인"만 읽을 수 있어서, 읽기에 성공하면 편집자임
  // (편집자 이메일 목록을 사이트 코드에 넣지 않기 위한 방법)
  // 일정은 편집자(두 분)만 읽을 수 있으므로, 편집자로 확인된 뒤에 한 번 불러옴
  let loaded = false
  onAuthStateChanged(auth, async (user) => {
    // member: '동욱' / '유나' (일정·메모에 누가 썼는지 남길 이름)
    const member = user ? await memberName(user.email) : null
    store.commit('SET_USER', user
      ? { email: user.email, name: user.displayName, photo: user.photoURL, member }
      : null)

    let canEdit = false
    if (user && user.email) {
      try {
        await getDoc(doc(db, 'editors', user.email))
        canEdit = true
      } catch (e) {
        canEdit = false
      }
    }
    store.commit('SET_CAN_EDIT', canEdit)
    store.commit('SET_AUTH_CHECKED', true)

    if (!canEdit) {
      // 로그인 안 했거나 편집자가 아니면 일정을 보여주지 않음 (화면은 로그인 안내)
      store.commit('SET_SYNC', 'locked')
      return
    }
    if (!loaded) {
      loaded = true
      store.dispatch('loadTrip')
    } else {
      store.dispatch('ensureTranslations')
    }
  })
}
