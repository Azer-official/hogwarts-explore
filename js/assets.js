/*
 * assets.js — 모든 그래픽 정의를 한곳에 모음 (자리표시 색상 + 나중에 쓸 아트 파일 경로).
 * USE_ART=true(기본): art/ 의 PNG 6개를 로드. 파일이 없거나 로드 실패한 항목만 자리표시 도형으로 대체.
 * ?art=0 → 이미지 파일을 전혀 요청하지 않음 (자리표시만). ?art=1 → 강제 켜기.
 * 자세한 규격: docs/ART_SPEC.md
 */
window.HW = window.HW || {};
HW.ASSETS = {
  TILE: 16,          // 원본 타일 크기(px)
  SCALE: 3,          // 화면 배율 (카메라 zoom)
  USE_ART: true,      // 기본 켜짐. ?art=0 이면 자리표시 도형만 (이미지 요청 0건)
  // 타일: 문자 → 정의. index = tileset.png 안의 열 번호(가로 한 줄, 16x16)
  TILES: {
    '#': { index: 0,  name: 'wall',        color: 0x3a3550, solid: true,  opaque: true },
    '.': { index: 1,  name: 'corridor',    color: 0x5b5866, solid: false, opaque: false },
    'g': { index: 2,  name: 'floor_gryffindor', color: 0x6e2a2a, solid: false, opaque: false },
    'l': { index: 3,  name: 'floor_library',    color: 0x5a4632, solid: false, opaque: false },
    't': { index: 4,  name: 'floor_trophy',     color: 0x4c5a3a, solid: false, opaque: false },
    'c': { index: 5,  name: 'floor_classroom',  color: 0x4a4f63, solid: false, opaque: false },
    'r': { index: 6,  name: 'floor_requirement',color: 0x6a4c86, solid: false, opaque: false },
    'D': { index: 7,  name: 'door_open',   color: 0x8a5a2b, solid: false, opaque: false },
    'B': { index: 8,  name: 'bookshelf',   color: 0x3b2614, solid: true,  opaque: true },
    'C': { index: 9,  name: 'trophy_case', color: 0xb8a24a, solid: true,  opaque: true },
    'T': { index: 10, name: 'desk',        color: 0x7a5530, solid: true,  opaque: false },
    'P': { index: 11, name: 'passage_hidden', color: 0x403a58, solid: true, opaque: true },   // 벽과 거의 같은 색 + 반짝임(힌트)
    'R': { index: 12, name: 'requirement_door_closed', color: 0x2a1f3a, solid: true, opaque: true }
  },
  EXTRA_TILES: {
    passage_found: { index: 13, color: 0x9a7bd0 },          // 발견한 통로 벽
    requirement_door_open: { index: 14, color: 0xd9b3ff }  // 열린 필요의 방 문 (통과 가능)
  },
  // 캐릭터 자리표시 색 (16x32 프레임 안에 그림)
  CHARS: {
    harry:  { robe: 0x1c1c24, accent: 0xb3262b, skin: 0xf0c8a0, hair: 0x1a1210 },
    filch:  { robe: 0x5a4028, accent: 0x8c7a5a, skin: 0xd8b48c, hair: 0x9a9a9a },
    norris: { robe: 0x7a7470, accent: 0xd94040, skin: 0x7a7470, hair: 0x5a5450, cat: true }
  },
  KEY_COLOR: 0xffd84a,
  VISION: { filch: 0xffe28a, norris: 0xff8a8a, alpha: 0.16 },
  // ---- 아트 파일 (art/README.md 규격). USE_ART 일 때만 로드, 경로는 index.html 기준 상대경로 ----
  // w,h = 기대 이미지 크기 (헤드리스 검사에서 실제 크기와 비교), frame = 시트 한 칸 크기
  FILES: {
    tileset: { path: 'art/tiles/tileset.png', w: 128, h: 32, frame: [16, 16] },
    harry:   { path: 'art/characters/harry_walk.png', w: 64, h: 128, frame: [16, 32] },
    filch:   { path: 'art/characters/filch_walk.png', w: 64, h: 128, frame: [16, 32] },
    norris:  { path: 'art/characters/mrs_norris_walk.png', w: 64, h: 64, frame: [16, 16] },
    key:     { path: 'art/items/key.png', w: 16, h: 16 },
    rdoor:   { path: 'art/items/room_of_requirement_door.png', w: 32, h: 32 }
  },
  // tileset.png 인덱스 (8열 그리드, 0–14)
  TILESET: { floor: 0, floor_b: 1, wall_top: 2, wall_face: 3, door_closed: 4, door_open: 5, stairs: 6,
             torch_0: 7, torch_1: 8, painting: 9, tapestry: 10, passage_marker: 11,
             bookshelf: 12, trophy_case: 13, desk: 14 },
  // 가구 문자 → tileset 이름 (모두 막힘). 바닥 타일 위에 겹쳐 그림 (desk 는 위쪽이 투명)
  FURNITURE: { 'B': 'bookshelf', 'C': 'trophy_case', 'T': 'desk' },
  // 맵 문자 → 아트 타일. 'wall' = 아래가 걸을 수 있는 타일이면 wall_face, 아니면 wall_top (자동)
  //   'floor' = floor + floor_b 를 약 10% 섞음. B/C/T 는 바닥 위에 FURNITURE 타일(12–14)을 겹침.
  ART_TILE: { '#': 'wall', '.': 'floor', 'g': 'floor', 'l': 'floor', 't': 'floor', 'c': 'floor', 'r': 'floor',
              'D': 'door_open', 'B': 'floor', 'C': 'floor', 'T': 'floor', 'R': 'wall_face' },
  // 방마다 바닥 색조 (아트 바닥 위에 반투명 사각형으로 덮음, 복도는 없음)
  ROOM_TINT: { common: 0xc0302a, requirement: 0x9050e0, library: 0xc08030, trophy: 0x60a040, gallery: 0x5060a0, class: 0x3050c0 },
  ROOM_TINT_ALPHA: 0.14,
  TORCH_FPS: 4,
  // 자리표시용 캐릭터 프레임 (아트 없을 때)
  SHEET: { frameWidth: 16, frameHeight: 32, cols: 4, rows: 4, rowOrder: ['down', 'left', 'right', 'up'], standCol: 0 }
};
(function () {
  var q = new URLSearchParams(location.search);
  if (q.get('art') === '1') HW.ASSETS.USE_ART = true;
  if (q.get('art') === '0') HW.ASSETS.USE_ART = false;
})();
