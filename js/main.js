/*
 * main.js — 호그와트 탐험 게임 본체 (Phaser 3, 빌드 없음).
 * 좌표: 월드 1px = 원본 1px, 타일 16px, 카메라 zoom 3 (화면 960x576 = 20x12 타일).
 * 디버그 URL: ?debug=1 (HW.debug.* 조작 API 활성, 인트로 생략), ?freeze=1 (적 이동 정지; 시야 판정은 계속),
 *             ?reset=1 (세이브 초기화), ?art=1 (아트 파일 사용)
 */
(function () {
  var A = HW.ASSETS, M = HW.MAP, T = A.TILE;
  var Q = new URLSearchParams(location.search);
  var DEBUG = Q.get('debug') === '1';
  var frozen = Q.get('freeze') === '1';
  var W = M.rows[0].length, H = M.rows.length;
  var PLAYER_SPEED = 64, PW = 5, PH = 4, GRACE_MS = 1500;
  var DIRS = { down: 0, left: 1, right: 2, up: 3 };
  var S = null;          // 현재 씬
  var $ = function (id) { return document.getElementById(id); };

  // ---------- 타일 / 충돌 / 시야 ----------
  function tileAt(tx, ty) { return (tx < 0 || ty < 0 || tx >= W || ty >= H) ? '#' : M.rows[ty][tx]; }
  function def(ch) { return A.TILES[ch] || A.TILES['#']; }
  function doorOpen() { return HW.Save.data.keys.length >= M.keys.length; }
  function isSolid(tx, ty) { var c = tileAt(tx, ty); return c === 'R' ? !doorOpen() : def(c).solid; }
  function isOpaque(tx, ty) { var c = tileAt(tx, ty); return c === 'R' ? !doorOpen() : def(c).opaque; }
  function cen(t) { return t * T + T / 2; }
  function tt(px) { return Math.floor(px / T); }
  function rectFree(x, y) {
    for (var ty = tt(y - PH); ty <= tt(y + PH - 0.001); ty++)
      for (var tx = tt(x - PW); tx <= tt(x + PW - 0.001); tx++) if (isSolid(tx, ty)) return false;
    return true;
  }
  function los(x0, y0, x1, y1) {
    var d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 2);
    for (var i = 1; i <= n; i++) { var k = i / n; if (isOpaque(tt(x0 + (x1 - x0) * k), tt(y0 + (y1 - y0) * k))) return false; }
    return true;
  }
  function ray(x, y, ang, len) {
    var cx = Math.cos(ang), sy = Math.sin(ang), d = 0;
    while (d < len) { var nd = Math.min(len, d + 2); if (isOpaque(tt(x + cx * nd), tt(y + sy * nd))) break; d = nd; }
    return { x: x + cx * d, y: y + sy * d };
  }
  function roomAt(tx, ty) {
    for (var i = 0; i < M.rooms.length; i++) { var r = M.rooms[i]; if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return r; }
    return null;
  }

  // ---------- 자리표시 텍스처 ----------
  function makeTextures(scene) {
    var g = scene.add.graphics();
    function tile(key, color, kind) {
      g.clear(); g.fillStyle(color, 1); g.fillRect(0, 0, T, T);
      var dark = Phaser.Display.Color.IntegerToColor(color).darken(25).color;
      var light = Phaser.Display.Color.IntegerToColor(color).lighten(12).color;
      if (kind === 'wall') { g.fillStyle(dark, 1); g.fillRect(0, 7, T, 1); g.fillRect(0, 15, T, 1); g.fillRect(7, 0, 1, 7); g.fillRect(3, 8, 1, 7); g.fillRect(12, 8, 1, 7); }
      else if (kind === 'shelf') { g.fillStyle(light, 1); for (var i = 0; i < 3; i++) g.fillRect(1, 2 + i * 5, 14, 1); g.fillStyle(0x8a3030, 1); g.fillRect(2, 3, 2, 4); g.fillStyle(0x306a8a, 1); g.fillRect(6, 8, 2, 4); }
      else if (kind === 'case') { g.fillStyle(0xe8d880, 1); g.fillRect(4, 3, 8, 9); g.fillStyle(dark, 1); g.fillRect(0, 13, T, 3); }
      else if (kind === 'desk') { g.fillStyle(dark, 1); g.fillRect(0, 12, T, 4); }
      else if (kind === 'door') { g.fillStyle(dark, 1); g.fillRect(0, 0, 1, T); g.fillRect(15, 0, 1, T); }
      else if (kind === 'rdoor') { g.fillStyle(light, 1); g.fillRect(3, 2, 10, 14); g.fillStyle(dark, 1); g.fillRect(7, 8, 2, 3); }
      else { g.fillStyle(dark, 1); g.fillRect(0, 0, T, 1); g.fillRect(0, 0, 1, T); }
      g.generateTexture(key, T, T);
    }
    var kinds = { wall: 'wall', passage_hidden: 'wall', bookshelf: 'shelf', trophy_case: 'case', desk: 'desk', door_open: 'door', requirement_door_closed: 'rdoor' };
    Object.keys(A.TILES).forEach(function (c) { var d = A.TILES[c]; tile('ph_' + d.name, d.color, kinds[d.name] || 'floor'); });
    tile('ph_passage_found', A.EXTRA_TILES.passage_found.color, 'door');
    tile('ph_requirement_door_open', A.EXTRA_TILES.requirement_door_open.color, 'rdoor');
    // 캐릭터 (16x32)
    Object.keys(A.CHARS).forEach(function (id) {
      var c = A.CHARS[id]; g.clear();
      if (c.cat) {
        g.fillStyle(c.robe, 1); g.fillRect(2, 23, 10, 7); g.fillRect(9, 18, 6, 6); g.fillRect(1, 20, 2, 4);
        g.fillStyle(c.hair, 1); g.fillRect(9, 16, 2, 2); g.fillRect(13, 16, 2, 2);
        g.fillStyle(c.accent, 1); g.fillRect(10, 20, 1, 1); g.fillRect(13, 20, 1, 1);
      } else {
        g.fillStyle(c.robe, 1); g.fillRect(3, 17, 10, 14);
        g.fillStyle(c.skin, 1); g.fillRect(4, 8, 8, 9);
        g.fillStyle(c.hair, 1); g.fillRect(4, 6, 8, 3);
        g.fillStyle(c.accent, 1); g.fillRect(4, 17, 8, 2);
        g.fillStyle(0x000000, 1); g.fillRect(5, 12, 2, 1); g.fillRect(9, 12, 2, 1);
        if (id === 'harry') { g.fillStyle(0xffd040, 1); g.fillRect(4, 19, 2, 4); }
      }
      g.generateTexture('ph_' + id, 16, 32);
    });
    g.clear(); g.fillStyle(0x2a1f3a, 1); g.fillRect(0, 0, 32, 32); g.fillStyle(0xd9b3ff, 1); g.fillRect(4, 4, 24, 28);
    g.fillStyle(0x6a4c86, 1); g.fillRect(15, 4, 2, 28); g.generateTexture('ph_rdoor', 32, 32);
    g.clear(); g.fillStyle(A.KEY_COLOR, 1); g.fillRect(3, 6, 5, 5); g.fillRect(8, 8, 6, 2); g.fillRect(12, 10, 2, 2);
    g.fillStyle(0x6a4a00, 1); g.fillRect(5, 8, 1, 1);
    g.generateTexture('ph_key', 16, 16);
    g.destroy();
  }

  // 아트 타일 이름(tileset 인덱스) → [텍스처, 프레임]. 타일셋이 없으면 자리표시 텍스처 phName
  function hasTileset(scene) { return scene.textures.exists('art_tileset') && scene.textures.get('art_tileset').frameTotal > 12; }
  function tileTex(scene, artName, phName) {
    if (hasTileset(scene) && A.TILESET[artName] !== undefined && scene.textures.get('art_tileset').has(A.TILESET[artName])) return ['art_tileset', A.TILESET[artName]];
    return ['ph_' + phName, undefined];
  }
  function artFor(x, y) {
    var c = tileAt(x, y), a = A.ART_TILE[c] || 'wall';
    if (a === 'wall') return (y + 1 < H && !def(tileAt(x, y + 1)).solid) ? 'wall_face' : 'wall_top';
    if (a === 'floor') return ((x * 73856093) ^ (y * 19349663)) % 10 === 0 ? 'floor_b' : 'floor';
    return a;
  }
  function charTex(scene, id) { return scene.textures.exists('art_' + id) ? 'art_' + id : 'ph_' + id; }

  // ---------- UI ----------
  var toastTimer = null;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.add('hidden'); }, 2200);
  }
  function hud() {
    var d = HW.Save.data;
    $('hud').textContent = '해리 · 열쇠 ' + d.keys.length + '/' + M.keys.length + ' · 비밀 통로 ' + d.passages.length + '/' + M.passages.length;
  }

  // ---------- 씬 ----------
  var GameScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function () { Phaser.Scene.call(this, { key: 'game' }); },

    preload: function () {
      if (!A.USE_ART) return;
      var scene = this;
      Object.keys(A.FILES).forEach(function (id) {
        var f = A.FILES[id];
        if (f.frame) scene.load.spritesheet('art_' + id, f.path, { frameWidth: f.frame[0], frameHeight: f.frame[1] });
        else scene.load.image('art_' + id, f.path);
      });
      this.load.on('loaderror', function (f) { console.warn('[HW] 아트 로드 실패 → 자리표시 사용:', f.src); });
    },

    create: function () {
      S = this;
      var scene = this;
      this.st = { caught: false, cleared: false, grace: 0, moving: false, dir: 'down', walkT: 0 };
      if (!this.textures.exists('ph_wall')) makeTextures(this);

      // 맵
      this.passageImgs = {};
      this.furniture = [];
      this.doorImgs = [];
      var art = hasTileset(this);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var ch = tileAt(x, y), d = def(ch), tx = tileTex(this, artFor(x, y), d.name);
        var img = this.add.image(x * T, y * T, tx[0], tx[1]).setOrigin(0).setDepth(0);
        if (A.FURNITURE[ch]) {   // 가구: 아트 모드 = 바닥 위에 tileset 12–14 (없으면 도형), 자리표시 모드 = 바닥 이미지 자체가 도형
          if (art) { var ft = tileTex(this, A.FURNITURE[ch], d.name); img = this.add.image(x * T, y * T, ft[0], ft[1]).setOrigin(0).setDepth(0.5); }
          this.furniture.push({ ch: ch, x: x, y: y, img: img });
        }
        if (d.name === 'passage_hidden') this.passageImgs[x + ',' + y] = img;
        if (!art && d.name === 'requirement_door_closed') this.doorImgs.push(img);
      }
      // 방마다 바닥 색조: Canvas 렌더러는 tint 를 지원하지 않으므로 반투명 사각형을 덮음 (아트 모드만)
      if (art) M.rooms.forEach(function (r) {
        var c = A.ROOM_TINT[r.id]; if (c === undefined) return;
        scene.add.rectangle(r.x * T, r.y * T, r.w * T, r.h * T, c, A.ROOM_TINT_ALPHA).setOrigin(0).setDepth(0.4);
      });
      // 필요의 방 문 (32x32 = 2x2 타일). 닫힘: 희미한 윤곽(힌트) / 열림: 선명 + 빛
      var RD = M.requirementDoor;
      this.rdoor = this.add.image(RD.x * T, RD.y * T, this.textures.exists('art_rdoor') ? 'art_rdoor' : 'ph_rdoor').setOrigin(0).setDepth(1);
      // 횃불 (벽면 장식, 2프레임 깜빡임) + 따뜻한 빛
      this.torches = [];
      M.torches.forEach(function (t, i) {
        var timg = art ? scene.add.image(t[0] * T, t[1] * T, 'art_tileset', A.TILESET.torch_0).setOrigin(0).setDepth(0.6)
                       : scene.add.rectangle(t[0] * T + 8, t[1] * T + 7, 3, 5, 0xffa040).setDepth(0.6);
        var glow = scene.add.circle(t[0] * T + 8, t[1] * T + 10, 22, 0xffa040, 0.10).setDepth(0.7).setBlendMode(Phaser.BlendModes.ADD);
        scene.torches.push({ img: timg, glow: glow, phase: i % 2, art: art });
      });
      this.lantern = this.add.circle(0, 0, 3 * T, 0xffc060, 0.08).setDepth(0.8).setBlendMode(Phaser.BlendModes.ADD);
      this.sparkles = {};
      M.passages.forEach(function (p) {
        [p.a, p.b].forEach(function (e) {
          var s = scene.add.rectangle(e.wall[0] * T + 8, e.wall[1] * T + 6, 2, 2, 0xffffff, 1).setDepth(1).setAlpha(0);
          scene.tweens.add({ targets: s, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, repeatDelay: 1600, delay: (e.wall[0] * 37) % 1000 });
          scene.sparkles[p.id] = (scene.sparkles[p.id] || []).concat([s]);
        });
      });
      this.refreshTiles();

      // 열쇠
      this.keyImgs = {};
      var keyTex = this.textures.exists('art_key') ? 'art_key' : 'ph_key';
      M.keys.forEach(function (k) {
        if (HW.Save.hasKey(k.id)) return;
        var img = scene.add.image(cen(k.x), cen(k.y), keyTex).setDepth(2);
        scene.tweens.add({ targets: img, y: cen(k.y) - 2, duration: 600, yoyo: true, repeat: -1 });
        scene.keyImgs[k.id] = img;
      });

      // 플레이어 / 적
      this.player = { x: cen(M.start.x), y: cen(M.start.y) };
      this.pSprite = this.add.sprite(0, 0, charTex(this, 'harry'), 0).setOrigin(0.5, 1);
      this.vision = this.add.graphics().setDepth(3);
      this.enemies = M.enemies.map(function (cfg) {
        var e = { cfg: cfg, x: cen(cfg.route[0][0]), y: cen(cfg.route[0][1]), wp: 1 % cfg.route.length, angle: 0 };
        var n = cfg.route[e.wp]; e.angle = Math.atan2(cen(n[1]) - e.y, cen(n[0]) - e.x);
        e.sprite = scene.add.sprite(e.x, e.y, charTex(scene, cfg.id), 0).setOrigin(0.5, 1);
        return e;
      });
      this.makeAnims();
      this.rdoorGlow = null;

      // 카메라 / 입력
      this.cameras.main.setZoom(A.SCALE).setBounds(0, 0, W * T, H * T).setRoundPixels(true);
      this.cameras.main.startFollow(this.pSprite, true, 1, 1);
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D');
      this.input.keyboard.removeCapture('SPACE');   // Space 는 아래 window keydown 에서 처리

      hud();
      $('clear').classList.add('hidden');
      if (HW.Save.data.cleared) this.showClear();
      else if (!HW.Save.data.intro_seen && !DEBUG) {
        HW.Dialogue.open({ speaker: '해리', pages: [
          { narration: true, text: '한밤중의 호그와트. 모두가 잠든 시간…' },
          { text: '필요의 방을 여는 열쇠 3개가 성 어딘가에 있다고 했지.' },
          { text: '필치와 미세스 노리스의 눈에 띄지 않게 조심해야 해.' }
        ] }, function () { HW.Save.set('intro_seen', true); });
      }
      this.syncSprites();
    },

    makeAnims: function () {
      var scene = this;
      ['harry', 'filch', 'norris'].forEach(function (id) {
        if (!scene.textures.exists('art_' + id)) return;
        Object.keys(DIRS).forEach(function (dir) {
          var key = id + '_' + dir;
          if (scene.anims.exists(key)) return;
          var r = DIRS[dir] * A.SHEET.cols;
          scene.anims.create({ key: key, frames: scene.anims.generateFrameNumbers('art_' + id, { start: r, end: r + A.SHEET.cols - 1 }), frameRate: 8, repeat: -1 });
        });
      });
    },

    refreshTiles: function () {
      var scene = this;
      M.passages.forEach(function (p) {
        var found = HW.Save.hasPassage(p.id);
        [p.a, p.b].forEach(function (e) {
          var img = scene.passageImgs[e.wall[0] + ',' + e.wall[1]];
          var tx = found ? tileTex(scene, 'passage_marker', 'passage_found') : tileTex(scene, e.art, 'passage_hidden');
          img.setTexture(tx[0], tx[1]);
        });
        (scene.sparkles[p.id] || []).forEach(function (s) { s.setVisible(!found); });
      });
      var open = doorOpen();
      this.doorImgs.forEach(function (img) {
        img.setTexture(open ? 'ph_requirement_door_open' : 'ph_requirement_door_closed');
      });
      this.rdoor.setAlpha(open ? 1 : 0.28);
      if (open && !this.rdoorGlow) {
        var RD = M.requirementDoor;
        this.rdoorGlow = this.add.circle((RD.x + 1) * T, (RD.y + 1) * T, 26, 0xc080ff, 0.18).setDepth(1.1).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: this.rdoorGlow, alpha: 0.06, duration: 900, yoyo: true, repeat: -1 });
      }
    },

    locked: function () { return HW.Dialogue.isOpen() || this.st.caught || this.st.cleared; },

    update: function (time, delta) {
      var dt = Math.min(delta, 50) / 1000, st = this.st, p = this.player;
      if (!this.locked()) {
        var c = this.cursors, w = this.wasd, vx = 0, vy = 0;
        if (c.left.isDown || w.A.isDown) vx -= 1;
        if (c.right.isDown || w.D.isDown) vx += 1;
        if (c.up.isDown || w.W.isDown) vy -= 1;
        if (c.down.isDown || w.S.isDown) vy += 1;
        st.moving = !!(vx || vy);
        if (st.moving) {
          if (vx && vy) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
          st.dir = vy > 0 ? 'down' : vy < 0 ? 'up' : vx < 0 ? 'left' : 'right';
          if (vx && vy === 0) st.dir = vx < 0 ? 'left' : 'right';
          var nx = p.x + vx * PLAYER_SPEED * dt, ny = p.y + vy * PLAYER_SPEED * dt;
          if (rectFree(nx, p.y)) p.x = nx;
          if (rectFree(p.x, ny)) p.y = ny;
        }
        if (!frozen) this.moveEnemies(dt);
        this.checkKeys();
        if (tileAt(tt(p.x), tt(p.y)) === 'r') this.clearGame();
        else if (time >= st.grace) this.checkVision();
      } else st.moving = false;
      var tf = Math.floor(time / (1000 / A.TORCH_FPS));
      this.torches.forEach(function (t) {
        var f = (tf + t.phase) % 2;
        if (t.art) t.img.setFrame(f ? A.TILESET.torch_1 : A.TILESET.torch_0);
        t.glow.setAlpha(f ? 0.12 : 0.08);
      });
      var fl = this.enemies[0]; this.lantern.setPosition(fl.x, fl.y);
      this.drawVision();
      this.syncSprites();
      this.updatePrompt();
    },

    moveEnemies: function (dt) {
      this.enemies.forEach(function (e) {
        var step = e.cfg.speed * dt;
        while (step > 0) {
          var t = e.cfg.route[e.wp], tx = cen(t[0]), ty = cen(t[1]);
          var d = Math.hypot(tx - e.x, ty - e.y);
          if (d <= step) {
            e.x = tx; e.y = ty; step -= d;
            e.wp = (e.wp + 1) % e.cfg.route.length;
            var n = e.cfg.route[e.wp]; e.angle = Math.atan2(cen(n[1]) - e.y, cen(n[0]) - e.x);
            if (d === 0 && step > 0) { /* 다음 구간으로 */ }
          } else {
            e.angle = Math.atan2(ty - e.y, tx - e.x);
            e.x += (tx - e.x) / d * step; e.y += (ty - e.y) / d * step; step = 0;
          }
        }
      });
    },

    sees: function (e) {
      var p = this.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
      if (d > e.cfg.range * T) return false;
      if (d > 2) {
        var diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - e.angle));
        if (diff > Phaser.Math.DegToRad(e.cfg.halfAngle)) return false;
      }
      return los(e.x, e.y, p.x, p.y);
    },

    checkVision: function () {
      for (var i = 0; i < this.enemies.length; i++) if (this.sees(this.enemies[i])) { this.caughtBy(this.enemies[i]); return; }
    },

    caughtBy: function (e) {
      var scene = this;
      this.st.caught = true;
      HW.Save.set('caught', HW.Save.data.caught + 1);
      HW.Dialogue.open({ speaker: e.cfg.name, pages: e.cfg.lines.map(function (l) { return { speaker: l.speaker, text: l.text }; }) },
        function () { scene.respawn(); });
    },

    respawn: function () {
      this.player.x = cen(M.start.x); this.player.y = cen(M.start.y); this.st.dir = 'down';
      this.st.caught = false; this.st.grace = this.time.now + GRACE_MS;
      toast('그리핀도르 휴게실로 돌아왔다 (열쇠는 그대로)');
    },

    checkKeys: function () {
      var p = this.player, tx = tt(p.x), ty = tt(p.y), scene = this;
      M.keys.forEach(function (k) {
        if (k.x !== tx || k.y !== ty || HW.Save.hasKey(k.id)) return;
        HW.Save.addKey(k.id);
        if (scene.keyImgs[k.id]) { scene.keyImgs[k.id].destroy(); delete scene.keyImgs[k.id]; }
        hud();
        if (doorOpen()) { scene.refreshTiles(); toast('열쇠 3/3! 어딘가에서 필요의 방 문이 열리는 소리가…'); }
        else toast('열쇠를 찾았다! (' + HW.Save.data.keys.length + '/' + M.keys.length + ')');
      });
    },

    standing: function () {
      var tx = tt(this.player.x), ty = tt(this.player.y), out = null;
      M.passages.forEach(function (p) {
        if (p.a.stand[0] === tx && p.a.stand[1] === ty) out = { p: p, from: p.a, to: p.b };
        if (p.b.stand[0] === tx && p.b.stand[1] === ty) out = { p: p, from: p.b, to: p.a };
      });
      return out;
    },
    nearDoor: function () {
      var tx = tt(this.player.x), ty = tt(this.player.y);
      var RD = M.requirementDoor;
      return ty === RD.y + RD.h && tx >= RD.x && tx < RD.x + RD.w;
    },

    interact: function () {
      if (this.locked()) return false;
      var s = this.standing();
      if (s) {
        var isNew = HW.Save.addPassage(s.p.id);
        this.player.x = cen(s.to.stand[0]); this.player.y = cen(s.to.stand[1]);
        this.refreshTiles(); hud();
        toast(isNew ? '비밀 통로 발견! ' + s.from.label + ' → ' + s.to.label : s.from.label + ' 뒤의 통로로 이동');
        return true;
      }
      if (this.nearDoor() && !doorOpen()) {
        HW.Dialogue.open({ speaker: '해리', pages: [{ text: '벽에 커다란 문 모양이 희미하게 떠올라 있다. 열쇠 구멍이 세 개…\n(열쇠 ' + HW.Save.data.keys.length + '/3)' }] });
        return true;
      }
      return false;
    },

    updatePrompt: function () {
      var el = $('prompt'), msg = '';
      if (!this.locked()) {
        var s = this.standing();
        if (s) msg = HW.Save.hasPassage(s.p.id) ? 'Space: ' + s.from.label + ' 뒤 통로로' : 'Space: 이상한 바람이 새어 나온다… 조사하기';
        else if (this.nearDoor() && !doorOpen()) msg = 'Space: 벽 조사하기';
      }
      if (el.textContent !== msg) el.textContent = msg;
      el.classList.toggle('hidden', !msg);
      var r = roomAt(tt(this.player.x), tt(this.player.y));
      var rn = r ? r.name : '';
      if ($('hud-room').textContent !== rn) $('hud-room').textContent = rn;
    },

    drawVision: function () {
      var g = this.vision; g.clear();
      this.enemies.forEach(function (e) {
        var R = e.cfg.range * T, half = Phaser.Math.DegToRad(e.cfg.halfAngle), N = 18;
        g.fillStyle(A.VISION[e.cfg.id] || 0xffffff, A.VISION.alpha);
        g.beginPath(); g.moveTo(e.x, e.y);
        for (var i = 0; i <= N; i++) { var pt = ray(e.x, e.y, e.angle - half + 2 * half * i / N, R); g.lineTo(pt.x, pt.y); }
        g.closePath(); g.fillPath();
      });
    },

    syncSprites: function () {
      var p = this.player, st = this.st, art = this.textures.exists('art_harry');
      this.pSprite.setPosition(Math.round(p.x), Math.round(p.y + 6)).setDepth(10 + p.y / 1000);
      if (art) { if (st.moving) this.pSprite.anims.play('harry_' + st.dir, true); else { this.pSprite.anims.stop(); this.pSprite.setFrame(DIRS[st.dir] * A.SHEET.cols); } }
      else this.pSprite.setFlipX(st.dir === 'left');
      var scene = this;
      this.enemies.forEach(function (e) {
        e.sprite.setPosition(Math.round(e.x), Math.round(e.y + 6)).setDepth(10 + e.y / 1000);
        var a = Phaser.Math.RadToDeg(e.angle), dir = a > 45 && a < 135 ? 'down' : a < -45 && a > -135 ? 'up' : Math.abs(a) >= 135 ? 'left' : 'right';
        if (scene.textures.exists('art_' + e.cfg.id)) { if (!frozen && !scene.locked()) e.sprite.anims.play(e.cfg.id + '_' + dir, true); else { e.sprite.anims.stop(); e.sprite.setFrame(DIRS[dir] * A.SHEET.cols); } }
        else e.sprite.setFlipX(dir === 'left');
      });
    },

    clearGame: function () {
      if (this.st.cleared) return;
      this.st.cleared = true;
      HW.Save.set('cleared', true);
      this.showClear();
    },
    showClear: function () {
      this.st.cleared = true;
      var d = HW.Save.data;
      $('clear-stats').textContent = '열쇠 ' + d.keys.length + '/3 · 비밀 통로 ' + d.passages.length + '/' + M.passages.length + ' · 들킨 횟수 ' + d.caught;
      $('clear').classList.remove('hidden');
    },
    restart: function () {
      HW.Save.reset();
      HW.Dialogue.close();
      $('clear').classList.add('hidden');
      this.scene.restart();
    }
  });

  // ---------- 키 입력 (대화 / 조사 / 재시작) ----------
  window.addEventListener('keydown', function (e) {
    if (!S || !S.st) return;
    var k = e.key;
    if (k === ' ' || k === 'Enter') {
      e.preventDefault();
      if (e.repeat) return;
      if (HW.Dialogue.isOpen()) HW.Dialogue.advance();
      else if (S.st.cleared) { if (k === 'Enter') S.restart(); }
      else S.interact();
    } else if (k === 'Escape') {
      if (HW.Dialogue.isOpen()) HW.Dialogue.close();
    }
  });

  // ---------- 상태 조회 / 디버그 API ----------
  HW.state = function () {
    if (!S || !S.player) return { ready: false };
    var p = S.player;
    return {
      ready: true, debug: DEBUG, frozen: frozen,
      player: { x: p.x, y: p.y, tx: tt(p.x), ty: tt(p.y), dir: S.st.dir },
      keys: HW.Save.data.keys.slice(), passages: HW.Save.data.passages.slice(),
      cleared: HW.Save.data.cleared, caughtCount: HW.Save.data.caught, caught: S.st.caught,
      doorOpen: doorOpen(), dialogueOpen: HW.Dialogue.isOpen(),
      dialogueSpeaker: HW.Dialogue.isOpen() ? $('dlg-name-text').textContent : null,
      clearShown: !$('clear').classList.contains('hidden'),
      art: Object.keys(A.FILES).filter(function (id) { return S.textures.exists('art_' + id); }),
      useArt: A.USE_ART,
      furniture: S.furniture.map(function (f) { return { ch: f.ch, key: f.img.texture.key, frame: f.img.frame.name }; }),
      hud: $('hud').textContent, room: $('hud-room').textContent,
      enemies: S.enemies.map(function (e) { return { id: e.cfg.id, x: e.x, y: e.y, tx: tt(e.x), ty: tt(e.y) }; })
    };
  };
  if (DEBUG) HW.debug = {
    teleport: function (tx, ty, dir) { S.player.x = cen(tx); S.player.y = cen(ty); if (dir) S.st.dir = dir; S.st.grace = 0; return HW.state().player; },
    freeze: function (b) { frozen = b !== false; },
    placeEnemy: function (id, tx, ty, angleDeg) {
      S.enemies.forEach(function (e) { if (e.cfg.id === id) { e.x = cen(tx); e.y = cen(ty); e.angle = Phaser.Math.DegToRad(angleDeg || 0); } });
    },
    parkEnemies: function () { S.enemies.forEach(function (e) { e.x = -1000; e.y = -1000; }); },  // 맵 밖으로 치움 (테스트용)
    interact: function () { return S.interact(); },
    restart: function () { S.restart(); }
  };

  HW.Save.init();
  HW.game = new Phaser.Game({
    type: Phaser.CANVAS, parent: 'game', width: 960, height: 576, backgroundColor: '#07060d',
    pixelArt: true, banner: false, scene: [GameScene],
    loader: { imageLoadType: 'HTMLImageElement' }   // XHR 대신 <img> 로 로드 → file:// 에서도 동작
  });
})();
