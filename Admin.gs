/**
 * People Lab ResearchNet — 관리자 API (Google Apps Script)
 * -----------------------------------------------------------------------------
 * 데이터(연구자·논문)를 Google Sheets 에 두고, admin.html 이 비밀번호로 읽고 씁니다.
 * 공개 사이트(index.html)는 이 서버를 쓰지 않습니다. 커밋된 data.js 를 그대로 읽습니다.
 *
 *   공개   index.html  →  data.js (정적 파일)
 *                            ↑  관리자 페이지에서 "내보내기" 후 커밋
 *   관리자 admin.html  →  이 웹앱  →  Google Sheets   (🔒 ADMIN_KEY)
 *
 * 비밀번호는 코드에도 저장소에도 없습니다. 스크립트 속성에만 둡니다.
 *
 * ─────────────────────────── 설치 순서 ───────────────────────────
 *  1) script.google.com → 새 프로젝트 → 이 파일 내용을 붙여 넣습니다.
 *
 *  2) 프로젝트 설정(⚙) → 스크립트 속성 → 속성 추가
 *       ADMIN_KEY = (쓰실 관리자 비밀번호)
 *
 *  3) 편집기에서 setup() 을 한 번 실행합니다.
 *     → 스프레드시트가 만들어지고, 실행 로그에 주소가 찍힙니다.
 *     → 시트 ID 가 스크립트 속성 SHEET_ID 에 자동 저장됩니다.
 *
 *  4) 배포 → 새 배포 → 유형 "웹 앱"
 *       실행 계정   : 나
 *       액세스 권한 : 모든 사용자      ← 로그인 화면에서 호출해야 하므로 필요합니다
 *     (액세스를 "모든 사용자"로 두어도 ADMIN_KEY 없이는 데이터가 나가지 않습니다.)
 *
 *  5) 배포 주소(/exec)를 admin.html 의 ADMIN_ENDPOINT 에 넣습니다.
 *
 *  6) 관리자 페이지에 로그인하면 시트가 비어 있다고 나옵니다.
 *     "현재 data.js 가져오기"를 누르면 지금 사이트의 데이터가 시트로 옮겨집니다.
 *
 * 비밀번호를 바꿀 때는 스크립트 속성 ADMIN_KEY 값만 고치면 됩니다. 재배포 불필요.
 * 코드를 고친 뒤에는 "배포 관리 → 편집 → 버전: 새 버전"으로 다시 배포해야 반영됩니다.
 * ============================================================================ */

var SEP = ' | ';   // 배열 필드(authorIds·methods·topics)를 한 칸에 담을 때 쓰는 구분자

var COLS = {
  authors: ['id', 'name', 'nameEn', 'degree', 'status'],
  papers:  ['id', 'title', 'titleEn', 'authorIds', 'extAuthors', 'venue', 'publisher',
            'year', 'type', 'methods', 'topics', 'doi', 'abstract']
};
var ARRAY_FIELDS = ['authorIds', 'extAuthors', 'methods', 'topics'];

// ── 요청 처리 ────────────────────────────────────────────
function doPost(e) {
  return respond(handleAdmin((e && e.parameter) || {}));
}

// 주소를 브라우저로 직접 열었을 때. 데이터는 내보내지 않습니다.
function doGet() {
  return respond({ ok: false, error: '이 주소는 관리자 페이지에서만 사용합니다.' });
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAdmin(params) {
  var key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key) return { ok: false, error: '스크립트 속성에 ADMIN_KEY가 설정되어 있지 않습니다.' };
  if (String(params.key || '') !== key) {
    return { ok: false, auth: false, error: '비밀번호가 올바르지 않습니다.' };
  }

  try {
    if (params.action === 'ping') return { ok: true };
    if (params.action === 'load') return load();
    if (params.action === 'save') return save(params.payload);
    return { ok: false, error: '알 수 없는 요청입니다.' };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

// ── 시트 ────────────────────────────────────────────────
function book() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  if (!id) throw new Error('setup()을 먼저 실행해 주세요. (SHEET_ID 없음)');
  return SpreadsheetApp.openById(id);
}

function tab(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(COLS[name]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readTab(ss, name) {
  var sh = tab(ss, name);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0].map(String);
  return values.slice(1)
    .filter(function (r) { return String(r[0]).trim() !== ''; })
    .map(function (r) {
      var o = {};
      head.forEach(function (h, i) {
        var v = r[i];
        if (ARRAY_FIELDS.indexOf(h) >= 0) {
          o[h] = String(v || '').split(SEP).map(function (x) { return x.trim(); })
                   .filter(function (x) { return x !== ''; });
        } else if (h === 'year') {
          o[h] = v === '' || v == null ? '' : Number(v);
        } else {
          o[h] = v == null ? '' : String(v);
        }
      });
      return o;
    });
}

function writeTab(ss, name, rows) {
  var sh = tab(ss, name);
  var head = COLS[name];
  var out = [head].concat(rows.map(function (o) {
    return head.map(function (h) {
      var v = o[h];
      if (Array.isArray(v)) return v.join(SEP);
      return v == null ? '' : v;
    });
  }));
  sh.clear();
  sh.getRange(1, 1, out.length, head.length).setValues(out);
  sh.setFrozenRows(1);
  return rows.length;
}

function load() {
  var ss = book();
  var authors = readTab(ss, 'authors');
  var papers  = readTab(ss, 'papers');
  return {
    ok: true,
    empty: authors.length === 0 && papers.length === 0,
    authors: authors,
    papers: papers,
    updatedAt: PropertiesService.getScriptProperties().getProperty('UPDATED_AT') || ''
  };
}

function save(payload) {
  var data;
  try { data = JSON.parse(payload || ''); }
  catch (err) { return { ok: false, error: '데이터를 해석하지 못했습니다.' }; }
  if (!data || !Array.isArray(data.authors) || !Array.isArray(data.papers)) {
    return { ok: false, error: 'authors·papers 배열이 필요합니다.' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = book();
    var a = writeTab(ss, 'authors', data.authors);
    var p = writeTab(ss, 'papers', data.papers);
    var now = new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty('UPDATED_AT', now);
    return { ok: true, authors: a, papers: p, updatedAt: now };
  } finally {
    lock.releaseLock();
  }
}

// ── 설치용 ───────────────────────────────────────────────
/** 한 번만 실행: 스프레드시트를 만들고 SHEET_ID를 저장합니다. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
    Logger.log('이미 연결된 시트가 있습니다: ' + ss.getUrl());
  } else {
    ss = SpreadsheetApp.create('People Lab ResearchNet — 데이터');
    props.setProperty('SHEET_ID', ss.getId());
    Logger.log('시트를 만들었습니다: ' + ss.getUrl());
  }
  tab(ss, 'authors');
  tab(ss, 'papers');
  // 새 스프레드시트에 기본으로 생기는 빈 시트는 치웁니다.
  var first = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);

  Logger.log(props.getProperty('ADMIN_KEY')
    ? 'ADMIN_KEY 설정됨 (길이 ' + props.getProperty('ADMIN_KEY').length + ')'
    : '⚠ ADMIN_KEY가 없습니다. 프로젝트 설정 → 스크립트 속성에 추가해 주세요.');
}

/** 설치 상태만 확인하고 싶을 때 실행합니다. */
function checkSetup() {
  var props = PropertiesService.getScriptProperties();
  Logger.log('ADMIN_KEY: ' + (props.getProperty('ADMIN_KEY') ? '설정됨' : '없음'));
  Logger.log('SHEET_ID : ' + (props.getProperty('SHEET_ID') || '없음 — setup() 실행 필요'));
  if (props.getProperty('SHEET_ID')) {
    var d = load();
    Logger.log('연구자 ' + d.authors.length + '명 · 논문 ' + d.papers.length + '편');
    Logger.log('시트 주소: ' + book().getUrl());
  }
}
