/* =============================================================================
 *  People Lab ResearchNet — 데이터 파일
 * -----------------------------------------------------------------------------
 *  이 파일 하나만 수정하면 사이트 내용이 모두 바뀝니다. (코드 수정 불필요)
 *
 *  [저자 추가/수정 방법]  authors 배열에 항목 추가
 *  ※ 화면에 표시되는 항목은 아래 4가지뿐입니다: name, nameEn, degree, status
 *    - id       : 고유 식별자 (영문/숫자, 공백 없이). 논문의 authorIds에서 이 값을 참조합니다.
                 ※ 명명 규칙: <성>_<이름 이니셜>  (예: 김동환 → kim_dh, 방병철 → bang_bc)
                    동명이인이 생기면 뒤에 숫자를 붙입니다. (kim_dh2)
 *    - name     : 국문 이름
 *    - nameEn   : 영문 이름 (선택)
 *    - degree   : "BS" | "MS" | "PhD" | "advisor"      (학사 / 석사 / 박사 / 지도교수)
 *    - status   : "enrolled" | "completed" | "graduated"   (재학 / 수료 / 졸업)
 *                 ※ degree가 "advisor"(지도교수)이면 status는 생략합니다.
 *
 *  [논문 추가/수정 방법]  papers 배열에 항목 추가
 *    - id        : 고유 식별자
 *    - title     : 논문 제목
 *    - authorIds : 저자 배열 (저자 순서대로)
                  · authors에 등록된 사람 → 그 사람의 id  (이름이 링크로 표시, 네트워크에 노드 생성)
                  · 등록되지 않은 사람    → 이름을 그대로 문자열로  (예: "유승완")
                    이름만 표시되고 클릭은 되지 않으며, 네트워크에는 나타나지 않습니다.
                    나중에 authors에 추가한 뒤 id로 바꾸면 자동으로 연결됩니다.
 *    - extAuthors: 랩 외부 공저자 이름 배열 (선택)
 *    - titleEn   : 영문 제목 (선택)
 *    - venue     : 게재지/학회명 (권/호/페이지까지 함께 적어도 됩니다)
 *    - publisher : 발행기관 (선택)
 *    - year      : 출판 연도 (숫자)
 *    - type      : "journal" | "conference" | "thesis"  (학술지 / 학회 / 학위논문)
 *    - methods   : 방법론 태그 배열  (예: "텍스트 마이닝", "설문조사", "실험")
 *    - topics    : 주제 태그 배열    (예: "리더십", "조직몰입")
 *    - doi       : DOI 또는 URL (선택). 있으면 제목이 링크가 됩니다.
 *    - abstract  : 초록/한줄요약 (선택)
 *
 *  ※ 태그(methods/topics)는 자유롭게 쓰되, 같은 개념은 같은 문자열로 통일하면
 *     검색·필터가 깔끔하게 동작합니다. (예: "텍스트 마이닝"으로 통일)
 * ========================================================================== */

window.LAB_DATA = {
  meta: {
    labName: "People Lab",
    siteTitle: "People Lab ResearchNet",
    subtitle: "우리 연구실 구성원들의 연구를 한곳에서",
    // 학과/연구실 소개 한 줄 (선택)
    description: "석사·박사 재학생과 졸업생의 연구를 모아 서로의 연구를 탐색합니다.",
  },

  /* ----------------------------- 저자(구성원) ----------------------------- */
  authors: [
    {
      id: "lee_c",
      name: "이찬",
      nameEn: "Chan Lee",
      degree: "advisor",   // 지도교수 (BS/MS/PhD 외 특별 역할)
    },
    {
      id: "kim_dh",
      name: "김동환",
      nameEn: "Donghwan Kim",
      degree: "PhD",
      status: "enrolled",
    },
    {
      id: "bang_bc",
      name: "방병철",
      nameEn: "Byungchul Bang",
      degree: "PhD",
      status: "enrolled",
    },
    {
      id: "yoon_ye",
      name: "윤영은",
      nameEn: "Yoon Youngeun",
      degree: "PhD",
      status: "enrolled",
    },
  ],

  /* ------------------------------- 논문 ------------------------------- */
  papers: [
    {
      id: "p13",
      title: "텍스트 마이닝을 활용한 테크노스트레스 연구 동향 분석",
      titleEn: "Analyzing Research Trends in Technostress Using Text Mining",
      authorIds: ["유승완", "kim_dh", "lee_c"],   // "유승완"은 연구자 미등록 → 이름만 표시
      extAuthors: [],
      venue: "휴먼웨어연구, 9(1), 33-63",
      publisher: "고려대학교 HRD정책연구소",
      year: 2026,
      type: "journal",
      methods: ["텍스트 마이닝", "네트워크 분석"],
      topics: ["테크노스트레스", "연구동향", "디지털 리터러시"],
      doi: "https://doi.org/10.23182/human.2026.9.1.33",
      abstract: "2020–2025년 테크노스트레스 관련 국내외 논문 315편(국내 48편·해외 267편)의 초록을 TF-IDF 키워드 빈도, 바이그램, Louvain 기반 공출현 네트워크로 분석해 연구 동향과 6개 지식 커뮤니티를 도출.",
    },
    {
      id: "p14",
      title: "현장경찰관 역량모델 개발 및 XR 교육훈련 체계 설계에 관한 연구",
      authorIds: ["김홍준", "장주희", "yoon_ye", "손원진", "박재풍"],
      extAuthors: [],
      venue: "환경디자인과 안전(한국셉테드학회지), 17(1), 165-196",
      year: 2026,
      type: "journal",
      methods: ["역량모델링", "직무분석"],
      topics: ["경찰 교육훈련", "XR", "역량모델"],
      doi: "https://doi.org/10.26470/JCSSED.2026.17.1.165",
      abstract: "현장경찰관의 직무 역량모델을 개발하고 이를 바탕으로 XR 기반 교육훈련 체계를 설계.",
    },
    {
      id: "p15",
      title: "XR 기반 경찰 교육훈련 시나리오 개발 사례 연구: 요구분석 프레임과 공동개발 체계를 중심으로",
      authorIds: ["김홍준", "장주희", "yoon_ye", "손원진", "박재풍"],
      extAuthors: [],
      venue: "한국공안행정학회보, 35(2), 1-24",
      year: 2026,
      type: "journal",
      methods: ["사례연구", "요구분석"],
      topics: ["경찰 교육훈련", "XR", "시나리오 개발"],
      doi: "https://ka-pc.jams.or.kr/",
      abstract: "XR 기반 경찰 교육훈련 시나리오 개발 사례를 요구분석 프레임과 공동개발 체계 관점에서 분석.",
    },
  ],
};
