// Google Maps JavaScript API 를 필요할 때 한 번만 불러오는 헬퍼
// 페이지에 들어올 때는 불러오지 않고, 지도 보기 / 장소 검색을 쓸 때만 불러옴
// (스크립트를 불러오는 것만으로는 요금이 세지 않고, 지도를 실제로 만들 때 1번으로 셈)

let loading = null

export const mapsStatus = { authFailed: false }

export function loadGoogleMaps (apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저에서만 사용할 수 있어요'))
  if (!apiKey) return Promise.reject(new Error('지도 API 키가 없어요'))
  if (window.google && window.google.maps && window.google.maps.importLibrary) {
    return Promise.resolve(window.google.maps)
  }
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    // 키 제한·한도 초과 등으로 인증에 실패하면 구글이 이 함수를 호출함
    window.gm_authFailure = () => {
      mapsStatus.authFailed = true
      window.dispatchEvent(new Event('gm-auth-failure'))
    }
    window.__travelMapsReady = () => resolve(window.google.maps)

    const script = document.createElement('script')
    script.src = 'https://maps.googleapis.com/maps/api/js' +
      `?key=${encodeURIComponent(apiKey)}` +
      '&v=weekly&language=ko&region=JP&loading=async&callback=__travelMapsReady'
    script.async = true
    script.onerror = () => {
      loading = null
      reject(new Error('구글 지도를 불러오지 못했어요'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export async function importMapsLibrary (apiKey, name) {
  const maps = await loadGoogleMaps(apiKey)
  return maps.importLibrary(name)
}
