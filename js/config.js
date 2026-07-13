/* =========================================================
   설정 파일 — 운영자가 직접 수정하는 곳
   ========================================================= */

window.GYM_CONFIG = {
  /* 헬스장 이름 / 안내 문구 */
  name: "헬피짐",
  tagline: "무엇을 도와드릴까요?",

  /* 대표 전화번호 (숫자만, 하이픈 없이) */
  phone: "0317287724",

  /* ▼▼ 여기에 Google Apps Script 웹앱 URL을 붙여넣으세요 ▼▼
     (배포 방법은 google-apps-script.gs 파일 상단 주석 참고)
     설정 전에는 폼 전송이 "데모 모드"로 동작합니다. */
  webhookUrl: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE",

  /* 무동작 시 자동으로 메인 화면 복귀 (키오스크용, 초 단위 / 0이면 끔) */
  idleResetSeconds: 90,

  /* ▼▼ 시설 건의(음성) 전송 설정 — off-calendar 연동 ▼▼ */

  /* off-calendar 시설 건의 수집 API 주소 */
  facilitySuggestUrl: "https://off-calendar.vercel.app/api/public/facility-suggestions",

  /* off-calendar Bearer 인증 키.
     주의: 이 값은 클라이언트(키오스크 브라우저)에 그대로 노출됩니다.
     반드시 insert(건의 추가) 전용 저권한 키를 발급해 사용하세요. */
  facilityApiKey: "hgym_3a206362d1495e9495490d626cf5b918d241ed0602d8386a",

  /* 이 헬스장 조직(org)의 UUID */
  orgId: "d85d5b18-abda-4491-9f99-fcb19f51894e",

  /* 존 목록 (이 순서/문자열 그대로 off-calendar와 일치해야 함) */
  zones: ["A존", "중간", "GX룸", "B존"],
};
