/* =========================================================
   트레이너 목록/상세 렌더링
   - coaches.html         : #coachList 에 카드 그리드 렌더
   - coach_detail.html    : #coachDetail 에 상세(좌: 프로그램 / 우: 사진) 렌더
   데이터 출처: js/coaches-data.js (window.COACHES)
   ========================================================= */
(function () {
  var COACHES = window.COACHES || [];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // 썸네일(원형): 사진이 있으면 <img>, 없으면 이니셜 아바타
  function avatar(c, extra) {
    extra = extra || "";
    if (c.photo) {
      return '<img class="coach__photo ' + extra + '" src="' + esc(c.photo) +
             '" alt="' + esc(c.name) + ' 트레이너" />';
    }
    return '<div class="coach__avatar ' + extra + '" style="--c1:' +
           esc(c.c1) + ';--c2:' + esc(c.c2) + '">' + esc(c.initial) + "</div>";
  }

  /* ---------- 목록 페이지 ---------- */
  var list = document.getElementById("coachList");
  if (list) {
    list.innerHTML = COACHES.map(function (c) {
      var tags = (c.tags || []).map(function (t) {
        return "<span>" + esc(t) + "</span>";
      }).join("");
      return (
        '<a class="coach" href="coach_detail.html?id=' + encodeURIComponent(c.id) + '">' +
          avatar(c) +
          '<h3 class="coach__name">' + esc(c.name) + "</h3>" +
          '<div class="role">' + esc(c.role) + "</div>" +
          "<p>" + esc(c.intro) + "</p>" +
          '<div class="tags">' + tags + "</div>" +
        "</a>"
      );
    }).join("");
  }

  /* ---------- 상세 페이지 ---------- */
  var detail = document.getElementById("coachDetail");
  if (detail) {
    var id = new URLSearchParams(location.search).get("id");
    var c = COACHES.filter(function (x) { return x.id === id; })[0] || COACHES[0];
    if (!c) return;

    document.title = c.name + " · 헬피짐";

    var programs = (c.programs || []).map(function (p, i) {
      var n = ("0" + (i + 1)).slice(-2);
      return (
        '<li class="cd-prog">' +
          '<span class="cd-prog__num">' + n + "</span>" +
          '<span class="cd-prog__txt">' + esc(p) + "</span>" +
        "</li>"
      );
    }).join("");

    var tags = (c.tags || []).map(function (t) {
      return "<span>" + esc(t) + "</span>";
    }).join("");

    var photoCls = "cd-photo" + (c.detailFit === "contain" ? " cd-photo--contain" : "");
    var media = c.detailPhoto
      ? '<img src="' + esc(c.detailPhoto) + '" alt="' + esc(c.name) + ' 트레이너" />'
      : avatar(c, "coach__avatar--xl");

    detail.innerHTML =
      '<article class="cd-card">' +
        '<div class="cd-info">' +
          '<h3 class="cd-name">' + esc(c.name) + "</h3>" +
          '<div class="role">' + esc(c.role) + "</div>" +
          '<p class="cd-intro">' + esc(c.intro) + "</p>" +
          '<div class="tags cd-tags">' + tags + "</div>" +
          '<div class="cd-programs">' +
            '<div class="cd-programs__label">🌟 특히 잘하는 프로그램</div>' +
            '<ol class="cd-prog-list">' + programs + "</ol>" +
          "</div>" +
        "</div>" +
        '<div class="' + photoCls + '">' + media + "</div>" +
      "</article>";
  }
})();
