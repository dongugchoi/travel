# ✈️ 여행 계획 페이지 (Vue 2 + Nuxt 2)

날짜별(Day 1, Day 2, ...)로 여행 일정을 정리하고 확인할 수 있는 웹 페이지입니다.

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| 프레임워크 | Nuxt 2 (`^2.17`) |
| UI | Vue 2 (`^2.7`) |
| 상태 관리 | Vuex (Nuxt 내장 `store/` 디렉터리) |
| 라우팅 | Nuxt 파일 기반 라우팅 (`pages/`) |
| 저장소 | Firebase Cloud Firestore (`firebase@10`) |
| 로그인 | Firebase Authentication (구글 로그인) |
| 지도 | Google Maps JavaScript API · Embed API · Routes API · Places API (New) |

> Nuxt 2는 원래 Node.js 16~18용이지만, 이 프로젝트는 최신 Node(24에서 확인)에서도 돌아가도록 설정되어 있습니다.
> - npm 스크립트에 `cross-env NODE_OPTIONS=--openssl-legacy-provider`가 들어 있습니다.
> - `webpack@4`를 devDependencies에 직접 넣었습니다. 빼면 webpack 5가 설치되어 `Cannot import module '@nuxt/builder'` 오류가 납니다.
> - Firebase SDK는 webpack 4가 못 읽는 최신 문법을 써서 `nuxt.config.js`의 `build.transpile`로 변환합니다. 개발 서버 로그의 `[BABEL] Note: The code generator has deoptimised ...` 는 파일이 커서 나오는 안내일 뿐 오류가 아닙니다.

## 시작하기

```bash
npm install
```

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과 실행 |
| `npm run generate` | 정적 사이트 생성 (`dist/`) |

## 프로젝트 구조

```
travel/
├── assets/
│   └── css/
│       └── main.css          # 전역 스타일
├── components/               # 자동 import 되는 컴포넌트
│   ├── AppHeader.vue         # 상단 헤더
│   ├── DayCard.vue           # 날짜별 카드 (메인 화면)
│   ├── MapDialog.vue         # 지도 다이얼로그 (경로, 현재 위치에서 길찾기, 지도에서 장소 추가)
│   ├── RouteMap.vue          # 구간 목록 + 이동 시간·거리 (지도는 버튼 눌렀을 때만)
│   ├── ScheduleDialog.vue    # 일정 추가 다이얼로그 (장소 자동완성)
│   ├── ScheduleItem.vue      # 하루 일정의 개별 항목
│   └── TimePicker.vue        # 시간 선택판 (아침·오후·저녁·새벽 / 5분 단위)
├── data/
│   └── trip.js               # 기본 일정 (Firestore 문서가 없을 때 처음 한 번 저장됨)
├── mixins/
│   └── routeDialog.js        # 다이얼로그를 주소(?dialog=)에 연결 → 뒤로 가기로 닫힘
├── layouts/
│   └── default.vue           # 기본 레이아웃 (헤더 + 본문)
├── pages/
│   ├── index.vue             # /          전체 일정 (날짜별 카드 목록)
│   └── days/
│       └── _day.vue          # /days/:day 특정 날짜 상세 일정
├── plugins/
│   ├── filters.js            # 날짜/카테고리 표시용 필터
│   └── firebase.client.js    # Firestore + 구글 로그인 (브라우저에서만 실행)
├── store/
│   └── index.js              # Vuex 스토어 (일정·로그인 상태, Firestore 저장, 경로 캐시)
├── utils/
│   ├── googleMaps.js         # 구글 지도 스크립트를 필요할 때만 불러오기
│   └── route.js              # 구간 만들기, Routes API 호출, 시간·거리 표시
├── firestore.rules           # Firestore 보안 규칙 (콘솔에 게시한 내용과 같음)
├── .env.example              # 구글 지도 키 / Firebase 설정 예시
├── nuxt.config.js
├── package.json
└── README.md
```

## 디자인

"여행 매거진" 스타일입니다. 크림색 바탕에 세리프 글꼴(Noto Serif KR)을 쓰고, 날짜 번호(01, 02…)를 크게 보여줍니다.
색은 [`assets/css/main.css`](assets/css/main.css) 맨 위의 CSS 변수(`--bg`, `--accent` 등)만 바꾸면 전체에 반영됩니다.

## 지도 · 길찾기 (Google Maps)

날짜 상세 화면(`/days/:day`)의 **ROUTE** 부분에서 그날의 이동을 봅니다. **페이지에 들어올 때는 지도를 불러오지 않습니다** (요금 절약).

| 기능 | 어떻게 | 쓰는 API |
| --- | --- | --- |
| 구간별 이동 시간·거리 (`도보 18분 · 1.2km`) | 일정이 바뀔 때 **편집자가 한 번만** 계산해서 Firestore에 저장. 다른 사람은 저장된 값만 봄 | Routes API |
| 지도 보기 (도보) | "🚶 도보"/"지도 보기" 버튼 → 다이얼로그. 한 손가락으로 움직이고 Ctrl 안내 없음 | Maps JavaScript API |
| 대중교통 경로 | "🚃 대중교통" 버튼 → 무료 지도로 표시 | Maps Embed API (무료·무제한) |
| 현재 위치에서 여기까지 | 일정의 "📍 현재 위치에서 여기까지" → 브라우저 위치(무료)로 출발 | 위와 같음 |
| 장소 검색 자동완성 | 일정 추가 창에서 2글자 이상 입력 후 0.4초 멈추면 검색 | Places API (New) |
| 지도에서 장소 눌러 추가 | 지도 다이얼로그(도보)에서 가게·역을 누르면 "일정에 추가" | Places API (New) |

- **일본은 대중교통 시간 계산이 안 됩니다.** 구글이 일본 대중교통 경로를 외부 API(Routes API)에 주지 않기 때문입니다. 그래서 목록의 시간은 **도보 기준**이고 (자동차는 안 쓰므로 뺐음), 대중교통은 지도(Embed)에서 확인합니다.
- 지도를 불러오지 못하거나 하루 한도에 닿으면 **무료 지도(Embed)로 자동 전환**됩니다. "간단 지도로 보기" 버튼으로 직접 바꿀 수도 있습니다.
- **이날 전체 동선 보기**: 그날 장소를 번호(1, 2, 3…)로 찍고 도보 경로를 이어서 한 지도에 보여줍니다. 아래에 도보 합계 시간·거리가 나옵니다. (저장된 구간 경로를 써서 추가 계산이 거의 없음)
- 지도 창의 "구글 지도 앱에서 열기" 링크는 **API 키 없이** 동작합니다.
- 지도 검색어는 일정의 `address`를 쓰고, 없으면 `place`를 씁니다. 앞에 그날의 `region`(도시 이름)을 붙입니다. 자동완성으로 고른 장소는 `placeId`·좌표가 저장되어 더 정확합니다.

### 요금 안전장치 (하루 상한)

Google Cloud `japan` 프로젝트에 **하루 320번 상한**을 걸어 두었습니다. 31일 × 320 = 9,920번이라 API마다 매달 무료 1만 번을 넘을 수 없습니다. 상한에 닿으면 그날은 그 기능만 멈추고 요금은 나오지 않습니다.

| API | 상한 이름 | 하루 상한 |
| --- | --- | --- |
| Maps JavaScript API | Map loads per day | 320 |
| Routes API | Directions - ComputeRoutes per request quota per day | 320 |
| Places API (New) | AutocompletePlacesRequest per day | 320 |
| Places API (New) | GetPlaceRequest per day | 320 |
| Cloud Translation API | v2 and v3 general model characters per day | 15,000 글자 (31일 × 15,000 = 46.5만 < 무료 50만) |
| Maps Embed API | (상한 없음) | 무료·무제한 |

상한 변경: Google Cloud 콘솔 → IAM 및 관리자 → 할당량 → 이름으로 검색 → ⋮ → 할당량 수정.

### API 키 설정

키 하나(`travel-planner-maps`)로 4개 API를 씁니다.

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 만들고 결제 계정을 연결합니다.
2. **Maps Embed API, Maps JavaScript API, Routes API, Places API (New)** 를 사용 설정합니다.
3. "사용자 인증 정보 → API 키 만들기"로 키를 만듭니다.
4. 키 제한을 꼭 걸어 둡니다. 키는 브라우저에 그대로 노출되기 때문입니다.
   - 애플리케이션 제한: **웹사이트** → `http://localhost:3000/*` 와 실제 배포할 도메인
   - API 제한: 위 4개 API만 허용
5. `.env.example`을 `.env`로 복사하고 키를 넣습니다.
   ```
   GOOGLE_MAPS_API_KEY=발급받은키
   ```
6. 개발 서버를 껐다가 다시 켭니다. (`.env`는 서버 시작할 때만 읽습니다)

## 언어 (한국어 / 日本語)

- 헤더의 **한국어 | 日本語** 버튼으로 바꿉니다. 고른 언어는 그 기기(브라우저)에 저장됩니다.
- 번역 사전은 [`plugins/i18n.js`](plugins/i18n.js) 에 있습니다. 화면 글자는 한국어 원문을 키로 씁니다: `$t('삭제')` → `削除`. 새 글자를 넣으면 `JA` 목록에 일본어를 추가하세요 (없으면 한국어 그대로 나옴).
- 날짜도 바뀝니다: `1월 1일 (목)` ↔ `1月1日(木)`.
- **직접 입력한 내용(여행 제목, 일정 이름, 장소, 메모, 도시)** 은 Google Cloud Translation API 로 자동 번역합니다 ([`utils/translate.js`](utils/translate.js)).
  - 편집자가 저장할 때 **아직 번역 안 된 글자만** 번역해서 Firestore 문서의 `tr` 칸에 `{ '한국어': '日本語' }` 로 저장합니다. 이미 번역한 글은 다시 번역하지 않습니다.
  - 장소 검색으로 고른 장소는 번역 대신 **구글의 일본어 장소 이름**을 씁니다 (예: 센소지 → 浅草寺).
  - 쓰지 않게 된 글자의 번역은 자동으로 지웁니다.
  - 번역이 마음에 안 들면: Firebase 콘솔 → Firestore → `trips/japan-2026` → `tr` 에서 값을 직접 고칠 수 있습니다.

## 메모 · 작성자

- 일정마다 **메모칸**: "메모 추가" → 메모 창에서 쓰기. 메모칸 안의 "메모 수정 / 메모 삭제" (삭제는 확인 창).
- **누가 썼는지** 이름이 나옵니다: 일정은 위쪽에, 메모는 메모칸 아래 오른쪽 끝에 쓴 사람 이름이 나옵니다 (일본어 화면은 가타카나).
- 이름은 [`utils/members.js`](utils/members.js) 에서 로그인한 구글 계정으로 찾습니다. 사이트 코드에 이메일이 그대로 드러나지 않게 **이메일의 SHA-256 해시**로 저장했습니다.
- 이 기능 전에 만든 일정·메모에는 작성자가 없어서 이름이 표시되지 않습니다.

## 아이폰 뒤로 가기 (스와이프)

- 지도·일정 추가 다이얼로그를 열면 주소에 `?dialog=map` / `?dialog=add` 가 붙어 **브라우저 기록에 올라갑니다** ([`mixins/routeDialog.js`](mixins/routeDialog.js)).
- 그래서 아이폰에서 화면 왼쪽 끝을 오른쪽으로 쓸면(뒤로 가기) **페이지를 떠나지 않고 다이얼로그만 닫힙니다.** 한 번 더 쓸면 이전 페이지로 갑니다.
- 지도 → "일정에 추가"로 넘어간 경우 뒤로 가면 지도로 돌아가지 않고 바로 날짜 페이지로 갑니다.
- 홈 화면에 추가해도 Safari로 열리므로 같은 제스처가 그대로 동작합니다.

## 일정 저장 (Firebase Firestore)

일정을 추가·삭제하면 Firestore의 `trips/japan-2026` 문서에 바로 저장되고, 사이트를 열 때 그 문서를 불러옵니다.
헤더 오른쪽에 저장 상태(`불러오는 중… / 저장 중… / 저장됨 / 저장 실패`)가 표시됩니다.

- **프로젝트**: Google Cloud `japan` (`japan-514311`) — 지도 키와 같은 프로젝트
- **데이터베이스**: `(default)`, Standard 버전, 위치 `asia-northeast1` (도쿄)
- **처음 실행**: 문서가 없으면 `data/trip.js` 내용으로 문서를 만듭니다. 그 뒤로는 `data/trip.js`를 고쳐도 화면에 반영되지 않습니다. (Firestore 콘솔에서 문서를 지우면 다시 `data/trip.js`로 만들어집니다)
- **보기는 누구나, 수정은 허용된 구글 계정만**: 헤더의 "로그인"으로 구글 로그인하면, [`firestore.rules`](firestore.rules)의 `editors()` 목록에 있는 계정만 일정 추가·삭제와 이동 시간 계산을 할 수 있습니다. 목록에 없는 계정은 "보기 전용"으로 표시됩니다.
- **편집자 추가 (예: 여자친구 계정)**: `firestore.rules`의 `editors()`에 이메일을 추가 → Firebase 콘솔 → Firestore → 규칙 에 붙여넣고 **게시**. 사이트 코드에는 이메일 목록이 들어가지 않습니다(`editors/{이메일}` 문서 읽기 권한으로 확인).
- **요금**: Blaze(사용한 만큼 지불) 요금제지만, 무료 사용량(하루 읽기 5만 / 쓰기 2만)이 그대로 적용됩니다. 쓰기는 편집자만 가능해서 남이 쓰기 횟수를 늘릴 수 없습니다.

### .env 설정

Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹 앱 `travel-planner`)의 `firebaseConfig`에서 값을 복사합니다.

```
FIREBASE_API_KEY=apiKey 값 (AIza…)
FIREBASE_PROJECT_ID=japan-514311
FIREBASE_APP_ID=appId 값 (1:…:web:…)
```

값이 비어 있으면 Firestore 없이 `data/trip.js`만 보여주고, 헤더에 "저장 안 됨 (DB 미설정)"이 표시됩니다.

> 구글 로그인은 Firebase 콘솔 → Authentication → 로그인 방법 에서 **Google** 을 켜 두었습니다. 사이트를 배포하면 Authentication → 설정 → **승인된 도메인**에 배포 도메인을 추가해야 로그인이 됩니다.

## 라우팅

| URL | 페이지 | 설명 |
| --- | --- | --- |
| `/` | `pages/index.vue` | 여행 개요와 날짜별 카드 목록 |
| `/days/1` | `pages/days/_day.vue` | Day 1 상세 일정 |
| `/days/2` | `pages/days/_day.vue` | Day 2 상세 일정 |
| `/days/:day` | `pages/days/_day.vue` | 존재하지 않는 날짜면 404 |

## 날짜별 일정 데이터

일정의 기본값은 [`data/trip.js`](data/trip.js)에 있고, 실제 데이터는 Firestore에 저장됩니다. 하루 데이터 모양은 이렇습니다.

```js
{
  day: 1,                    // 몇째 날 (URL: /days/1)
  date: '2026-01-01',        // 날짜 (YYYY-MM-DD)
  region: '서울',             // 그날 머무는 도시 (지도 검색어 앞에 붙음)
  title: '도착',              // 그날의 제목
  routes: {},                // 구간별 도보 경로 캐시 (자동)
  schedules: [
    {
      time: '11:00',
      place: '공항 도착',          // 화면에 보이는 이름
      address: '인천공항',         // 지도 검색어 (생략하면 place 사용)
      placeId, lat, lng,         // 장소 검색으로 골랐을 때 (자동)
      memo: '',                  // 메모칸
      by: '이름', memoBy: '이름'   // 작성자 (자동)
    }
  ]
}
```

### 카테고리

| 값 | 표시 |
| --- | --- |
| `move` | 이동 |
| `stay` | 숙소 |
| `food` | 식사 |
| `tour` | 관광 |
| `shopping` | 쇼핑 |

## 앞으로 할 일 (TODO)

- [x] 여행지·날짜 입력 (사이트에서 직접)
- [x] 일정 데이터 저장 (Firebase Firestore)
- [x] 일정 추가를 다이얼로그로
- [ ] 일정 수정 기능
- [x] 지도 · 길찾기 (Google Maps Embed API)
- [x] 소요 시간 / 거리 표시 (도보, Routes API)
- [x] 장소 검색 자동완성 · 지도에서 장소 추가 · 현재 위치에서 길찾기
- [x] 구글 로그인 (편집자만 수정)
- [x] 여자친구 계정을 편집자로 추가
- [ ] 배포 — 아래 **배포 전 체크리스트** 먼저 할 것

### 배포 전 체크리스트 (보안)

- [ ] **보기도 로그인한 편집자만** 되게 바꾸기
  - `firestore.rules`: `allow read: if tripId == 'japan-2026';` → `allow read: if tripId == 'japan-2026' && isEditor();` 로 바꾸고 Firebase 콘솔에 게시
  - 사이트: 로그인 안 했으면 일정 대신 "로그인해 주세요" 화면 보여주기
- [x] 여자친구 계정을 `editors()` 에 추가 (완료)
- [ ] Firebase 자동 생성 키(`Browser key (auto created by Firebase)`)에 웹사이트 제한 걸기 — 배포 도메인, `japan-514311.firebaseapp.com`, `localhost:3000`
- [ ] 지도 키(`travel-planner-maps`) 웹사이트 제한에 배포 도메인 추가
- [ ] Firebase Authentication → 설정 → 승인된 도메인에 배포 도메인 추가
- [ ] `npm run generate` 로 정적 사이트를 만들어 올리기 (Nuxt 2 는 지원 종료라 서버 없이 올리는 게 안전)
- [ ] 구글 계정 2단계 인증 켜기
- [ ] 날짜별 예산 / 경비 정리
- [ ] 준비물 체크리스트
