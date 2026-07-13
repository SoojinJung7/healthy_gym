/* =========================================================
   시설 건의(음성) 다단계 플로우
   - STEP 1: 존 선택
   - STEP 2: 안내 + 전화/녹음
   - STEP 3: 음성인식(Web Speech API) / 폴백 직접입력
   - STEP 4: 내용 확인 + 문자 옵트인
   - STEP 5: 전송 완료
   전송 계약: off-calendar POST /api/public/facility-suggestions
   ========================================================= */

(function () {
  var CFG = window.GYM_CONFIG || {};

  /* ---------- 상태 ---------- */
  var state = {
    step: 1,        // 현재 단계
    zone: "",       // 선택한 존
    content: "",    // 인식/입력된 건의 내용
    notify: false,  // 문자 받기 여부
  };

  /* ---------- 자주 쓰는 엘리먼트 ---------- */
  var steps = document.querySelectorAll(".fac-step");
  var zoneLabels = document.querySelectorAll("[data-zone-label]");
  var backBtn = document.querySelector("[data-fac-back]");

  /* ---------- 토스트 (app.js와 동일 규칙, 독립 구현) ---------- */
  function toast(msg) {
    var t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* ---------- 전화번호 유효성 (app.js validPhone과 동일 규칙) ---------- */
  function validPhone(v) {
    var digits = (v || "").replace(/[^0-9]/g, "");
    return digits.length >= 9 && digits.length <= 11;
  }

  /* ---------- 무동작 자동복귀 억제 (녹음 중 손을 안 대도 안 끊기게) ----------
     app.js의 idle 타이머는 touch/mouse/key/scroll 이벤트로만 리셋된다.
     녹음(STEP 3) 중에는 회원이 말만 하고 화면을 만지지 않으므로, 무해한
     scroll 이벤트를 주기적으로 흘려 idle 타이머가 계속 리셋되게 한다. */
  var keepAwakeTimer = null;
  function keepAwake() {
    try { document.dispatchEvent(new Event("scroll")); } catch (err) {}
  }
  function startKeepAwake() {
    if (keepAwakeTimer) return;
    keepAwake();
    keepAwakeTimer = setInterval(keepAwake, 30000); // idleReset(기본 90s)보다 짧게
  }
  function stopKeepAwake() {
    if (keepAwakeTimer) { clearInterval(keepAwakeTimer); keepAwakeTimer = null; }
  }

  /* ---------- 단계 전환 ---------- */
  function goStep(n) {
    state.step = n;
    steps.forEach(function (sec) {
      sec.hidden = parseInt(sec.getAttribute("data-step"), 10) !== n;
    });
    // 선택 존 배지 동기화
    zoneLabels.forEach(function (el) { el.textContent = state.zone || "—"; });
    // 녹음 단계를 벗어나면 인식 중지
    if (n !== 3) stopRecognition();
    // 녹음 단계에서만 무동작 억제 유지
    if (n === 3) startKeepAwake(); else stopKeepAwake();
  }

  /* ---------- 뒤로가기: 단계별 처리 ---------- */
  if (backBtn) {
    backBtn.addEventListener("click", function (e) {
      // STEP 1(또는 완료)에서는 기본 동작(index.html 이동) 허용
      if (state.step <= 1 || state.step >= 5) return;
      e.preventDefault();
      // 한 단계 뒤로
      goStep(state.step - 1);
    });
  }

  /* ---------- STEP 1: 존 선택 ---------- */
  document.querySelectorAll(".zone-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.zone = btn.getAttribute("data-zone");
      goStep(2);
    });
  });

  /* ---------- STEP 2: 녹음으로 이동 ---------- */
  var goRecordBtn = document.querySelector("[data-go-record]");
  if (goRecordBtn) {
    goRecordBtn.addEventListener("click", function () {
      goStep(3);
      startRecognition();
    });
  }

  /* =========================================================
     STEP 3: 음성 인식 (Web Speech API)
     ========================================================= */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = null;
  var recActive = false;
  var committedText = "";   // 이전 인식 세션들에서 확정된 텍스트(자동 재시작 간 누적)
  var sessionFinal = "";    // 현재 세션에서 확정된 텍스트(매 onresult마다 0부터 재조립)

  var liveBox = document.querySelector("[data-rec-live]");
  var fallbackBox = document.querySelector("[data-rec-fallback]");
  var fallbackMsg = document.querySelector("[data-rec-fallback-msg]");
  var fallbackInput = document.querySelector("[data-rec-fallback-input]");
  var recTextEl = document.querySelector("[data-rec-text]");
  var recPulse = document.querySelector("[data-rec-pulse]");

  function showFallback(msg) {
    if (liveBox) liveBox.hidden = true;
    if (fallbackBox) fallbackBox.hidden = false;
    if (msg && fallbackMsg) fallbackMsg.textContent = msg;
  }

  function showLive() {
    if (liveBox) liveBox.hidden = false;
    if (fallbackBox) fallbackBox.hidden = true;
  }

  function setRecText(txt) {
    if (recTextEl) recTextEl.textContent = txt || "듣고 있어요…";
  }

  function setPulse(on) {
    if (recPulse) recPulse.classList.toggle("on", !!on);
  }

  function startRecognition() {
    // 미지원 브라우저 → 폴백
    if (!SR) {
      showFallback("이 기기는 음성 인식을 지원하지 않아요. 아래에 직접 입력해 주세요.");
      return;
    }
    showLive();
    committedText = "";
    sessionFinal = "";
    setRecText("듣고 있어요…");

    try {
      recognition = new SR();
    } catch (err) {
      showFallback("음성 인식을 시작할 수 없어요. 아래에 직접 입력해 주세요.");
      return;
    }

    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = function () {
      recActive = true;
      setPulse(true);
    };

    recognition.onresult = function (e) {
      // 전체 results 배열을 매번 0부터 다시 조립한다.
      // (모바일/태블릿은 continuous 재시작 시 이전 확정 결과를 배열에 남겨둔 채
      //  다시 이벤트를 쏘기 때문에, resultIndex부터 += 로 누적하면 같은 구간이 중복됨)
      var interim = "";
      sessionFinal = "";
      for (var i = 0; i < e.results.length; i++) {
        var res = e.results[i];
        if (res.isFinal) {
          sessionFinal += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      setRecText((committedText + sessionFinal + interim).trim());
      keepAwake(); // 말하는 동안 idle 타이머 리셋
    };

    recognition.onerror = function (e) {
      // 권한 거부 / 미허용 → 폴백
      if (e && (e.error === "not-allowed" || e.error === "service-not-allowed")) {
        setPulse(false);
        recActive = false;
        showFallback("마이크 권한이 거부되었어요. 아래에 직접 입력해 주세요.");
      }
      // no-speech 등 일시적 오류는 무시(계속 대기)
    };

    recognition.onend = function () {
      recActive = false;
      setPulse(false);
      // 재시작하면 results 배열이 비워지므로, 이번 세션의 확정분을 누적 텍스트로 옮긴다.
      if (sessionFinal) {
        committedText = (committedText + sessionFinal).trim() + " ";
        sessionFinal = "";
      }
      // continuous 인식이 자동 종료되면(예: 침묵) 녹음 단계에 머무는 동안 재개
      if (state.step === 3 && liveBox && !liveBox.hidden) {
        try { recognition.start(); } catch (err) { /* 이미 시작됨 등 무시 */ }
      }
    };

    try {
      recognition.start();
    } catch (err) {
      // 이미 시작된 경우 등
    }
  }

  function stopRecognition() {
    setPulse(false);
    if (recognition) {
      // onend 자동 재시작을 막기 위해 핸들러 제거 후 중지
      recognition.onend = null;
      try { recognition.stop(); } catch (err) {}
    }
    recActive = false;
  }

  /* STEP 3 버튼: 다시 말하기 */
  var restartBtn = document.querySelector("[data-rec-restart]");
  if (restartBtn) {
    restartBtn.addEventListener("click", function () {
      // 폴백 입력 중이면 초기화, 아니면 인식 재시작
      if (fallbackBox && !fallbackBox.hidden) {
        if (fallbackInput) { fallbackInput.value = ""; fallbackInput.focus(); }
        return;
      }
      stopRecognition();
      committedText = "";
      sessionFinal = "";
      setRecText("듣고 있어요…");
      startRecognition();
    });
  }

  /* STEP 3 버튼: 완료 → STEP 4 */
  var recDoneBtn = document.querySelector("[data-rec-done]");
  var confirmText = document.querySelector("[data-confirm-text]");
  if (recDoneBtn) {
    recDoneBtn.addEventListener("click", function () {
      var text;
      if (fallbackBox && !fallbackBox.hidden) {
        text = (fallbackInput && fallbackInput.value || "").trim();
      } else {
        // 화면에 표시된 텍스트(확정+중간 병합분)를 사용 — 마지막 미확정 발화까지 포함
        var shown = recTextEl ? recTextEl.textContent.trim() : "";
        text = (shown && shown !== "듣고 있어요…") ? shown : (committedText + sessionFinal).trim();
      }

      if (!text) {
        toast("건의 내용을 말씀하거나 입력해 주세요.");
        return;
      }

      stopRecognition();
      state.content = text;
      if (confirmText) confirmText.value = text;
      goStep(4);
    });
  }

  /* =========================================================
     STEP 4: 문자 옵트인 토글
     ========================================================= */
  var smsToggle = document.querySelector("[data-sms-toggle]");
  var smsPhoneWrap = document.querySelector("[data-sms-phone]");
  var confirmPhone = document.querySelector("[data-confirm-phone]");

  if (smsToggle) {
    smsToggle.addEventListener("click", function (e) {
      var opt = e.target.closest(".sms-opt");
      if (!opt) return;
      smsToggle.querySelectorAll(".sms-opt").forEach(function (b) {
        b.classList.toggle("on", b === opt);
      });
      var want = opt.getAttribute("data-sms") === "yes";
      state.notify = want;
      if (smsPhoneWrap) smsPhoneWrap.hidden = !want;
      if (want && confirmPhone) confirmPhone.focus();
    });
  }

  /* =========================================================
     STEP 4 → 전송
     ========================================================= */
  var sendBtn = document.querySelector("[data-fac-send]");
  if (sendBtn) {
    sendBtn.addEventListener("click", function () {
      // 내용 최신화(수정 반영)
      var content = (confirmText && confirmText.value || "").trim();
      if (!content) {
        toast("건의 내용을 입력해 주세요.");
        if (confirmText) confirmText.focus();
        return;
      }
      if (content.length > 1000) {
        toast("건의 내용은 1000자 이내로 입력해 주세요.");
        return;
      }
      state.content = content;

      // 전화번호 (문자 받기 선택 시에만)
      var phone = "";
      if (state.notify) {
        phone = (confirmPhone && confirmPhone.value || "").trim();
        if (!phone || !validPhone(phone)) {
          toast("문자를 받을 번호를 정확히 입력해 주세요.");
          if (confirmPhone) confirmPhone.focus();
          return;
        }
      }

      var payload = {
        org_id: CFG.orgId || "",
        zone: state.zone,
        content: state.content,
        notify_sms: state.notify,
        source: "kiosk",
      };
      if (state.notify && phone) payload.phone = phone;

      send(payload, sendBtn);
    });
  }

  /* ---------- 실제 전송 ---------- */
  function send(payload, btn) {
    if (btn) { btn.disabled = true; btn.textContent = "전송 중..."; }

    var url = CFG.facilitySuggestUrl;
    var key = CFG.facilityApiKey;
    var org = CFG.orgId;
    // URL·키·orgId 셋 다 실제 값이어야 실전송. 하나라도 PASTE_ 플레이스홀더면
    // 데모 모드로 폴백(예: orgId 미설정 시 서버가 400 invalid org_id 반환 방지).
    var configured =
      url && url.indexOf("PASTE_") === -1 &&
      key && key.indexOf("PASTE_") === -1 &&
      org && org.indexOf("PASTE_") === -1;

    function done() {
      goStep(5);
      startCountdown();
    }

    function fail(msg) {
      if (btn) { btn.disabled = false; btn.textContent = "다시 보내기"; }
      toast(msg || "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }

    if (!configured) {
      // 데모 모드: 서버 미설정 상태에서도 화면 흐름 확인 가능
      console.warn("[DEMO] facilitySuggestUrl/facilityApiKey 미설정. 전송될 데이터:", payload);
      setTimeout(done, 500);
      return;
    }

    fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key,
      },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().catch(function () { return null; })
          .then(function (data) {
            if (res.ok && data && data.ok) {
              setTimeout(done, 300);
            } else {
              fail((data && data.error) || "전송에 실패했습니다. 다시 시도해 주세요.");
            }
          });
      })
      .catch(function () {
        fail("전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      });
  }

  /* ---------- STEP 5: 완료 후 자동 복귀 ---------- */
  function startCountdown() {
    var el = document.querySelector("[data-fac-count]");
    var n = 4;
    if (el) el.textContent = n;
    var t = setInterval(function () {
      n -= 1;
      if (el) el.textContent = n;
      if (n <= 0) { clearInterval(t); location.href = "index.html"; }
    }, 1000);
  }

  /* ---------- 초기 진입 ---------- */
  goStep(1);
})();
