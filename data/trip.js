// 기본 일정 (견본)
// 실제 일정은 Firestore(trips/japan-2026)에 저장되어 있고, 이 파일은 DB 에 문서가 없을 때 처음 한 번만 쓰입니다.
// 공개 저장소라서 실제 여행 날짜·장소는 넣지 않았습니다.
//
// 모양:
//   day: 몇째 날 (URL: /days/1), date: 'YYYY-MM-DD', region: 그날 머무는 도시(지도 검색 앞에 붙음)
//   schedules: [{ time: 'HH:MM', place: '할 일', address: '지도 검색어', memo: '' }]
export default {
  title: '나의 여행',
  destination: '',
  startDate: '2026-01-01',
  endDate: '2026-01-01',
  days: [
    {
      day: 1,
      date: '2026-01-01',
      region: '',
      title: '1일차',
      schedules: []
    }
  ]
}
