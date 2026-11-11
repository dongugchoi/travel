// 직접 입력한 글자(여행 제목, 일정 이름, 장소, 메모 등)를 일본어로 번역
// - Google Cloud Translation API (v2). 한 달 50만 글자 무료, 하루 15,000글자 상한을 걸어 둠
// - 번역 결과는 Firestore 문서의 tr 칸에 { '한국어': '日本語' } 로 저장 → 같은 글은 다시 번역하지 않음

const HANGUL = /[가-힣]/

// 여행 데이터에서 번역할 글자를 모두 모음 (한글이 들어 있는 것만)
export function collectTexts (trip) {
  const set = new Set()
  const add = (v) => { if (v && typeof v === 'string' && HANGUL.test(v)) set.add(v.trim()) }
  add(trip.title)
  add(trip.destination)
  ;(trip.days || []).forEach((d) => {
    add(d.title)
    add(d.region)
    ;(d.schedules || []).forEach((s) => {
      add(s.place)
      add(s.address)
      add(s.memo)
      ;(s.comments || []).forEach(c => add(c && c.text))
    })
  })
  return [...set].filter(Boolean)
}

// 한 번에 최대 100개씩 번역 요청 (한 번 = 보낸 글자 수만큼 하루 상한에서 차감)
export async function translateToJa (apiKey, texts) {
  const out = {}
  for (let i = 0; i < texts.length; i += 100) {
    const chunk = texts.slice(i, i + 100)
    const res = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
      body: JSON.stringify({ q: chunk, source: 'ko', target: 'ja', format: 'text' })
    })
    if (!res.ok) {
      const err = new Error(`번역 실패 (${res.status})`)
      err.status = res.status
      throw err
    }
    const data = await res.json()
    data.data.translations.forEach((t, j) => { out[chunk[j]] = t.translatedText })
  }
  return out
}
