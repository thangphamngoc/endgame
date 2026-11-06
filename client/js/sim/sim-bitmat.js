/* Bịt Mắt Bắt Dê — mô phỏng 3D trong thế giới (vòng 5).
 * Chỉ dùng BoxGeometry + MeshLambertMaterial, bảng màu ấm, không dùng tài sản
 * Squid Game hay Minecraft. Chữ tiếng Việt.
 *
 * Hợp đồng: window.RoundSims['bit-mat'] = { build(st, api), update(dt, st, api),
 * teardown(st, api) }. `st` là state vòng từ rounds.js, `api` là window.__game.
 *
 * Việc sim NÀY làm (không làm lại logic rounds.js):
 *  - Người tìm (không phải dê): tối thế giới 3D (sương mù + nền xanh chàm hoàng
 *    hôn) và thêm vignette chỉ chừa một vòng sáng nhỏ ở giữa màn hình.
 *  - Tiếng dê kêu (WebAudio, không file ngoài) mỗi ~2,5s, pan trái/phải theo
 *    hướng dê và to dần khi dê ở gần; tiếng bước chân nhẹ khi người chơi di chuyển.
 *  - Dải la bàn/đo tai nghe gọn ở đầu màn hình: mũi tên chỉ hướng dê + chữ xa/gần
 *    (cùng ngưỡng với rounds.js: <6 rất gần, <15 gần, <30 xa, còn lại rất xa).
 *  - Dê chỉ hiện ánh vàng nhấp nháy mờ khi ở rất gần (<6) để tìm được mà không dễ.
 *  - Dê (người chơi là dê) thấy thế giới bình thường + dải nhắc "bạn là dê".
 * Không chạm #round-overlay / #blind-overlay / #goat-marker (rounds.js quản lý).
 *
 * Lưu ý về nguồn hướng/khoảng cách tới dê:
 *  - Chơi đơn: st.state.goat là person thật nên tính trực tiếp từng khung hình.
 *  - Nhiều người: server KHÔNG gửi goatId cho người tìm (chỉ gửi blind + cue),
 *    nên st.state.goat là null. Sim bọc window.Rounds.onServerMessage để bắt tin
 *    cue {dir: 'north'|'east'|'south'|'west', dist} của server (cứ 2s một lần)
 *    và đổi hướng chính (north=0°, east=90°, south=180°, west=270° — cùng quy
 *    ước atan2(dx,-dz) mà rounds.js dùng cho mũi tên ở chế độ chơi đơn).
 *  - Mũi tên là hướng theo thế giới (bắc = lên trên), giống #cue-arrow của
 *    rounds.js; cầu nối không đưa góc quay camera nên không xoay theo tầm nhìn.
 *  - Nhiều người chơi: không biết vị trí dê nên không vẽ được ánh vàng nhấp nháy.
 */
(function () {
  'use strict';

  var DIST_VERY_CLOSE = 6, DIST_NEAR = 15, DIST_FAR = 30;
  var BLEAT_EVERY = 2.5;      // giây giữa các lần dê kêu
  var STEP_EVERY = 1.8;       // đơn vị thế giới giữa các tiếng bước chân
  var SHIMMER_DIST = 6;       // chỉ thấy ánh dê khi gần hơn mức này
  var CARDINAL_DEG = { north: 0, east: 90, south: 180, west: 270 };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Nhãn xa/gần — cùng ngưỡng và cùng câu chữ với cueLabel() trong rounds.js.
  function distLabel(dist) {
    if (dist === null || dist === undefined || isNaN(dist)) return 'Đang nghe…';
    if (dist < DIST_VERY_CLOSE) return 'Rất gần!';
    if (dist < DIST_NEAR) return 'Gần rồi';
    if (dist < DIST_FAR) return 'Còn xa';
    return 'Rất xa';
  }

  function injectStyle() {
    var el = document.createElement('style');
    el.id = 'sim-bitmat-style';
    el.textContent =
      '.sim-bitmat-vignette{position:fixed;inset:0;z-index:4;pointer-events:none;' +
      'background:radial-gradient(circle at 50% 50%,rgba(6,10,26,0) 0%,rgba(6,10,26,0) 16%,rgba(6,10,26,.55) 34%,rgba(4,7,20,.93) 68%,rgba(2,4,12,.97) 100%);}' +
      '.sim-bitmat-compass{position:fixed;left:50%;top:calc(118px + env(safe-area-inset-top));transform:translateX(-50%);' +
      'z-index:33;pointer-events:none;max-width:94vw;text-align:center;' +
      'background:rgba(10,14,34,.88);color:#ffe9b0;border:2px solid #8a6d3b;border-radius:4px;' +
      'box-shadow:0 3px 0 rgba(0,0,0,.35),inset 0 0 0 2px rgba(255,211,77,.18);' +
      'padding:5px 12px;font-weight:800;font-size:13.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.sim-bitmat-compass .sim-bitmat-arrow{display:inline-block;color:#ffd34d;font-size:17px;line-height:1;' +
      'margin-right:7px;text-shadow:0 0 10px rgba(255,211,77,.9);transition:transform .35s ease;vertical-align:-1px;}' +
      '.sim-bitmat-compass.sim-bitmat-goat{color:#d8f7c5;border-color:#4a7a3a;}' +
      '.sim-bitmat-compass.sim-bitmat-goat .sim-bitmat-arrow{color:#b6f09a;text-shadow:0 0 10px rgba(140,230,120,.9);}' +
      '@media (max-width:560px){.sim-bitmat-compass{font-size:12px;padding:4px 9px;top:calc(112px + env(safe-area-inset-top));}}';
    document.head.appendChild(el);
    return el;
  }

  function makeVignette() {
    var el = document.createElement('div');
    el.className = 'sim-bitmat-vignette';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }

  function makeCompass() {
    var el = document.createElement('div');
    el.className = 'sim-bitmat-compass';
    el.setAttribute('aria-hidden', 'true');
    var arrow = document.createElement('span');
    arrow.className = 'sim-bitmat-arrow';
    arrow.textContent = '▲';
    var text = document.createElement('span');
    text.className = 'sim-bitmat-text';
    text.textContent = 'Đang nghe…';
    el.appendChild(arrow);
    el.appendChild(text);
    document.body.appendChild(el);
    return { root: el, arrow: arrow, text: text };
  }

  // Ánh vàng nhấp nháy ở vị trí dê: 3 khối voxel nhỏ + 1 đèn điểm vàng.
  function makeShimmer(api) {
    var THREE = window.THREE;
    var group = new THREE.Group();
    var mat = new THREE.MeshLambertMaterial({
      color: 0xffd34d, emissive: 0xaa7710, transparent: true, opacity: 0.5
    });
    var core = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), mat);
    core.position.y = 1.1;
    group.add(core);
    var sparkMat = new THREE.MeshLambertMaterial({
      color: 0xffe9a0, emissive: 0xcc9900, transparent: true, opacity: 0.7
    });
    var s1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), sparkMat);
    s1.position.set(0.55, 1.5, 0.2);
    group.add(s1);
    var s2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), sparkMat);
    s2.position.set(-0.5, 0.8, -0.3);
    group.add(s2);
    var light = new THREE.PointLight(0xffd34d, 0, 7, 1.6);
    light.position.y = 1.4;
    group.add(light);
    group.visible = false;
    api.scene.add(group);
    return { group: group, core: core, s1: s1, s2: s2, light: light, mat: mat };
  }

  // ---------- Âm thanh (WebAudio, không file ngoài) ----------
  function makeAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ctx;
    try { ctx = new AC(); } catch (e) { return null; }
    var master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
    return { ctx: ctx, master: master };
  }

  // Một tiếng "be be" ngắn: sawtooth qua lowpass, rung nhẹ (vibrato) như dê kêu.
  function bleatOnce(audio, when, freq, dur, pan, vol) {
    var ctx = audio.ctx;
    var osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.linearRampToValueAtTime(freq * 0.82, when + dur);
    var lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 7;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 22;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 1.2;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), when + 0.04);
    gain.gain.setValueAtTime(Math.max(0.001, vol), when + dur - 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    var out = gain;
    if (ctx.createStereoPanner) {
      var panner = ctx.createStereoPanner();
      panner.pan.value = clamp(pan, -0.85, 0.85);
      gain.connect(panner);
      out = panner;
    }
    osc.connect(filter);
    filter.connect(gain);
    out.connect(audio.master);
    osc.start(when);
    lfo.start(when);
    osc.stop(when + dur + 0.05);
    lfo.stop(when + dur + 0.05);
  }

  function playBleat(sim, dirDeg, dist) {
    var audio = sim.audio;
    if (!audio) return;
    var ctx = audio.ctx;
    if (ctx.state === 'suspended') { ctx.resume(); }
    if (ctx.state !== 'running') return;
    // To dần khi dê ở gần — cùng ngưỡng với nhãn xa/gần.
    var vol;
    if (dist === null || dist === undefined || isNaN(dist)) vol = 0.2;
    else if (dist < DIST_VERY_CLOSE) vol = 0.5;
    else if (dist < DIST_NEAR) vol = 0.34;
    else if (dist < DIST_FAR) vol = 0.22;
    else vol = 0.12;
    // Pan theo thành phần đông–tây của hướng dê (quy ước giống mũi tên la bàn).
    var pan = (dirDeg === null || dirDeg === undefined || isNaN(dirDeg))
      ? 0 : Math.sin(dirDeg * Math.PI / 180);
    var t0 = ctx.currentTime + 0.02;
    bleatOnce(audio, t0, 430, 0.3, pan, vol);
    bleatOnce(audio, t0 + 0.2, 390, 0.26, pan, vol * 0.85);
  }

  // Tiếng bước chân: nhịp sine trầm rất ngắn, nhỏ.
  function playStep(sim) {
    var audio = sim.audio;
    if (!audio) return;
    var ctx = audio.ctx;
    if (ctx.state === 'suspended') { ctx.resume(); }
    if (ctx.state !== 'running') return;
    var t0 = ctx.currentTime + 0.01;
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, t0);
    osc.frequency.exponentialRampToValueAtTime(95, t0 + 0.06);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.055, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + 0.09);
  }

  // ---------- Hướng / khoảng cách tới dê ----------
  // Trả {dirDeg, dist} hoặc null khi chưa biết. Ưu tiên vị trí dê thật
  // (chơi đơn), sau đó tin cue server đã bắt được, cuối cùng đọc #cue-text.
  function senseGoat(sim, st, api) {
    var player = api.player;
    if (!player || !player.alive) return null;
    var goat = st.state && st.state.goat;
    if (goat && goat.alive && goat !== player) {
      var dx = goat.x - player.x, dz = goat.z - player.z;
      return {
        dirDeg: Math.atan2(dx, -dz) * 180 / Math.PI,
        dist: Math.hypot(dx, dz),
        goat: goat
      };
    }
    if (goat === player) return { dirDeg: null, dist: null, goat: goat };
    // Nhiều người: dê không lộ vị trí — dùng cue server (bắt qua wrapper).
    if (sim.cue && (Date.now() - sim.cue.at) < 12000) {
      return { dirDeg: sim.cue.dirDeg, dist: sim.cue.dist, goat: null };
    }
    // Dự phòng: đọc khoảng cách rounds.js đã ghi vào #cue-text.
    var txt = document.getElementById('cue-text');
    if (txt) {
      var m = /khoảng\s+(\d+(?:[.,]\d+)?)\s*bước/.exec(txt.textContent || '');
      if (m) return { dirDeg: null, dist: parseFloat(m.replace(',', '.')), goat: null };
    }
    return null;
  }

  // ---------- Áp / gỡ bầu không khí bịt mắt ----------
  function applyDark(sim, api) {
    if (sim.darkOn || !api.scene) return;
    var scene = api.scene;
    if (scene.fog) {
      sim.savedFog = {
        near: scene.fog.near, far: scene.fog.far,
        color: scene.fog.color ? scene.fog.color.getHex() : null
      };
      scene.fog.near = 4;
      scene.fog.far = 26;
      if (scene.fog.color) scene.fog.color.setHex(0x1a2340);
    } else { sim.savedFog = null; }
    if (scene.background && scene.background.getHex) {
      sim.savedBg = scene.background.getHex();
      scene.background.setHex(0x141b33);
    } else { sim.savedBg = null; }
    if (!sim.vignette) sim.vignette = makeVignette();
    sim.darkOn = true;
  }

  function restoreLight(sim, api) {
    if (!sim.darkOn) return;
    var scene = api && api.scene;
    if (scene) {
      if (scene.fog && sim.savedFog) {
        scene.fog.near = sim.savedFog.near;
        scene.fog.far = sim.savedFog.far;
        if (sim.savedFog.color !== null && scene.fog.color) {
          scene.fog.color.setHex(sim.savedFog.color);
        }
      }
      if (scene.background && scene.background.setHex && sim.savedBg !== null && sim.savedBg !== undefined) {
        scene.background.setHex(sim.savedBg);
      }
    }
    if (sim.vignette && sim.vignette.parentNode) sim.vignette.parentNode.removeChild(sim.vignette);
    sim.vignette = null;
    sim.darkOn = false;
  }

  function isSeeker(st) {
    return !(st.state && st.state.goatIsMe);
  }

  // ---------- Module ----------
  window.RoundSims = window.RoundSims || {};
  window.RoundSims['bit-mat'] = {
    build: function (st, api) {
      var sim = {
        styleEl: injectStyle(),
        compass: makeCompass(),
        shimmer: null,
        audio: makeAudio(),
        darkOn: false,
        savedFog: null,
        savedBg: null,
        vignette: null,
        bleatT: 1.2,          // kêu sớm lần đầu để người tìm nghe hướng ngay
        stepAcc: 0,
        lastX: null, lastZ: null,
        lastStepAt: 0,
        cue: null,            // {dirDeg, dist, at} từ tin cue server
        wrappedRounds: false,
        origOnServerMessage: null,
        time: 0
      };
      st.simBitMat = sim;
      try {
        if (api.scene && window.THREE) sim.shimmer = makeShimmer(api);
      } catch (e) { sim.shimmer = null; }

      // Bắt tin cue của server: rounds.js không lưu hướng cue ở đâu khác,
      // và ở nhiều người st.state.goat là null nên đây là nguồn hướng duy nhất.
      if (window.Rounds && window.Rounds.onServerMessage && !sim.wrappedRounds) {
        (function (orig) {
          sim.origOnServerMessage = orig;
          window.Rounds.onServerMessage = function (msg) {
            try {
              if (msg && msg.type === 'cue') {
                var deg = (msg.dir !== undefined && msg.dir !== null && CARDINAL_DEG[msg.dir] !== undefined)
                  ? CARDINAL_DEG[msg.dir]
                  : (typeof msg.dir === 'number' ? msg.dir : null);
                sim.cue = { dirDeg: deg, dist: (typeof msg.dist === 'number' ? msg.dist : null), at: Date.now() };
              }
            } catch (e) { /* không được làm vỡ đường tin server */ }
            return orig.apply(window.Rounds, arguments);
          };
          sim.wrappedRounds = true;
        })(window.Rounds.onServerMessage);
      }

      if (isSeeker(st)) applyDark(sim, api);
      return sim;
    },

    update: function (dt, st, api) {
      var sim = st.simBitMat;
      if (!sim) return;
      sim.time += dt;
      var player = api.player;
      var seeker = isSeeker(st);

      // Vai trò có thể đổi giữa vòng ở nhiều người (tin blind:false → mình là dê):
      // đồng bộ bầu không khí theo vai trò hiện tại mỗi khung hình.
      if (seeker) applyDark(sim, api);
      else restoreLight(sim, api);

      var sense = senseGoat(sim, st, api);

      // --- Dải la bàn ---
      if (sim.compass) {
        if (!seeker) {
          sim.compass.root.classList.add('sim-bitmat-goat');
          sim.compass.arrow.textContent = '🐐';
          sim.compass.arrow.style.transform = 'rotate(0deg)';
          sim.compass.text.textContent = 'Bạn là dê — chạy trốn, đừng để bị bắt!';
        } else {
          sim.compass.root.classList.remove('sim-bitmat-goat');
          sim.compass.arrow.textContent = '▲';
          if (sense && sense.dirDeg !== null && sense.dirDeg !== undefined && !isNaN(sense.dirDeg)) {
            sim.compass.arrow.style.transform = 'rotate(' + sense.dirDeg + 'deg)';
          }
          var label = distLabel(sense ? sense.dist : null);
          sim.compass.text.textContent = 'Nghe tiếng dê: ' + label +
            ((sense && sense.dist !== null && sense.dist !== undefined && !isNaN(sense.dist))
              ? ' (khoảng ' + Math.round(sense.dist) + ' bước)' : '');
        }
      }

      // --- Tiếng dê kêu (chỉ người tìm nghe; dê không tự nghe mình kêu) ---
      if (seeker) {
        sim.bleatT += dt;
        if (sim.bleatT >= BLEAT_EVERY) {
          sim.bleatT = 0;
          if (sense) playBleat(sim, sense.dirDeg, sense.dist);
        }
      }

      // --- Tiếng bước chân khi người chơi di chuyển ---
      if (player && player.alive) {
        if (sim.lastX === null) { sim.lastX = player.x; sim.lastZ = player.z; }
        var moved = Math.hypot(player.x - sim.lastX, player.z - sim.lastZ);
        if (moved > 0) {
          sim.stepAcc += moved;
          var now = sim.time;
          if (sim.stepAcc >= STEP_EVERY && (now - sim.lastStepAt) >= 0.28) {
            sim.stepAcc = 0;
            sim.lastStepAt = now;
            playStep(sim);
          }
        }
        sim.lastX = player.x;
        sim.lastZ = player.z;
      }

      // --- Ánh vàng nhấp nháy ở dê khi rất gần (chỉ người tìm, chỉ khi biết vị trí dê) ---
      if (sim.shimmer) {
        var show = !!(seeker && sense && sense.goat && sense.goat.alive &&
          sense.dist !== null && sense.dist !== undefined && sense.dist < SHIMMER_DIST);
        sim.shimmer.group.visible = show;
        if (show) {
          var g = sense.goat;
          sim.shimmer.group.position.set(g.x, 0, g.z);
          var pulse = 0.5 + 0.5 * Math.sin(sim.time * 5);
          sim.shimmer.mat.opacity = 0.3 + pulse * 0.35;
          sim.shimmer.core.rotation.y = sim.time * 1.6;
          sim.shimmer.core.position.y = 1.1 + Math.sin(sim.time * 3) * 0.15;
          sim.shimmer.s1.position.y = 1.5 + Math.sin(sim.time * 4 + 1) * 0.2;
          sim.shimmer.s2.position.y = 0.8 + Math.cos(sim.time * 4) * 0.18;
          sim.shimmer.light.intensity = 0.7 + pulse * 1.1;
        } else {
          sim.shimmer.light.intensity = 0;
        }
      }
    },

    teardown: function (st, api) {
      var sim = st.simBitMat;
      if (!sim) return;
      restoreLight(sim, api);
      if (sim.shimmer && api.scene) {
        try { api.scene.remove(sim.shimmer.group); } catch (e) { /* bỏ qua */ }
      }
      if (sim.compass && sim.compass.root.parentNode) sim.compass.root.parentNode.removeChild(sim.compass.root);
      if (sim.styleEl && sim.styleEl.parentNode) sim.styleEl.parentNode.removeChild(sim.styleEl);
      if (sim.audio) {
        try {
          if (sim.audio.master) sim.audio.master.disconnect();
          if (sim.audio.ctx && sim.audio.ctx.close) sim.audio.ctx.close();
        } catch (e) { /* bỏ qua */ }
        sim.audio = null;
      }
      if (sim.wrappedRounds && window.Rounds && sim.origOnServerMessage) {
        if (window.Rounds.onServerMessage && sim.origOnServerMessage) {
          window.Rounds.onServerMessage = sim.origOnServerMessage;
        }
        sim.wrappedRounds = false;
        sim.origOnServerMessage = null;
      }
      st.simBitMat = null;
    }
  };
})();
