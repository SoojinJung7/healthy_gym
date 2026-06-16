/* =========================================================================
   HEALTHY GYM — 폼 수신용 Google Apps Script
   (빠른 문의 / 체험레슨 / 시설 건의 데이터를 구글 시트에 기록하고,
    선택 시 텔레그램으로 즉시 알림을 보냅니다.)

   ▶ 설치 방법
   1) 구글 시트 새로 만들기 → 상단 메뉴 [확장 프로그램] → [Apps Script]
   2) 기본 코드를 지우고 이 파일 내용을 통째로 붙여넣기
   3) (선택) 텔레그램 알림을 원하면 아래 TELEGRAM 값 2개를 채우기
   4) 상단 [배포] → [새 배포] → 유형 [웹 앱]
        - 실행 계정: 나
        - 액세스 권한: "모든 사용자"
   5) 생성된 "웹 앱 URL"을 복사 → js/config.js 의 webhookUrl 에 붙여넣기
   ========================================================================= */

// (선택) 텔레그램 알림 — 쓰지 않으려면 빈 문자열로 두세요.
var TELEGRAM_BOT_TOKEN = "";   // 예: "123456:ABC-DEF..."
var TELEGRAM_CHAT_ID   = "";   // 예: "123456789"

// 각 문의 종류별 한글 이름
var SOURCE_LABEL = {
  quick:    "빠른 문의",
  trial:    "체험레슨 신청",
  facility: "시설 건의"
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    saveToSheet(data);
    notifyTelegram(data);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveToSheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = SOURCE_LABEL[data.source] || data.source || "기타";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["접수시각", "분류/종목", "성함", "연락처", "내용", "희망일", "희망시간"]);
  }
  sheet.appendRow([
    new Date(),
    data.topic || data.program || data.category || "",
    data.name || "",
    data.phone || "",
    data.message || "",
    data.date || "",
    data.time || ""
  ]);
}

function notifyTelegram(data) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  var title = SOURCE_LABEL[data.source] || "새 문의";
  var lines = ["🔔 " + title];
  if (data.topic)    lines.push("• 종류: " + data.topic);
  if (data.program)  lines.push("• 프로그램: " + data.program);
  if (data.category) lines.push("• 분류: " + data.category);
  if (data.name)     lines.push("• 성함: " + data.name);
  if (data.phone)    lines.push("• 연락처: " + data.phone);
  if (data.date)     lines.push("• 희망일: " + data.date);
  if (data.time)     lines.push("• 희망시간: " + data.time);
  if (data.message)  lines.push("• 내용: " + data.message);

  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  UrlFetchApp.fetch(url, {
    method: "post",
    payload: { chat_id: TELEGRAM_CHAT_ID, text: lines.join("\n") },
    muteHttpExceptions: true
  });
}
