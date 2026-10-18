/*
 * map.js — 맵 하나(32x22 타일)와 배치 데이터. 좌표는 타일 (x, y).
 */
window.HW = window.HW || {};
HW.MAP = {
  rows: [
    '################################', // 0
    '#gggggggg###rrrrrr###llllllllll#', // 1
    '#gggggggg###rrrrrr###lBBBllBBBl#', // 2
    '#ggggggggP##rrrrrr##Pllllllllll#', // 3
    '#gggggggg#####RR#####lBBBllBBBl#', // 4
    '#gggggggg#####RR#####llllllllll#', // 5
    '#gggggggg#####..#####llllllllll#', // 6
    '####D#########..#########D######', // 7
    '#..............................#', // 8
    '#..............................#', // 9
    '#..............................#', // 10
    '####D##########..#########D#####', // 11
    '#tttttttttt#........#cccccccccc#', // 12
    '#tCCtCCtCCt#........#cccccccccc#', // 13
    '#tttttttttt#........#cTTcTTcTTc#', // 14
    '#tttttttttt#..#..#..#cccccccccc#', // 15
    'PttttttttttD........DccccccccccP', // 16
    '#tttttttttt#........#cTTcTTcTTc#', // 17
    '#tCCtCCtCCt#..#..#..#cccccccccc#', // 18
    '#tttttttttt#........#cccccccccc#', // 19
    '#tttttttttt#........#cccccccccc#', // 20
    '################################'  // 21
  ],
  rooms: [
    { id: 'common',  name: '그리핀도르 휴게실', x: 1,  y: 1,  w: 8,  h: 6 },
    { id: 'requirement', name: '필요의 방',     x: 12, y: 1,  w: 6,  h: 3 },
    { id: 'library', name: '도서관',           x: 21, y: 1,  w: 10, h: 6 },
    { id: 'corridor',name: '3층 복도',          x: 1,  y: 8,  w: 30, h: 3 },
    { id: 'trophy',  name: '트로피 진열실',     x: 1,  y: 12, w: 10, h: 9 },
    { id: 'gallery', name: '회랑',             x: 12, y: 12, w: 8,  h: 9 },
    { id: 'class',   name: '마법약 교실',       x: 21, y: 12, w: 10, h: 9 }
  ],
  start: { x: 4, y: 3 },              // 휴게실 = 시작/부활 지점
  keys: [
    { id: 'key_library', x: 30, y: 1 },
    { id: 'key_trophy',  x: 2,  y: 19 },
    { id: 'key_class',   x: 29, y: 19 }
  ],
  // 비밀 통로: wall 타일 앞(stand)에서 Space/Enter → 반대편 stand 로 순간이동
  passages: [
    { id: 'tapestry', a: { wall: [9, 3],  stand: [8, 3],  label: '태피스트리', art: 'tapestry' },
                      b: { wall: [20, 3], stand: [21, 3], label: '책장 뒤 벽', art: 'wall_face' } },
    { id: 'portrait', a: { wall: [0, 16], stand: [1, 16], label: '뚱뚱한 마법사 초상화', art: 'painting' },
                      b: { wall: [31, 16], stand: [30, 16], label: '초상화', art: 'painting' } }
  ],
  requirementDoor: { x: 14, y: 4, w: 2, h: 2 },   // 32x32 문 그림 (2x2 타일)
  torches: [[5, 0], [25, 0], [2, 7], [10, 7], [20, 7], [29, 7], [6, 11], [24, 11]],   // 벽면 장식 (깜빡임)
  enemies: [
    { id: 'filch',  name: '필치', speed: 30, range: 5.5, halfAngle: 30,
      route: [[2, 9], [29, 9]],
      lines: [{ speaker: '필치', text: '거기 누구야! 학생이 이 시간에 돌아다녀?!' },
              { speaker: '해리', text: '(들켰다… 일단 기숙사로 돌아가자.)' }] },
    { id: 'norris', name: '미세스 노리스', speed: 50, range: 3, halfAngle: 45,
      route: [[13, 13], [18, 13], [18, 19], [13, 19]],
      lines: [{ speaker: '미세스 노리스', text: '야옹—!!' },
              { speaker: '필치', text: '잘했다, 우리 아가. 거기 누구야!' },
              { speaker: '해리', text: '(필치가 오기 전에 기숙사로 도망치자!)' }] }
  ]
};
