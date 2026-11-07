/* Rồng Rắn Cướp Cờ — mô phỏng 3D vòng chung kết (khi <= 6 người sống).
 * Chạy sau game.js + rounds.js. Chỉ giao tiếp qua cầu nối window.__game
 * (tham số `api`). KHÔNG tự xử lý luật: rounds.js đã lo việc chạm cờ,
 * cầm cờ, thắng vòng và tính điểm — file này chỉ vẽ: hai hàng rồng rắn,
 * trang trí cột cờ giữa sân, cờ trên tay người cầm cờ, vạch về đích,
 * dải HUD và pháo giấy lúc thắng.
 * Phong cách voxel: chỉ BoxGeometry + MeshLambertMaterial, bảng màu ấm.
 * Không dùng tài sản Squid Game / Minecraft. Chữ tiếng Việt.
 */
(function () {
  'use strict';

  var BASE_Z = 33;          // vạch về đích (z >= 33 là về tới nhà)
  var POLE = { x: 0, z: 0 }; // cột cờ giữa sân (rounds.js đặt ở 0,0)
  var LINE_COLORS = [0xc62828, 0x0f766e]; // đỏ, xanh teal — hai hàng rắn
  var GOLD = 0xffedb8, GOLD_DARK = 0xf2b01e, PAPER = 0xfffdf4, EDGE = 0x1f2937;
  var CONFETTI_COLORS = [0xc62828, 0xffedb8, 0x0f766e, 0xf9a825, 0x43a047, 0xfffdf4];

  var cur = null; // phiên mô phỏng đang chạy (build -> update -> teardown)

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist2(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }

  function mat(color, opacity) {
    var m = new THREE.MeshLambertMaterial({ color: color });
    if (opacity !== undefined && opacity < 1) { m.transparent = true; m.opacity = opacity; }
    return m;
  }

  // Hộp voxel, thêm vào parent, trả về mesh. Mọi mesh của sim đều đi qua đây
  // (trừ bảng chữ dùng vật liệu mảng) để teardown dọn được hết.
  function box(w, h, d, color, x, y, z, parent, opacity) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opacity));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  // Vẽ chữ tiếng Việt lên mặt hộp qua canvas texture (vẫn là Box + Lambert).
  function textTexture(line1, line2, bgCss, fgCss) {
    var cv = document.createElement('canvas');
    cv.width = 512; cv.height = 192;
    var c = cv.getContext('2d');
    c.fillStyle = bgCss; c.fillRect(0, 0, 512, 192);
    c.strokeStyle = 'rgba(255,237,184,0.9)'; c.lineWidth = 8;
    c.strokeRect(10, 10, 492, 172);
    c.fillStyle = fgCss; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 68px system-ui, sans-serif';
    c.fillText(line1, 256, line2 ? 72 : 96);
    if (line2) {
      c.font = 'bold 44px system-ui, sans-serif';
      c.fillText(line2, 256, 140);
    }
    var tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function boardMesh(w, h, line1, line2, bgCss, parent, x, y, z) {
    var tex = textTexture(line1, line2, bgCss, '#fffdf4');
    var face = new THREE.MeshLambertMaterial({ map: tex });
    var side = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
    // Mặt hộp: +x,-x,+y,-y,+z,-z — chữ ở cả hai mặt trước/sau (+z và -z).
    var mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.18),
      [side, side, side, side, face, face]
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function alivePersons(api) {
    if (!api || typeof api.allPersons !== 'function') return [];
    try {
      return api.allPersons().filter(function (p) { return p && p.alive; });
    } catch (e) { return []; }
  }

  function teamCss(api, team) {
    if (api && typeof api.teamColorHex === 'function') {
      try { return api.teamColorHex(team); } catch (e) { /* dùng mặc định */ }
    }
    if (api && api.TEAM_COLORS && api.TEAM_COLORS[team]) return api.TEAM_COLORS[team];
    return '#2196f3';
  }

  function teamName(api, team) {
    if (api && api.TEAM_NAMES && api.TEAM_NAMES[team]) return 'ĐỘI ' + api.TEAM_NAMES[team].toUpperCase();
    if (team === null || team === undefined) return 'ĐỘI CỦA BẠN';
    return 'ĐỘI ' + (team + 1);
  }

  function teamKey(p) { return (p.team === null || p.team === undefined) ? 'solo' : ('t' + p.team); }

  function holderOf(st, api) {
    if (!st || !st.state || !st.state.holderId) return null;
    var id = st.state.holderId;
    var list = alivePersons(api);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    if (api && api.player && api.player.id === id) return api.player;
    return null;
  }

  // ---------------- build ----------------
  function build(st, api) {
    teardown(st, api);
    api = api || window.__game || {};
    if (!window.THREE || !api.scene) {
      // Không có scene 3D: vẫn dựng dải HUD để người chơi thấy trạng thái cờ.
      cur = { st: st, api: api, scene: null, added: [], t: 0, noScene: true };
      buildStrip(cur);
      return;
    }
    var scene = api.scene;
    var ctx = {
      st: st, api: api, scene: scene, t: 0,
      added: [], poleDecor: [], zones: [], beads: [], leaderMarks: [],
      carrier: null, carrierPerson: null,
      flagMesh: null, flagOrigScale: null, beacon: null, beaconMat: null,
      ownPole: null, confetti: [], confettiOn: false, confettiT: 0,
      celebrated: false, lastStrip: '', strip: null, stripLine1: null, stripLine2: null
    };
    cur = ctx;

    var alive = alivePersons(api);

    // ---- 1. Trang trí cột cờ giữa sân (st.state.mesh của rounds.js) ----
    var poleGroup = (st && st.state && st.state.mesh) || null;
    if (poleGroup) {
      // Tìm lá cờ của rounds.js (hộp 2.4 x 1.4) để phóng to + làm cờ bay.
      for (var ci = 0; ci < poleGroup.children.length; ci++) {
        var ch = poleGroup.children[ci];
        if (ch.geometry && ch.geometry.parameters &&
            ch.geometry.parameters.width === 2.4 && ch.geometry.parameters.height === 1.4) {
          ctx.flagMesh = ch;
          ctx.flagOrigScale = { x: ch.scale.x, y: ch.scale.y, z: ch.scale.z };
          ch.scale.set(1.6, 1.6, 1.6);
          break;
        }
      }
      // Vòng vàng quanh chân cột + ngôi sao vàng trên đỉnh cột.
      var ringY = 0.72;
      ctx.poleDecor.push(box(4.0, 0.22, 0.5, GOLD_DARK, 0, ringY, 2.0, poleGroup));
      ctx.poleDecor.push(box(4.0, 0.22, 0.5, GOLD_DARK, 0, ringY, -2.0, poleGroup));
      ctx.poleDecor.push(box(0.5, 0.22, 4.0, GOLD_DARK, 2.0, ringY, 0, poleGroup));
      ctx.poleDecor.push(box(0.5, 0.22, 4.0, GOLD_DARK, -2.0, ringY, 0, poleGroup));
      ctx.poleDecor.push(box(0.7, 0.7, 0.7, GOLD_DARK, 0, 9.5, 0, poleGroup));
      // Cột sáng (beacon) vàng mờ vươn lên trời — nhìn từ xa cũng thấy cờ ở đâu.
      ctx.beaconMat = mat(0xffd54f, 0.16);
      var beacon = new THREE.Mesh(new THREE.BoxGeometry(1.5, 17, 1.5), ctx.beaconMat);
      beacon.position.set(0, 8.5, 0);
      poleGroup.add(beacon);
      ctx.beacon = beacon;
      ctx.poleDecor.push(beacon);
    } else {
      // rounds.js chưa tạo cột cờ: tự dựng một cột giống hệt để sim không trống.
      var g = new THREE.Group();
      box(0.5, 9, 0.5, 0x6d4c41, 0, 4.5, 0, g);
      var fl = box(2.4, 1.4, 0.15, 0xe53935, 1.4, 8, 0, g);
      fl.scale.set(1.6, 1.6, 1.6);
      ctx.flagMesh = fl;
      ctx.flagOrigScale = { x: 1, y: 1, z: 1 };
      box(3, 0.6, 3, 0xffe0a3, 0, 0.3, 0, g);
      box(0.7, 0.7, 0.7, GOLD_DARK, 0, 9.5, 0, g);
      g.position.set(POLE.x, 0, POLE.z);
      scene.add(g);
      ctx.ownPole = g;
      ctx.added.push(g);
    }

    // Vòng đất đỏ + vàng quanh cột cờ (đánh dấu "giữa sân") + 4 đèn lồng góc.
    var ringR = 7;
    ctx.added.push(box(ringR * 2 + 0.5, 0.1, 0.5, 0xc62828, 0, 0.06, ringR, scene));
    ctx.added.push(box(ringR * 2 + 0.5, 0.1, 0.5, 0xc62828, 0, 0.06, -ringR, scene));
    ctx.added.push(box(0.5, 0.1, ringR * 2 + 0.5, 0xc62828, ringR, 0.06, 0, scene));
    ctx.added.push(box(0.5, 0.1, ringR * 2 + 0.5, 0xc62828, -ringR, 0.06, 0, scene));
    var ringR2 = 5;
    ctx.added.push(box(ringR2 * 2 + 0.4, 0.1, 0.4, GOLD_DARK, 0, 0.07, ringR2, scene));
    ctx.added.push(box(ringR2 * 2 + 0.4, 0.1, 0.4, GOLD_DARK, 0, 0.07, -ringR2, scene));
    ctx.added.push(box(0.4, 0.1, ringR2 * 2 + 0.4, GOLD_DARK, ringR2, 0.07, 0, scene));
    ctx.added.push(box(0.4, 0.1, ringR2 * 2 + 0.4, GOLD_DARK, -ringR2, 0.07, 0, scene));
    [[4.6, 4.6], [4.6, -4.6], [-4.6, 4.6], [-4.6, -4.6]].forEach(function (p) {
      ctx.added.push(box(0.28, 2.4, 0.28, 0x6d4c41, p[0], 1.2, p[1], scene));
      ctx.added.push(box(0.62, 0.62, 0.62, GOLD_DARK, p[0], 2.7, p[1], scene));
      ctx.added.push(box(0.4, 0.4, 0.4, 0xc62828, p[0], 3.15, p[1], scene));
    });

    // ---- 2. Vạch về đích: một khu vực cho mỗi đội (tối đa 3), kề nhau ở z 33..38 ----
    var groups = {}; // teamKey -> {team, members}
    alive.forEach(function (p) {
      var k = teamKey(p);
      if (!groups[k]) groups[k] = { team: p.team, members: [] };
      groups[k].members.push(p);
    });
    var groupList = Object.keys(groups).map(function (k) { return groups[k]; });
    var zones;
    if (groupList.length <= 1) {
      // Chỉ một đội (hoặc chưa chia đội): tách làm hai khu trái/phải cho rõ.
      zones = [
        { key: 'left', label: 'VỀ ĐÂY · TRÁI', css: '#c62828', color: 0xc62828, cx: -7.5, w: 14 },
        { key: 'right', label: 'VỀ ĐÂY · PHẢI', css: '#0f766e', color: 0x0f766e, cx: 7.5, w: 14 }
      ];
    } else {
      var zw = 30 / groupList.length;
      zones = groupList.map(function (gr, i) {
        var css = teamCss(api, gr.team);
        return {
          key: teamKey(gr.members[0]), team: gr.team,
          label: 'VỀ ĐÂY', sub: teamName(api, gr.team),
          css: css, color: parseInt(String(css).slice(1), 16) || 0x2196f3,
          cx: -15 + zw * (i + 0.5), w: zw - 1
        };
      });
    }
    zones.forEach(function (zn) {
      var tileMats = [];
      var cols = Math.max(2, Math.round(zn.w / 2.5));
      var tileW = zn.w / cols;
      for (var cxI = 0; cxI < cols; cxI++) {
        for (var rz = 0; rz < 2; rz++) {
          var even = (cxI + rz) % 2 === 0;
          var m = mat(even ? zn.color : PAPER);
          var tile = new THREE.Mesh(new THREE.BoxGeometry(tileW - 0.12, 0.1, 2.4), m);
          tile.position.set(zn.cx - zn.w / 2 + tileW * (cxI + 0.5), 0.06, 34.25 + rz * 2.5);
          scene.add(tile);
          ctx.added.push(tile);
          tileMats.push(m);
        }
      }
      // Viền khu vực.
      ctx.added.push(box(zn.w, 0.3, 0.3, zn.color, zn.cx, 0.15, 33, scene));
      ctx.added.push(box(zn.w, 0.3, 0.3, zn.color, zn.cx, 0.15, 38, scene));
      ctx.added.push(box(0.3, 0.3, 5, zn.color, zn.cx - zn.w / 2, 0.15, 35.5, scene));
      ctx.added.push(box(0.3, 0.3, 5, zn.color, zn.cx + zn.w / 2, 0.15, 35.5, scene));
      // Bảng "VỀ ĐÂY" dựng ở cuối sân (z = 38.6), mặt chữ hướng ra sân.
      ctx.added.push(box(0.18, 1.8, 0.18, 0x6d4c41, zn.cx - 2.4, 0.9, 38.6, scene));
      ctx.added.push(box(0.18, 1.8, 0.18, 0x6d4c41, zn.cx + 2.4, 0.9, 38.6, scene));
      var board = boardMesh(5.2, 1.7, zn.label, zn.sub || null, zn.css, scene, zn.cx, 2.4, 38.6);
      ctx.added.push(board);
      ctx.zones.push({ key: zn.key, team: zn.team, cx: zn.cx, mats: tileMats, color: zn.color });
      // Đường chấm dẫn từ khu vực này ra giữa sân (uốn lượn nhẹ).
      var phase = zn.cx * 0.35;
      for (var s = 0; s <= 10; s++) {
        var tt = s / 10;
        var px = lerp(zn.cx, 0, tt) + Math.sin(tt * Math.PI * 2.2 + phase) * 1.6 * (1 - tt * 0.5);
        var pz = lerp(36, 5, tt);
        ctx.added.push(box(0.9, 0.08, 0.9, s % 2 === 0 ? zn.color : GOLD_DARK, px, 0.07, pz, scene));
      }
    });

    // ---- 3. Hạt rắn: hai hàng, mỗi hàng 26 hạt voxel nối các thành viên ----
    for (var li = 0; li < 2; li++) {
      var beadList = [];
      for (var bi = 0; bi < 26; bi++) {
        var bead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), mat(LINE_COLORS[li]));
        bead.position.set(0, -10, 0); // ẩn dưới đất cho tới khi có người
        scene.add(bead);
        ctx.added.push(bead);
        beadList.push(bead);
      }
      ctx.beads.push(beadList);
      // Đầu rắn: hạt vàng lớn + mào đỏ, lơ lửng trên đầu người dẫn hàng.
      var headMark = new THREE.Group();
      var hg = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), mat(GOLD_DARK));
      headMark.add(hg);
      var crest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), mat(0xc62828));
      crest.position.set(0, 0.65, 0);
      headMark.add(crest);
      headMark.position.set(0, -10, 0);
      scene.add(headMark);
      ctx.added.push(headMark);
      ctx.leaderMarks.push(headMark);
    }

    // ---- 4. Cờ cầm tay (gắn lên đầu người cầm cờ khi có holder) ----
    var carrier = new THREE.Group();
    box(0.12, 2.1, 0.12, 0x6d4c41, 0, 1.05, 0, carrier);           // cán cờ
    box(1.15, 0.7, 0.08, 0xe53935, 0.62, 1.85, 0, carrier);        // lá cờ đỏ
    box(0.22, 0.22, 0.22, GOLD_DARK, 0, 2.2, 0, carrier);         // núm vàng
    carrier.position.set(0.55, 2.45, 0); // trên đầu người (đầu ~2.4, mũ ~2.37)
    ctx.carrier = carrier;

    // ---- 5. Pháo giấy: 70 khối voxel nhỏ, chờ lúc thắng mới bung ----
    for (var pi = 0; pi < 70; pi++) {
      var cf = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.35, 0.35),
        mat(CONFETTI_COLORS[pi % CONFETTI_COLORS.length])
      );
      cf.visible = false;
      scene.add(cf);
      ctx.added.push(cf);
      ctx.confetti.push({ mesh: cf, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, life: 0 });
    }

    buildStrip(ctx);
  }

  function buildStrip(ctx) {
    var style = document.createElement('style');
    style.id = 'sim-flag-style';
    style.textContent =
      '.sim-flag-strip{position:fixed;top:118px;left:50%;transform:translateX(-50%);' +
      'z-index:30;pointer-events:none;text-align:center;max-width:min(92vw,560px);' +
      'background:rgba(31,41,55,.85);color:#fffdf4;border:2px solid #ffedb8;border-radius:10px;' +
      'padding:6px 14px;font:600 14px/1.45 system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.35)}' +
      '.sim-flag-strip .sim-flag-line2{display:block;font-weight:400;font-size:12.5px;opacity:.92}' +
      '.sim-flag-strip.sim-flag-me{border-color:#e53935}';
    document.head.appendChild(style);
    var strip = document.createElement('div');
    strip.className = 'sim-flag-strip';
    strip.id = 'sim-flag-strip';
    var l1 = document.createElement('span');
    var l2 = document.createElement('span');
    l2.className = 'sim-flag-line2';
    strip.appendChild(l1);
    strip.appendChild(l2);
    document.body.appendChild(strip);
    ctx.strip = strip; ctx.stripLine1 = l1; ctx.stripLine2 = l2;
    ctx.styleEl = style;
  }

  // ---------------- update ----------------
  function update(dt, st, api) {
    if (!cur) return;
    var ctx = cur;
    api = api || ctx.api || window.__game || {};
    if (typeof dt !== 'number' || !(dt > 0)) dt = 0.016;
    dt = Math.min(dt, 0.05);
    ctx.t += dt;
    var t = ctx.t;

    var holder = holderOf(st, api);
    var persons = alivePersons(api);

    // Cờ bay: lá cờ trên cột cột lắc nhẹ; lúc thắng vẫy mạnh hơn.
    if (ctx.flagMesh && ctx.flagOrigScale) {
      var wave = ctx.celebrated ? 0.55 : 0.28;
      ctx.flagMesh.rotation.y = Math.sin(t * 3.2) * wave;
      var pulse = ctx.celebrated ? 0.14 : 0.06;
      var s = 1 + pulse * Math.sin(t * 5);
      ctx.flagMesh.scale.set(ctx.flagOrigScale.x * s, ctx.flagOrigScale.y, ctx.flagOrigScale.z);
    }
    if (ctx.beaconMat) ctx.beaconMat.opacity = 0.13 + 0.07 * Math.sin(t * 2);

    // Cờ cầm tay: gắn lên người đang cầm, gỡ khỏi người cũ khi đổi chủ.
    if (ctx.carrier) {
      if (holder && ctx.carrierPerson !== holder) {
        if (ctx.carrierPerson && ctx.carrierPerson.group) ctx.carrierPerson.group.remove(ctx.carrier);
        if (holder.group) holder.group.add(ctx.carrier);
        ctx.carrierPerson = holder;
      } else if (!holder && ctx.carrierPerson) {
        if (ctx.carrierPerson.group) ctx.carrierPerson.group.remove(ctx.carrier);
        ctx.carrierPerson = null;
      }
      if (ctx.carrierPerson) ctx.carrier.rotation.y = Math.sin(t * 4) * 0.2;
    }

    // Hai hàng rồng rắn: chia người sống thành 2 hàng (chẵn/lẻ theo đội),
    // mỗi hàng xếp theo khoảng cách tới cột cờ (người dẫn đầu gần cờ nhất),
    // hạt voxel nối dọc đường gấp khúc qua vị trí thật của từng người.
    if (ctx.scene && persons.length) {
      var sorted = persons.slice().sort(function (a, b) {
        var ta = (a.team === null || a.team === undefined) ? 99 : a.team;
        var tb = (b.team === null || b.team === undefined) ? 99 : b.team;
        return ta - tb || (a.name < b.name ? -1 : 1);
      });
      for (var li = 0; li < 2; li++) {
        var line = [];
        for (var si = 0; si < sorted.length; si++) if (si % 2 === li) line.push(sorted[si]);
        line.sort(function (a, b) {
          return dist2(a.x, a.z, POLE.x, POLE.z) - dist2(b.x, b.z, POLE.x, POLE.z);
        });
        var beads = ctx.beads[li];
        if (!beads) continue;
        if (!line.length) {
          beads.forEach(function (bd) { bd.position.set(0, -10, 0); });
          if (ctx.leaderMarks[li]) ctx.leaderMarks[li].position.set(0, -10, 0);
          continue;
        }
        // Tổng độ dài đường gấp khúc qua các thành viên.
        var segLen = [], total = 0;
        for (var mi = 0; mi < line.length - 1; mi++) {
          var sl = dist2(line[mi].x, line[mi].z, line[mi + 1].x, line[mi + 1].z);
          segLen.push(sl); total += sl;
        }
        for (var bi2 = 0; bi2 < beads.length; bi2++) {
          var bead = beads[bi2];
          var bx, bz;
          if (total < 2) {
            // Hàng tụm lại một chỗ: xếp hạt thành vòng tròn nhỏ quanh người dẫn đầu.
            var ang = (bi2 / beads.length) * Math.PI * 2 + t * 0.4;
            bx = line[0].x + Math.cos(ang) * 1.6;
            bz = line[0].z + Math.sin(ang) * 1.6;
          } else {
            var target = (bi2 + 0.5) / beads.length * total;
            var acc = 0, placed = false;
            for (var mj = 0; mj < segLen.length; mj++) {
              if (target <= acc + segLen[mj] || mj === segLen.length - 1) {
                var frac = segLen[mj] > 0 ? clamp((target - acc) / segLen[mj], 0, 1) : 0;
                bx = lerp(line[mj].x, line[mj + 1].x, frac);
                bz = lerp(line[mj].z, line[mj + 1].z, frac);
                placed = true;
                break;
              }
              acc += segLen[mj];
            }
            if (!placed) { bx = line[line.length - 1].x; bz = line[line.length - 1].z; }
          }
          bead.position.set(bx, 0.45 + 0.12 * Math.sin(t * 4 + bi2 * 0.7), bz);
          bead.rotation.y = t * 0.8 + bi2 * 0.24;
        }
        // Đầu rắn lơ lửng trên đầu người dẫn hàng.
        var mark = ctx.leaderMarks[li];
        if (mark) {
          var lead = line[0];
          mark.position.set(lead.x, 3.15 + 0.25 * Math.sin(t * 3 + li * 2), lead.z);
          mark.rotation.y = t * 1.2;
        }
      }
    }

    // Khu về đích của đội cầm cờ sáng lên (nhấp nháy vàng).
    if (ctx.zones.length && holder) {
      var hk = teamKey(holder);
      ctx.zones.forEach(function (zn) {
        var on = zn.key === hk;
        zn.mats.forEach(function (m) {
          if (m.emissive) m.emissive.setHex(on ? 0x664411 : 0x000000);
        });
      });
    }

    // Dải HUD: ai cầm cờ, còn bao xa tới vạch về (chỉ cập nhật khi chữ đổi).
    if (ctx.strip) {
      var l1, l2, isMe = false;
      if (holder) {
        isMe = !!(api.player && holder === api.player);
        var remain = Math.max(0, BASE_Z - holder.z);
        l1 = isMe
          ? '🚩 BẠN đang cầm cờ — còn ' + remain.toFixed(0) + ' m nữa là về đích!'
          : '🚩 ' + holder.name + ' đang cầm cờ — còn ' + remain.toFixed(0) + ' m tới vạch về!';
        l2 = 'Chạy về vạch xuất phát (z ≥ 33) để thắng vòng chung kết!';
      } else {
        l1 = 'Chưa ai cầm cờ — chạy ra giữa sân!';
        l2 = 'Cờ ở giữa sân · chạm cờ rồi chạy về vạch xuất phát (z ≥ 33)!';
      }
      var key = l1 + '|' + l2;
      if (key !== ctx.lastStrip) {
        ctx.lastStrip = key;
        ctx.stripLine1.textContent = l1;
        ctx.stripLine2.textContent = l2;
        ctx.strip.classList.toggle('sim-flag-me', isMe);
      }
    }

    // Khoảnh khắc thắng: người cầm cờ chạm vạch về -> bung pháo giấy + cờ vẫy mạnh.
    if (holder && holder.z >= BASE_Z && !ctx.celebrated) {
      ctx.celebrated = true;
      startConfetti(ctx, holder.x, 3, holder.z);
    }
    if (ctx.confettiOn) stepConfetti(ctx, dt);
  }

  function startConfetti(ctx, x, y, z) {
    ctx.confettiOn = true;
    ctx.confettiT = 0;
    ctx.confetti.forEach(function (c) {
      c.mesh.visible = true;
      c.mesh.position.set(x + (Math.random() - 0.5) * 2, y + Math.random() * 2, z + (Math.random() - 0.5) * 2);
      var a = Math.random() * Math.PI * 2;
      var sp = 3 + Math.random() * 6;
      c.vx = Math.cos(a) * sp;
      c.vz = Math.sin(a) * sp;
      c.vy = 5 + Math.random() * 7;
      c.rx = (Math.random() - 0.5) * 8;
      c.rz = (Math.random() - 0.5) * 8;
      c.life = 1.4 + Math.random() * 0.6;
    });
  }

  function stepConfetti(ctx, dt) {
    ctx.confettiT += dt;
    var anyAlive = false;
    ctx.confetti.forEach(function (c) {
      if (!c.mesh.visible) return;
      c.life -= dt;
      if (c.life <= 0 || c.mesh.position.y < 0.1) { c.mesh.visible = false; return; }
      anyAlive = true;
      c.vy -= 12 * dt;
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.position.z += c.vz * dt;
      c.mesh.rotation.x += c.rx * dt;
      c.mesh.rotation.z += c.rz * dt;
    });
    if (!anyAlive) ctx.confettiOn = false;
  }

  // ---------------- teardown ----------------
  function teardown(st, api) {
    if (!cur) return;
    var ctx = cur;
    cur = null;
    try {
      // Gỡ cờ cầm tay khỏi người đang cầm (nếu còn gắn).
      if (ctx.carrierPerson && ctx.carrierPerson.group) ctx.carrierPerson.group.remove(ctx.carrier);
      // Trả lá cờ gốc của rounds.js về kích thước ban đầu.
      if (ctx.flagMesh && ctx.flagOrigScale) {
        ctx.flagMesh.scale.set(ctx.flagOrigScale.x, ctx.flagOrigScale.y, ctx.flagOrigScale.z);
        ctx.flagMesh.rotation.y = 0;
      }
      // Gỡ đồ trang trí khỏi cột cờ của rounds.js — KHÔNG gỡ chính cột cờ đó.
      if (ctx.poleDecor && ctx.poleDecor.length && ctx.scene) {
        ctx.poleDecor.forEach(function (m) { if (m.parent) m.parent.remove(m); });
      }
      // Gỡ mọi mesh của sim khỏi scene.
      if (ctx.scene && ctx.added) {
        ctx.added.forEach(function (obj) {
          if (obj.parent) obj.parent.remove(obj);
          obj.traverse(function (o) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mm) {
                if (mm.map) mm.map.dispose();
                mm.dispose();
              });
            }
          });
        });
      }
      if (ctx.carrier) {
        ctx.carrier.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
      }
    } catch (e) { /* dọn dẹp không được làm vỡ game */ }
    if (ctx.strip && ctx.strip.parentNode) ctx.strip.parentNode.removeChild(ctx.strip);
    if (ctx.styleEl && ctx.styleEl.parentNode) ctx.styleEl.parentNode.removeChild(ctx.styleEl);
  }

  window.RoundSims = window.RoundSims || {};
  window.RoundSims['rong-ran'] = { build: build, update: update, teardown: teardown };
})();
