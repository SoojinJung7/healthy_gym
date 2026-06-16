/* =========================================================
   공통 동작 스크립트
   - 칩(다중 선택) 토글
   - 폼 전송 (Google Apps Script 웹훅)
   - 무동작 시 메인 화면 자동 복귀 (키오스크)
   - 전화번호/이름 적용
   ========================================================= */

(function () {
  var CFG = window.GYM_CONFIG || {};

  /* ---------- 헬스장 이름/전화번호 자동 주입 ---------- */
  document.querySelectorAll("[data-gym-name]").forEach(function (el) {
    el.textContent = CFG.name || "";
  });
  document.querySelectorAll("[data-gym-tagline]").forEach(function (el) {
    el.textContent = CFG.tagline || "";
  });
  document.querySelectorAll("[data-gym-tel]").forEach(function (el) {
    if (CFG.phone) el.setAttribute("href", "tel:" + CFG.phone);
  });

  /* ---------- 칩 토글 ---------- */
  document.querySelectorAll(".chips").forEach(function (group) {
    group.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      chip.classList.toggle("on");
    });
  });

  function selectedChips(name) {
    var group = document.querySelector('.chips[data-name="' + name + '"]');
    if (!group) return [];
    return Array.prototype.map
      .call(group.querySelectorAll(".chip.on"), function (c) {
        return c.textContent.trim();
      });
  }

  /* ---------- 토스트 ---------- */
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

  /* ---------- 전화번호 유효성 (대략) ---------- */
  function validPhone(v) {
    var digits = (v || "").replace(/[^0-9]/g, "");
    return digits.length >= 9 && digits.length <= 11;
  }

  /* ---------- 폼 전송 ---------- */
  // <form data-form="quick"> 형태의 폼을 자동 처리
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    var source = form.getAttribute("data-form");
    var btn = form.querySelector(".submit-btn");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var payload = { source: source };

      // 일반 input/textarea 수집 (name 속성 기준)
      form.querySelectorAll("input[name], textarea[name]").forEach(function (el) {
        payload[el.name] = el.value.trim();
      });

      // 칩 그룹 수집
      form.querySelectorAll(".chips[data-name]").forEach(function (group) {
        payload[group.getAttribute("data-name")] =
          selectedChips(group.getAttribute("data-name")).join(", ");
      });

      // 필수값 검증
      var requiredEls = form.querySelectorAll("[data-required]");
      for (var i = 0; i < requiredEls.length; i++) {
        var el = requiredEls[i];
        var ok = el.classList && el.classList.contains("chips")
          ? selectedChips(el.getAttribute("data-name")).length > 0
          : !!el.value.trim();
        if (!ok) {
          toast(el.getAttribute("data-required") || "필수 항목을 입력해 주세요.");
          if (el.focus) el.focus();
          return;
        }
      }

      // 전화번호 검증 (있을 때만)
      var phoneEl = form.querySelector('input[name="phone"]');
      if (phoneEl && phoneEl.value.trim() && !validPhone(phoneEl.value)) {
        toast("연락처를 정확히 입력해 주세요.");
        phoneEl.focus();
        return;
      }

      send(payload, btn);
    });
  });

  function send(payload, btn) {
    if (btn) { btn.disabled = true; btn.textContent = "전송 중..."; }

    var url = CFG.webhookUrl;
    var configured = url && url.indexOf("PASTE_") === -1;

    function done() {
      // mode:no-cors 라 응답 본문을 읽을 수 없으므로 전송 후 완료 페이지로 이동
      location.href = "inquiry_sent.html";
    }

    if (!configured) {
      // 데모 모드: 서버 미설정 상태에서도 화면 흐름 확인 가능
      console.warn("[DEMO] webhookUrl 미설정. 전송될 데이터:", payload);
      setTimeout(done, 500);
      return;
    }

    fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then(function () { setTimeout(done, 400); })
      .catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = "다시 전송"; }
        toast("전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      });
  }

  /* ---------- 무동작 시 메인 화면 복귀 (키오스크) ---------- */
  var idleSec = parseInt(CFG.idleResetSeconds, 10) || 0;
  var isHome = /(^|\/)index\.html$/.test(location.pathname) ||
               location.pathname.replace(/\/$/, "").endsWith("/healthy_gym") ||
               location.pathname === "/" ;
  if (idleSec > 0 && !isHome) {
    var timer;
    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        location.href = "index.html";
      }, idleSec * 1000);
    }
    ["touchstart", "mousedown", "keydown", "scroll"].forEach(function (ev) {
      document.addEventListener(ev, resetTimer, { passive: true });
    });
    resetTimer();
  }

  /* ---------- 서비스워커 등록 (PWA / 오프라인) ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
