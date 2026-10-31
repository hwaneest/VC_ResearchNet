/* =============================================================================
 *  People Lab ResearchNet — 앱 로직
 *  (외부 라이브러리 없음 · 순수 바닐라 JS · 정적 파일로 동작)
 * ========================================================================== */
(function () {
  "use strict";

  // 새로고침해도 읽던 자리로 돌아가지 않고 항상 맨 위에서 시작합니다
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const DATA = window.LAB_DATA || { meta: {}, authors: [], papers: [] };
  const authors = DATA.authors || [];
  const papers = DATA.papers || [];
  const authorById = Object.fromEntries(authors.map((a) => [a.id, a]));

  // ------------------------------------------------------------------ 상태
  const state = {
    view: "home",
    q: "",
    degree: "",
    status: "",
    method: "",   // 방법론 필터 (드롭다운 또는 태그 클릭)
    topic: "",    // 주제 필터
    sort: "year_desc",
  };

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );

  // 라벨 헬퍼
  const degLabel = (d) =>
    ({ BS: "학사", MS: "석사", PhD: "박사", advisor: "지도교수님" }[d] || d || "");
  const statusLabel = (s) =>
    ({ enrolled: "재학", completed: "수료", graduated: "졸업" }[s] || s || "");
  // 학위 배지 스타일: 박사·지도교수는 강조(검정 채움), 나머지는 외곽선
  const degClass = (d) => (d === "advisor" ? "professor" : d === "PhD" ? "phd" : "ms");
  const typeLabel = (t) =>
    ({ journal: "학술지", conference: "학회", thesis: "학위논문" }[t] || t || "");

  // 저자 → 참여 논문
  const papersOfAuthor = (id) => papers.filter((p) => (p.authorIds || []).includes(id));

  /* authorIds의 한 항목을 해석한다.
   * - authors에 등록된 id면 → 등록 연구자 (이름 표시 + 클릭 가능)
   * - 등록되지 않은 값이면  → 그 값을 저자명 그대로 표시 (클릭 불가)
   * 연구실 구성원이 아닌 공저자는 authorIds에 이름을 그대로 적으면 되고,
   * 나중에 authors에 등록하면서 id로 바꾸면 자동으로 링크·네트워크에 편입된다. */
  const resolveAuthor = (entry) => {
    const a = authorById[entry];
    return a
      ? { registered: true, id: a.id, name: a.name, a }
      : { registered: false, id: null, name: entry, a: null };
  };

  // 논문의 저자명 전체 (등록 여부 무관, 검색용)
  const authorNamesOf = (p) =>
    (p.authorIds || [])
      .map((e) => {
        const r = resolveAuthor(e);
        return r.registered ? `${r.a.name} ${r.a.nameEn || ""} ${(r.a.interests || []).join(" ")}` : r.name;
      })
      .join(" ");

  // ------------------------------------------------------------------ 헤더/메타 채우기
  function applyMeta() {
    const m = DATA.meta || {};
    if (m.siteTitle) {
      document.title = m.siteTitle;
      $("#siteTitle").innerHTML = esc(m.siteTitle) + '<span class="badge">LAB</span>';
    }
    if (m.subtitle) $("#siteSub").textContent = m.subtitle;
  }

  // ------------------------------------------------------------------ 필터 옵션 채우기
  function uniqueTags(key) {
    const set = new Set();
    papers.forEach((p) => (p[key] || []).forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b, "ko"));
  }
  function fillSelect(sel, values) {
    values.forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  }

  // ------------------------------------------------------------------ 검색 매칭
  // 논문이 현재 필터/검색을 통과하는가?
  function paperMatches(p) {
    // 방법론/주제 태그 필터
    if (state.method && !(p.methods || []).includes(state.method)) return false;
    if (state.topic && !(p.topics || []).includes(state.topic)) return false;

    // 학위/구분 필터: 논문의 랩 저자 중 조건을 만족하는 사람이 있어야 통과
    if (state.degree || state.status) {
      const ok = (p.authorIds || []).some((id) => {
        const a = authorById[id];
        if (!a) return false;
        if (state.degree && a.degree !== state.degree) return false;
        if (state.status && a.status !== state.status) return false;
        return true;
      });
      if (!ok) return false;
    }

    // 자유 검색어
    if (state.q) {
      const q = state.q.toLowerCase();
      const hay = [
        p.title,
        p.venue,
        p.publisher,
        p.titleEn,
        p.abstract,
        (p.methods || []).join(" "),
        (p.topics || []).join(" "),
        (p.extAuthors || []).join(" "),
        authorNamesOf(p),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function filteredPapers() {
    let list = papers.filter(paperMatches);
    if (state.sort === "year_desc") list.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, "ko"));
    else if (state.sort === "year_asc") list.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title, "ko"));
    else if (state.sort === "title") list.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    return list;
  }

  // 연구자가 현재 필터/검색을 통과하는가?
  function authorMatches(a) {
    if (state.degree && a.degree !== state.degree) return false;
    if (state.status && a.status !== state.status) return false;

    const myPapers = papersOfAuthor(a.id);
    // 방법론/주제 필터가 있으면, 그 태그를 가진 논문이 하나라도 있어야 통과
    if (state.method && !myPapers.some((p) => (p.methods || []).includes(state.method))) return false;
    if (state.topic && !myPapers.some((p) => (p.topics || []).includes(state.topic))) return false;

    if (state.q) {
      const q = state.q.toLowerCase();
      const hay = [
        a.name,
        a.nameEn,
        a.current,
        (a.interests || []).join(" "),
        myPapers.map((p) => `${p.title} ${(p.methods || []).join(" ")} ${(p.topics || []).join(" ")}`).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function filteredAuthors() {
    // 정렬 우선순위: 지도교수 → 박사 → 석사 → 학사 → 기타, 그 다음 연도 최신순
    const rank = (d) => ({ advisor: 0, PhD: 1, MS: 2, BS: 3 }[d] ?? 4);
    return authors.filter(authorMatches).sort((a, b) => {
      if (rank(a.degree) !== rank(b.degree)) return rank(a.degree) - rank(b.degree);
      return (b.year || 0) - (a.year || 0);
    });
  }

  // ------------------------------------------------------------------ 렌더: 논문
  function authorLine(p) {
    const parts = (p.authorIds || []).map((entry) => {
      const r = resolveAuthor(entry);
      if (!r.registered) return `<span class="unreg" title="연구자 정보 미등록">${esc(r.name)}</span>`;
      return `<span class="me" data-author="${esc(r.id)}">${esc(r.name)}</span>`;
    });
    (p.extAuthors || []).forEach((n) => parts.push(`<span>${esc(n)}</span>`));
    return parts.join(", ");
  }

  function tagsHtml(p) {
    const m = (p.methods || []).map(
      (t) => `<span class="tag method" data-method="${esc(t)}">${esc(t)}</span>`
    );
    const tp = (p.topics || []).map(
      (t) => `<span class="tag topic" data-topic="${esc(t)}">${esc(t)}</span>`
    );
    return m.join("") + tp.join("");
  }

  function renderPapers() {
    const list = filteredPapers();
    const box = $("#paperlist");
    box.innerHTML = "";
    if (!list.length) {
      box.appendChild(emptyState("조건에 맞는 논문이 없습니다."));
      return;
    }
    list.forEach((p) => {
      const node = el("article", "paper");
      const titleHtml = p.doi
        ? `<a class="link" href="${esc(p.doi)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
        : esc(p.title);
      node.innerHTML = `
        <div class="yearcol">${esc(p.year)}<span class="type">${esc(typeLabel(p.type))}</span></div>
        <div>
          <h3>${titleHtml}</h3>
          ${p.titleEn ? `<div class="title-en">${esc(p.titleEn)}</div>` : ""}
          <div class="authors">${authorLine(p)}</div>
          <div class="venue">${[p.venue, p.publisher].filter(Boolean).map(esc).join(" · ")}</div>
          ${p.abstract ? `<div class="abstract">${esc(p.abstract)}</div>` : ""}
          <div class="tags">${tagsHtml(p)}</div>
        </div>`;
      box.appendChild(node);
    });
  }

  // ------------------------------------------------------------------ 렌더: 연구자
  function initials(a) {
    // 한글 이름이면 성 제외 이름 첫 글자, 영문이면 이니셜
    if (a.name && /[가-힣]/.test(a.name)) return a.name.slice(-2);
    if (a.nameEn) return a.nameEn.split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();
    return (a.name || "?").slice(0, 2);
  }

  function renderPeople() {
    const list = filteredAuthors();
    const box = $("#peoplegrid");
    box.innerHTML = "";
    if (!list.length) {
      box.appendChild(emptyState("조건에 맞는 연구자가 없습니다."));
      return;
    }
    list.forEach((a) => {
      const node = el("div", "person");
      node.dataset.author = a.id;
      node.innerHTML = `
        <div class="top">
          <div class="avatar">${esc(initials(a))}</div>
          <div>
            <div class="name">${esc(a.name)} ${a.nameEn ? `<span class="en">${esc(a.nameEn)}</span>` : ""}</div>
            <div class="meta">
              <span class="deg ${degClass(a.degree)}">${degLabel(a.degree)}</span>
              <span class="status-dot">${statusLabel(a.status)}</span>
            </div>
          </div>
        </div>
        <div class="pcount">클릭하여 논문 보기</div>`;
      box.appendChild(node);
    });
  }

  function emptyState(msg) {
    const n = el("div", "empty");
    n.innerHTML = `<div class="big">${esc(msg)}</div><div>검색어나 필터를 조정해 보세요.</div>`;
    return n;
  }

  // 상세 패널 안 각 논문의 저자(공저자 포함) 표기.
  // 현재 보고 있는 저자는 굵게, 다른 랩 구성원은 클릭 시 해당 팝업으로 이동.
  function panelAuthorLine(p, currentId) {
    const parts = (p.authorIds || []).map((entry) => {
      const r = resolveAuthor(entry);
      if (entry === currentId) return `<b>${esc(r.name)}</b>`;
      return r.registered
        ? `<span class="me" data-author="${esc(r.id)}">${esc(r.name)}</span>`
        : `<span class="unreg" title="연구자 정보 미등록">${esc(r.name)}</span>`;
    });
    (p.extAuthors || []).forEach((n) => parts.push(esc(n)));
    return parts.join(", ");
  }

  // ------------------------------------------------------------------ 상세 패널
  function openAuthorPanel(id) {
    const a = authorById[id];
    if (!a) return;
    const my = papersOfAuthor(id).sort((x, y) => y.year - x.year);
    const panel = $("#panel");
    panel.innerHTML = `
      <button class="close" aria-label="닫기">×</button>
      <h2>${esc(a.name)} <span style="font-family:var(--sans);font-size:14px;color:var(--ink-3)">${esc(a.nameEn || "")}</span></h2>
      <div class="p-sub">
        <span class="deg ${degClass(a.degree)}">${degLabel(a.degree)}</span>
        ${statusLabel(a.status)}
      </div>
      <h4>참여 논문 (${my.length})</h4>
      ${
        my.length
          ? my
              .map(
                (p) => `
        <div class="p-paper">
          <div class="t">${
            p.doi
              ? `<a class="link" href="${esc(p.doi)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
              : esc(p.title)
          }</div>
          <div class="authors">${panelAuthorLine(p, a.id)}</div>
          <div class="m">${[p.year, p.venue, p.publisher, typeLabel(p.type)].filter(Boolean).map(esc).join(" · ")}</div>
          <div class="m">${[...(p.methods || []), ...(p.topics || [])].map(esc).join(" · ")}</div>
        </div>`
              )
              .join("")
          : "<p>등록된 논문이 없습니다.</p>"
      }`;
    // 패널 내부의 close/태그 클릭
    panel.querySelector(".close").addEventListener("click", closePanel);
    openOverlay();
  }

  function openOverlay() { $("#overlay").classList.add("open"); }
  function closePanel() { $("#overlay").classList.remove("open"); }

  /* ==========================================================================
   *  홈 뷰 — 연구실 소개와 숫자 요약, 최근 논문, 구성원 바로가기
   * ======================================================================== */
  function renderHome() {
    const years = papers.map((p) => p.year).filter(Boolean);
    const recent = papers.slice().sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 5);
    const byType = papers.reduce((a, p) => ((a[p.type] = (a[p.type] || 0) + 1), a), {});
    // 등록 연구자만, 논문 많은 순
    const ranked = authors
      .map((a) => ({ a, n: papersOfAuthor(a.id).length }))
      .sort((x, y) => y.n - x.n);

    const stat = (n, label) =>
      `<div class="stat"><div class="n">${esc(n)}</div><div class="l">${esc(label)}</div></div>`;

    $("#home").innerHTML = `
      <section class="home-hero">
        <h2>${esc((DATA.meta || {}).labName || "연구실")}</h2>
        <p>${esc((DATA.meta || {}).description || (DATA.meta || {}).subtitle || "")}</p>
      </section>

      <div class="stats">
        ${stat(papers.length + "편", "논문")}
        ${stat(authors.length + "명", "등록 연구자")}
        ${stat((byType.journal || 0) + "편", "학술지")}
        ${stat((byType.conference || 0) + "건", "학회 발표")}
        ${years.length ? stat(Math.min(...years) + "–" + Math.max(...years), "수록 기간") : ""}
      </div>

      <section class="home-sec">
        <div class="home-head">
          <h3>최근 논문</h3>
          <button class="linkbtn" data-go="papers">전체 보기 →</button>
        </div>
        <ul class="home-list">
          ${recent.map((p) => `
            <li>
              <span class="y">${esc(p.year)}</span>
              <span class="t">${
                p.doi
                  ? `<a class="link" href="${esc(p.doi)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
                  : esc(p.title)
              }</span>
              <span class="a">${authorLine(p)}</span>
            </li>`).join("")}
        </ul>
      </section>

      <section class="home-sec">
        <div class="home-head">
          <h3>구성원</h3>
          <button class="linkbtn" data-go="people">연구자 보기 →</button>
        </div>
        <div class="home-people">
          ${ranked.map(({ a, n }) => `
            <button class="mini" data-author="${esc(a.id)}">
              ${esc(a.name)}<span class="c">${esc(n)}</span>
            </button>`).join("")}
        </div>
      </section>

      <section class="home-sec">
        <div class="home-head">
          <h3>공저 네트워크</h3>
          <button class="linkbtn" data-go="network">네트워크 보기 →</button>
        </div>
        <p class="home-note">
          누가 누구와 함께 연구했는지 한눈에 봅니다. 원의 크기는 논문 수,
          선의 굵기는 함께 쓴 논문 수입니다.
        </p>
      </section>`;

    $("#home").querySelectorAll("[data-go]").forEach((b) =>
      b.addEventListener("click", () => setView(b.dataset.go))
    );
    $("#home").querySelectorAll("[data-author]").forEach((b) =>
      b.addEventListener("click", () => openAuthorPanel(b.dataset.author))
    );
  }

  /* ------------------------- 네트워크 조작 패널 ------------------------- */
  // 데이터에 맞춰 슬라이더 범위를 정합니다.
  function syncNetCtlRange() {
    const maxDeg = Math.max(1, ...NET.nodes.map((n) => n.deg));
    const maxW = Math.max(1, ...NET.links.map((l) => l.w));
    const d = $("#ncMinDeg"), w = $("#ncMinW");
    if (d) d.max = Math.min(maxDeg, 20);
    if (w) w.max = Math.min(maxW, 20);
  }

  function paintNetCtlValues() {
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set("#ncSizeV", NETOPT.size.toFixed(1) + "×");
    set("#ncMinDegV", NETOPT.minDeg + "편");
    set("#ncMinWV", NETOPT.minW + "회");
    set("#ncDistV", NETOPT.dist);
    set("#ncRepV", NETOPT.rep);
  }

  function writeNetCtl() {
    const v = (id, val) => { const e = $(id); if (e) e.value = val; };
    v("#ncSize", NETOPT.size); v("#ncMinDeg", NETOPT.minDeg); v("#ncMinW", NETOPT.minW);
    v("#ncDist", NETOPT.dist); v("#ncRep", NETOPT.rep);
    const i = $("#ncIsolate"), l = $("#ncLabels");
    if (i) i.checked = NETOPT.isolate;
    if (l) l.checked = NETOPT.labels;
    paintNetCtlValues();
  }

  function bindNetCtl() {
    if (!$("#netctl")) return;
    const onNum = (id, key, parse) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        NETOPT[key] = parse(el.value);
        paintNetCtlValues();
        if (NET.restart) NET.restart();
      });
    };
    onNum("#ncSize", "size", parseFloat);
    onNum("#ncMinDeg", "minDeg", (x) => parseInt(x, 10));
    onNum("#ncMinW", "minW", (x) => parseInt(x, 10));
    onNum("#ncDist", "dist", (x) => parseInt(x, 10));
    onNum("#ncRep", "rep", (x) => parseInt(x, 10));

    const onBool = (id, key) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("change", () => {
        NETOPT[key] = el.checked;
        if (NET.restart) NET.restart();
      });
    };
    onBool("#ncIsolate", "isolate");
    onBool("#ncLabels", "labels");

    $("#ncReset").addEventListener("click", () => {
      Object.assign(NETOPT, NETDEFAULT);
      writeNetCtl();
      if (NET.restart) NET.restart();
    });
    $("#ncRelayout").addEventListener("click", () => {
      // 위치만 다시 흩뜨립니다. 설정은 그대로 둡니다.
      const cx = 480, cy = 300, R = 200;
      const shown = NET.nodes.filter((n) => !n.hidden);
      shown.forEach((n, i) => {
        const ang = (i / Math.max(1, shown.length)) * Math.PI * 2;
        n.x = cx + Math.cos(ang) * R + (Math.random() - 0.5) * 40;
        n.y = cy + Math.sin(ang) * R + (Math.random() - 0.5) * 40;
        n.vx = n.vy = 0;
      });
      if (NET.restart) NET.restart();
    });
    writeNetCtl();
  }

  // ------------------------------------------------------------------ 뷰 전환
  function setView(v) {
    state.view = v;
    document.querySelectorAll("nav.tabs button").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === v)
    );
    document.querySelectorAll(".view").forEach((s) => s.classList.remove("active"));
    $("#view-" + v).classList.add("active");

    // 홈은 검색·필터 대상이 아니므로 툴바 전체를 감춥니다
    $("#toolbar").style.display = v === "home" ? "none" : "";
    // 정렬 옵션은 논문 뷰에서만 의미 있음
    $("#sortBox").style.display = v === "papers" ? "" : "none";
    // 툴바는 네트워크 뷰에서도 유지(강조 필터로 사용)
    render();
    if (v === "network") drawNetwork();
  }

  // ------------------------------------------------------------------ 활성 필터 칩
  function renderActiveChips() {
    const box = $("#activechips");
    box.innerHTML = "";
    const chips = [];
    if (state.method) chips.push(["method", "방법론: " + state.method]);
    if (state.topic) chips.push(["topic", "주제: " + state.topic]);
    chips.forEach(([kind, label]) => {
      const c = el("span", "chip-active", `${esc(label)} <span class="x">×</span>`);
      c.addEventListener("click", () => {
        state[kind] = "";
        if (kind === "method") $("#fMethod").value = "";
        if (kind === "topic") $("#fTopic").value = "";
        render();
      });
      box.appendChild(c);
    });
  }

  // ------------------------------------------------------------------ 카운트
  function renderCount() {
    if (state.view === "home") { $("#count").textContent = ""; return; }
    if (state.view === "people") {
      $("#count").textContent = `연구자 ${filteredAuthors().length} / ${authors.length}명`;
    } else {
      $("#count").textContent = `논문 ${filteredPapers().length} / ${papers.length}편`;
    }
  }

  // ------------------------------------------------------------------ 전체 렌더
  function render() {
    renderActiveChips();
    renderCount();
    if (state.view === "home") renderHome();
    else if (state.view === "papers") renderPapers();
    else if (state.view === "people") renderPeople();
    else if (state.view === "network") drawNetwork();
  }

  /* ==========================================================================
   *  네트워크 그래프 (공저 네트워크) — 간단 force 시뮬레이션 (SVG)
   * ======================================================================== */
  const NET = { nodes: [], links: [], sim: null, svg: null, dragging: null, raf: null };

  // 네트워크 보기 설정 (조작 패널)
  const NETOPT = {
    size: 1,        // 노드 크기 배율
    minDeg: 0,      // 이 편수 미만 연구자는 숨김
    minW: 1,        // 이 횟수 미만 공저선은 숨김
    dist: 90,       // 링크가 당기는 목표 거리
    rep: 5200,      // 노드끼리 밀어내는 힘
    isolate: false, // 연결 없는 노드 숨김
    labels: true,   // 이름 표시
  };
  const NETDEFAULT = Object.assign({}, NETOPT);

  // 설정에 따라 보일 노드·링크를 정합니다. (배열에서 지우지 않고 표시만 바꿔
  //  인덱스 참조와 드래그 상태가 깨지지 않게 합니다.)
  function applyNetFilter() {
    NET.nodes.forEach((n) => { n.hidden = n.deg < NETOPT.minDeg; });
    NET.links.forEach((l) => {
      l.hidden = l.w < NETOPT.minW ||
        NET.nodes[l.source].hidden || NET.nodes[l.target].hidden;
    });
    if (NETOPT.isolate) {
      const linked = new Set();
      NET.links.forEach((l) => {
        if (l.hidden) return;
        linked.add(l.source); linked.add(l.target);
      });
      NET.nodes.forEach((n, i) => { if (!linked.has(i)) n.hidden = true; });
      NET.links.forEach((l) => {
        l.hidden = l.hidden || NET.nodes[l.source].hidden || NET.nodes[l.target].hidden;
      });
    }
    const vn = NET.nodes.filter((n) => !n.hidden).length;
    const vl = NET.links.filter((l) => !l.hidden).length;
    const box = $("#ncCount");
    if (box) {
      box.textContent = `연구자 ${vn} / ${NET.nodes.length}명 · 공저 관계 ${vl} / ${NET.links.length}개` +
        (vn < NET.nodes.length ? "  (설정으로 일부가 숨겨져 있습니다)" : "");
    }
  }

  function buildGraph() {
    // 노드: 연구자
    NET.nodes = authors.map((a) => ({
      id: a.id,
      a,
      deg: papersOfAuthor(a.id).length,
      x: 0, y: 0, vx: 0, vy: 0,
    }));
    const idx = Object.fromEntries(NET.nodes.map((n, i) => [n.id, i]));

    // 링크: 같은 논문에 함께 등장한 저자쌍 (가중치 = 공저 논문 수)
    const pairKey = (x, y) => (x < y ? x + "|" + y : y + "|" + x);
    const weight = {};
    papers.forEach((p) => {
      const ids = (p.authorIds || []).filter((id) => idx[id] != null);
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const k = pairKey(ids[i], ids[j]);
          weight[k] = (weight[k] || 0) + 1;
        }
    });
    NET.links = Object.entries(weight).map(([k, w]) => {
      const [s, t] = k.split("|");
      return { source: idx[s], target: idx[t], w };
    });

    // 초기 배치: 원형
    const cx = 480, cy = 300, R = 200;
    NET.nodes.forEach((n, i) => {
      const ang = (i / NET.nodes.length) * Math.PI * 2;
      n.x = cx + Math.cos(ang) * R + (Math.random() - 0.5) * 30;
      n.y = cy + Math.sin(ang) * R + (Math.random() - 0.5) * 30;
    });
  }

  function tick() {
    const W = 960, H = 600, cx = W / 2, cy = H / 2;
    const nodes = NET.nodes, links = NET.links;

    // 반발력 (모든 쌍)
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].hidden) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].hidden) continue;
        const a = nodes[i], b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy || 0.01;
        let d = Math.sqrt(d2);
        const rep = NETOPT.rep / d2;
        const fx = (dx / d) * rep, fy = (dy / d) * rep;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }
    // 링크 인력 (스프링)
    links.forEach((l) => {
      if (l.hidden) return;
      const a = nodes[l.source], b = nodes[l.target];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const target = NETOPT.dist;
      const k = (d - target) * 0.02 * Math.min(l.w, 3);
      const fx = (dx / d) * k, fy = (dy / d) * k;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    });
    // 중심으로 당기기 + 감쇠 + 적용
    nodes.forEach((n) => {
      if (n.hidden) return;
      n.vx += (cx - n.x) * 0.005;
      n.vy += (cy - n.y) * 0.005;
      n.vx *= 0.82; n.vy *= 0.82;
      if (n !== NET.dragging) { n.x += n.vx; n.y += n.vy; }
      n.x = Math.max(30, Math.min(W - 30, n.x));
      n.y = Math.max(30, Math.min(H - 30, n.y));
    });
  }

  // 강조 대상: 현재 검색/필터를 통과하는 연구자
  function highlightedSet() {
    if (!state.q && !state.method && !state.topic && !state.degree && !state.status) return null;
    return new Set(filteredAuthors().map((a) => a.id));
  }

  function drawNetwork() {
    const svg = $("#net");
    if (!svg) return;
    if (!NET.nodes.length) { buildGraph(); syncNetCtlRange(); }
    applyNetFilter();
    svg.setAttribute("viewBox", "0 0 960 600");
    const hi = highlightedSet();

    function paint() {
      const nodes = NET.nodes, links = NET.links;
      let s = "";
      // 링크
      links.forEach((l) => {
        if (l.hidden) return;
        const a = nodes[l.source], b = nodes[l.target];
        const dim = hi && !(hi.has(a.id) && hi.has(b.id));
        s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
          stroke="${dim ? "#e2e2e2" : "#999"}" stroke-width="${Math.min(l.w, 4) * 1.1}"
          stroke-opacity="${dim ? 0.5 : 0.9}" />`;
      });
      // 노드
      nodes.forEach((n) => {
        if (n.hidden) return;
        // 논문 수가 많은 노드가 화면을 삼키지 않도록 면적 비례(제곱근) 스케일
        const r = (12 + 6 * Math.sqrt(n.deg)) * NETOPT.size;
        // 지도교수·박사 = 검정, 석사·학사 = 흰색 (연구자 카드의 degClass와 동일 기준)
        const isDark = degClass(n.a.degree) !== "ms";
        const dim = hi && !hi.has(n.id);
        const fill = isDark ? (dim ? "#bdbdbd" : "#111") : (dim ? "#f2f2f2" : "#fff");
        const stroke = dim ? "#cfcfcf" : "#111";
        const txtColor = isDark ? (dim ? "#eee" : "#fff") : (dim ? "#bbb" : "#111");
        s += `<g class="netnode" data-author="${n.id}" style="cursor:pointer">
          <circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2" />
          ${NETOPT.labels ? `<text x="${n.x}" y="${n.y + r + 14}" text-anchor="middle"
            font-family="var(--sans)" font-size="12"
            fill="${dim ? "#c2c2c2" : "#111"}">${esc(n.a.name)}</text>` : ""}
          <text x="${n.x}" y="${n.y + 4}" text-anchor="middle"
            font-family="var(--serif)" font-size="${Math.max(9, r * 0.7)}"
            fill="${txtColor}" style="pointer-events:none">${esc(n.deg)}</text>
        </g>`;
      });
      svg.innerHTML = s;
    }

    // 애니메이션 루프 (안정화되면 자동 정지, 상호작용 시 재가동)
    let energyFrames = 0;
    function loop() {
      tick();
      paint();
      energyFrames++;
      if (energyFrames < 240 || NET.dragging) {
        NET.raf = requestAnimationFrame(loop);
      } else {
        NET.raf = null;
      }
    }
    if (NET.raf) cancelAnimationFrame(NET.raf);
    energyFrames = 0;
    loop();
    // 설정이 바뀌면 다시 안정화시킵니다.
    NET.restart = function () {
      applyNetFilter();
      energyFrames = 0;
      if (!NET.raf) loop();
    };

    // 드래그 상호작용 (SVG 좌표 변환)
    function svgPoint(evt) {
      const rect = svg.getBoundingClientRect();
      const px = (evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left;
      const py = (evt.touches ? evt.touches[0].clientY : evt.clientY) - rect.top;
      return { x: (px / rect.width) * 960, y: (py / rect.height) * 600 };
    }
    let moved = false;
    function down(evt) {
      const g = evt.target.closest(".netnode");
      if (!g) return;
      const id = g.dataset.author;
      NET.dragging = NET.nodes.find((n) => n.id === id);
      moved = false;
      if (!NET.raf) { energyFrames = 0; loop(); }
    }
    function move(evt) {
      if (!NET.dragging) return;
      const pt = svgPoint(evt);
      NET.dragging.x = pt.x; NET.dragging.y = pt.y;
      NET.dragging.vx = 0; NET.dragging.vy = 0;
      moved = true;
      evt.preventDefault();
    }
    function up(evt) {
      if (NET.dragging && !moved) {
        openAuthorPanel(NET.dragging.id); // 클릭(드래그 아님) = 상세
      }
      NET.dragging = null;
    }
    // 리스너 중복 방지
    if (!svg._bound) {
      svg.addEventListener("mousedown", down);
      svg.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      svg.addEventListener("touchstart", down, { passive: false });
      svg.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("touchend", up);
      svg._bound = true;
    }
  }

  /* ==========================================================================
   *  이벤트 바인딩
   * ======================================================================== */
  function bind() {
    // 탭
    document.querySelectorAll("nav.tabs button").forEach((b) =>
      b.addEventListener("click", () => setView(b.dataset.view))
    );

    // 좌측 상단 제목 → 홈 (흔한 웹사이트 관례)
    $("#siteTitle").addEventListener("click", () => {
      setView("home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // 검색
    let t;
    $("#q").addEventListener("input", (e) => {
      clearTimeout(t);
      state.q = e.target.value.trim();
      t = setTimeout(render, 120);
    });

    // 필터 드롭다운
    $("#fDegree").addEventListener("change", (e) => { state.degree = e.target.value; render(); });
    $("#fStatus").addEventListener("change", (e) => { state.status = e.target.value; render(); });
    $("#fMethod").addEventListener("change", (e) => { state.method = e.target.value; render(); });
    $("#fTopic").addEventListener("change", (e) => { state.topic = e.target.value; render(); });
    $("#fSort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

    // 초기화
    $("#clearBtn").addEventListener("click", () => {
      Object.assign(state, { q: "", degree: "", status: "", method: "", topic: "", sort: "year_desc" });
      $("#q").value = "";
      ["fDegree", "fStatus", "fMethod", "fTopic"].forEach((id) => ($("#" + id).value = ""));
      $("#fSort").value = "year_desc";
      render();
    });

    // 태그/저자 클릭 (이벤트 위임)
    document.body.addEventListener("click", (e) => {
      const mTag = e.target.closest("[data-method]");
      const tTag = e.target.closest("[data-topic]");
      const auth = e.target.closest("[data-author]");
      if (mTag && mTag.dataset.method) {
        state.method = mTag.dataset.method;
        $("#fMethod").value = state.method;
        render();
        return;
      }
      if (tTag && tTag.dataset.topic) {
        state.topic = tTag.dataset.topic;
        $("#fTopic").value = state.topic;
        render();
        return;
      }
      if (auth && auth.dataset.author) {
        openAuthorPanel(auth.dataset.author);
      }
    });

    // 오버레이 닫기
    $("#overlay").addEventListener("click", (e) => {
      if (e.target.id === "overlay") closePanel();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePanel();
    });

    // 창 크기 변경 시 네트워크 다시 그림
    window.addEventListener("resize", () => {
      if (state.view === "network") drawNetwork();
    });
  }

  // ------------------------------------------------------------------ 초기화
  function init() {
    applyMeta();
    fillSelect($("#fMethod"), uniqueTags("methods"));
    fillSelect($("#fTopic"), uniqueTags("topics"));
    bind();
    bindNetCtl();
    setView(state.view);   // 툴바·탭 상태까지 함께 맞춥니다
    window.scrollTo(0, 0);
  }

  document.addEventListener("DOMContentLoaded", init);
  // 브라우저가 load 이후 위치를 되돌리는 경우까지 막습니다
  window.addEventListener("load", () => window.scrollTo(0, 0));
})();
