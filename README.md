# HEALTHY GYM — 헬스장 안내 키오스크 랜딩 페이지

게이트 옆 태블릿(세로 A4 / 아이패드)에 항상 켜두고, 회원님이 입장하며 바로 터치할 수 있는 안내 페이지입니다.

## 메인 화면 4가지 기능
1. 💬 **빠른 문의하기** — 회원권/PT/운영시간 등 문의 접수
2. 🧑‍🏫 **강사 프로필 보기** — 강사진 소개
3. 🎟️ **체험레슨 신청하기** — 무료 체험 신청
4. 🛠️ **시설 건의하기** — 개선 의견 접수

문의/신청/건의는 **Google Apps Script** 를 통해 구글 시트에 기록되고, 원하면 텔레그램으로 즉시 알림이 옵니다. (별도 서버 불필요, 무료)

## 폴더 구조
```
index.html               메인 (4개 버튼)
quick_inquiry.html       빠른 문의 폼
coaches.html             강사 프로필
trial_lesson.html        체험레슨 신청 폼
facility_suggestion.html 시설 건의 폼
inquiry_sent.html        접수 완료 화면
css/style.css            전체 디자인
js/config.js             ★ 운영자가 수정하는 설정 파일
js/app.js                폼 전송·키오스크 동작
images/                  로고·강사 사진
google-apps-script.gs    폼 수신 서버 코드(구글에 붙여넣기)
manifest.json, sw.js     PWA(홈 화면 추가·오프라인)
```

## 처음 설정 (3단계)

### 1. 폼 수신 연결 (Google Apps Script)
`google-apps-script.gs` 파일 상단 주석의 안내대로 배포한 뒤,
발급된 웹 앱 URL을 `js/config.js` 의 `webhookUrl` 에 붙여넣으세요.
> 설정 전에도 "데모 모드"로 화면 흐름은 확인됩니다(전송 데이터는 콘솔에만 출력).

### 2. 헬스장 정보 입력
`js/config.js` 에서 수정:
- `name` : 헬스장 이름
- `phone` : 대표 전화번호 (숫자만)
- `idleResetSeconds` : 무동작 시 메인 화면 자동 복귀 시간(초)

### 3. 내용 채우기
- **강사 프로필**: `coaches.html` 의 `.coach` 블록을 복사/수정. 사진은 `images/` 에 넣고 경로 교체.
- **색상**: `css/style.css` 맨 위 `--accent` 한 줄만 바꾸면 전체 포인트 색이 바뀝니다.

## 로컬에서 미리 보기
```bash
cd healthy_gym
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

## 배포 (GitHub Pages)
1. 이 폴더를 GitHub 저장소에 push
2. 저장소 **Settings → Pages → Branch: main / root** 선택
3. 발급된 주소를 태블릿 브라우저에서 열고 **홈 화면에 추가** → 전체화면 키오스크로 사용

## 태블릿 키오스크 팁
- iOS Safari에서 페이지 열기 → 공유 → **홈 화면에 추가** → 그 아이콘으로 실행하면 주소창 없는 전체화면
- 설정 → 손쉬운 사용 → **안내 접근(Guided Access)** 으로 다른 앱 이탈 방지
- 화면 자동 잠금 끄기, 충전 케이블 연결 권장
