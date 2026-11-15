(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    wipe: function () { try { ['td_mood','td_screen','td_hist','sk_mood','sk_screen'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} }
  };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

  /* ---------- Navigasi ---------- */
  var views = ['beranda', 'cek', 'mood', 'latihan', 'bantuan', 'tentang'];
  function route() {
    var h = (location.hash || '#beranda').slice(1);
    if (views.indexOf(h) < 0) h = 'beranda';
    views.forEach(function (v) { $('#' + v).classList.toggle('on', v === h); });
    document.querySelectorAll('.top nav a').forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('href') === '#' + h);
      if (a.classList.contains('on')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (h !== 'beranda' && h !== 'latihan') stopAll();
    if (h === 'mood') renderMood();
    if (h === 'cek') renderHist();
    window.scrollTo(0, 0);
    reveal($('#' + h));
  }
  window.addEventListener('hashchange', route);

  /* ---------- Napas berpemandu (4-4-6) ---------- */
  var phases = [['Tarik napas', 4, 1], ['Tahan', 4, 1], ['Hembuskan', 6, .62]];
  var instances = [];
  function mountBreath(host) {
    if (!host || host.firstChild) return;
    var orb = el('div', 'orb'), label = el('span', '', 'Siap?');
    orb.appendChild(label);
    var cue = el('div', 'cue'); cue.setAttribute('aria-live', 'polite');
    var btn = el('button', 'btn', 'Mulai bernapas'); btn.type = 'button';
    host.appendChild(orb); host.appendChild(cue); host.appendChild(btn);
    var timer = null, i = 0, running = false;
    function step() {
      var p = phases[i % 3];
      label.textContent = p[0]; cue.textContent = p[0] + ' ' + p[1] + ' hitungan';
      orb.style.transition = 'transform ' + (p[0] === 'Tahan' ? 0 : p[1]) + 's ease-in-out';
      orb.style.transform = 'scale(' + p[2] + ')';
      i++; timer = setTimeout(step, p[1] * 1000);
    }
    function stop() {
      running = false; clearTimeout(timer); i = 0;
      orb.style.transition = 'transform 1s ease'; orb.style.transform = 'scale(.62)';
      label.textContent = 'Siap?'; cue.textContent = ''; btn.textContent = 'Mulai bernapas';
    }
    btn.addEventListener('click', function () {
      if (running) { stop(); return; }
      instances.forEach(function (x) { x.stop(); });
      running = true; btn.textContent = 'Berhenti'; step();
    });
    instances.push({ stop: stop });
  }
  function stopAll() { instances.forEach(function (x) { x.stop(); }); }

  /* ---------- Cek kondisi (PHQ-9) ---------- */
  var Q = [
    'Kurang tertarik atau kurang senang melakukan sesuatu',
    'Merasa sedih, murung, atau putus asa',
    'Sulit tidur, tidur terlalu lama, atau sering terbangun',
    'Merasa lelah atau kurang berenergi',
    'Nafsu makan menurun atau makan berlebihan',
    'Merasa buruk tentang diri sendiri, atau merasa gagal',
    'Sulit berkonsentrasi, misalnya saat membaca atau kuliah',
    'Bergerak atau berbicara sangat lambat, atau justru gelisah dan tidak bisa diam',
    'Terpikir bahwa lebih baik tidak ada lagi, atau terpikir menyakiti diri sendiri'
  ];
  var OPT = ['Tidak pernah', 'Beberapa hari', 'Lebih dari separuh hari', 'Hampir setiap hari'];
  var LEVELS = [
    [4, 'Gejala minimal', 'Saat ini gejalamu tergolong minimal. Pertahankan rutinitas tidur, gerak, dan bercerita pada orang terpercaya.'],
    [9, 'Gejala ringan', 'Ada beberapa gejala yang perlu diperhatikan. Coba catat mood setiap hari dan lakukan latihan napas. Jika berlanjut lebih dari dua minggu, pertimbangkan bicara dengan konselor.'],
    [14, 'Gejala sedang', 'Gejalamu cukup terasa. Sebaiknya bicara dengan konselor kampus atau tenaga profesional, sambil tetap menjaga rutinitas dan latihan yang membantumu tenang.'],
    [19, 'Gejala cukup berat', 'Gejalamu cukup berat. Kami menyarankan kamu segera menghubungi tenaga profesional atau layanan bantuan.'],
    [27, 'Gejala berat', 'Gejalamu berat. Mohon segera hubungi tenaga profesional atau layanan bantuan. Kamu layak mendapat dukungan.']
  ];
  function updateProgress() {
    var d = new FormData($('#qform')), n = 0;
    Q.forEach(function (_, i) { if (d.get('q' + i) !== null) n++; });
    $('#pbar').style.width = (n / Q.length * 100) + '%';
    $('#ptxt').textContent = n + ' dari ' + Q.length + ' terjawab';
    $('#prog').setAttribute('aria-valuenow', n);
  }
  function buildForm() {
    var f = $('#qform'); if (f.children.length) return;
    Q.forEach(function (q, i) {
      var fs = el('fieldset', 'qcard rv'), lg = el('legend'); lg.appendChild(el('span', 'qlabel', 'Pertanyaan ' + (i + 1) + ' dari ' + Q.length)); lg.appendChild(el('span', 'qtext', q));
      var box = el('div', 'opts');
      OPT.forEach(function (o, v) {
        var lb = el('label'), inp = el('input'), sp = el('span', '', o);
        inp.type = 'radio'; inp.name = 'q' + i; inp.value = v; inp.required = true;
        lb.appendChild(inp); lb.appendChild(sp); box.appendChild(lb);
      });
      fs.appendChild(lg); fs.appendChild(box); f.appendChild(fs);
    });
    var b = el('button', 'btn', 'Lihat hasil'); b.type = 'submit'; f.appendChild(b);
    f.addEventListener('change', updateProgress);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var total = 0, d = new FormData(f);
      Q.forEach(function (_, i) { total += parseInt(d.get('q' + i), 10) || 0; });
      var risk = parseInt(d.get('q8'), 10) > 0;
      var now = new Date().toISOString();
      store.set('td_screen', { score: total, risk: risk, date: now });
      var hist = store.get('td_hist', []); hist.push({ s: total, r: risk, d: now });
      store.set('td_hist', hist.slice(-20));
      showResult(total, risk); renderHist();
    });
  }
  function showResult(total, risk) {
    var lv = LEVELS.filter(function (l) { return total <= l[0]; })[0];
    var r = $('#result'); r.hidden = false; r.innerHTML = '';
    var high = risk || total >= 15; r.className = 'result' + (high ? ' high' : '');
    r.appendChild(el('h2', '', lv[1] + ' (skor ' + total + ' dari 27)'));
    r.appendChild(el('p', '', lv[2]));
    if (risk) r.appendChild(el('p', '', 'Kamu menjawab bahwa pernah terpikir untuk tidak ada lagi atau menyakiti diri sendiri. Terima kasih sudah jujur. Perasaan itu layak didengar. Tolong hubungi seseorang yang kamu percaya atau layanan bantuan sekarang. Jika kamu dalam bahaya, hubungi 112.'));
    var row = el('p', 'row');
    var a1 = el('a', 'btn', 'Lihat layanan bantuan'); a1.href = '#bantuan';
    var a2 = el('a', 'btn ghost', 'Coba latihan napas'); a2.href = '#latihan';
    row.appendChild(a1); row.appendChild(a2); r.appendChild(row);
    r.appendChild(el('p', 'note', 'Hasil ini bukan diagnosis. Hanya tenaga profesional yang dapat menilai kondisimu secara menyeluruh.'));
    r.focus(); r.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Mood & jurnal ---------- */
  var MOODS = [['😣', 'Berat'], ['😕', 'Kurang baik'], ['😐', 'Biasa'], ['🙂', 'Baik'], ['😄', 'Sangat baik']];
  var TRIG = ['Tugas / skripsi', 'Tidur kurang', 'Keuangan', 'Relasi', 'Kesehatan', 'Lainnya'];
  var TIPS = {
    'Tugas / skripsi': 'Pecah tugas menjadi blok 25 menit dengan jeda 5 menit, lalu tulis tiga prioritas untuk besok.',
    'Tidur kurang': 'Coba jam tidur tetap, jauhkan ponsel 30 menit sebelum tidur, dan lakukan napas 4-4-6.',
    'Keuangan': 'Tulis pengeluaran seminggu dan bicarakan dengan bagian kemahasiswaan jika butuh dukungan.',
    'Relasi': 'Ceritakan pada satu orang yang kamu percaya. Berbicara sering meringankan beban.',
    'Kesehatan': 'Jika keluhan fisik berlanjut, periksakan ke layanan kesehatan kampus atau puskesmas.',
    'Lainnya': 'Tulis apa yang mengganggu di jurnal, lalu coba grounding 5-4-3-2-1.'
  };
  var pick = null, picked = [];
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function buildMood() {
    var m = $('#moods');
    MOODS.forEach(function (x, i) {
      var lb = el('label'), inp = el('input'), sp = el('span'), b = el('b', '', x[0]);
      inp.type = 'radio'; inp.name = 'mood'; inp.value = i + 1;
      inp.addEventListener('change', function () { pick = i + 1; });
      sp.appendChild(b); sp.appendChild(document.createTextNode(x[1]));
      lb.appendChild(inp); lb.appendChild(sp); m.appendChild(lb);
    });
    var t = $('#trig');
    TRIG.forEach(function (x) {
      var lb = el('label'), inp = el('input'), sp = el('span', '', x);
      inp.type = 'checkbox'; inp.value = x;
      inp.addEventListener('change', function () {
        picked = Array.prototype.map.call(t.querySelectorAll('input:checked'), function (i) { return i.value; });
      });
      lb.appendChild(inp); lb.appendChild(sp); t.appendChild(lb);
    });
    $('#save').addEventListener('click', function () {
      var s = $('#saved');
      if (!pick) { s.textContent = 'Pilih mood dulu.'; return; }
      var list = store.get('td_mood', []).filter(function (e) { return e.d !== today(); });
      list.push({ d: today(), m: pick, t: picked.slice(), n: $('#note').value.slice(0, 300) });
      store.set('td_mood', list);
      s.textContent = 'Tersimpan. Terima kasih sudah mencatat.';
      renderMood();
    });
  }
  function renderMood() {
    var list = store.get('td_mood', []), chart = $('#chart'); chart.innerHTML = '';
    var map = {}; list.forEach(function (e) { map[e.d] = e; });
    for (var k = 6; k >= 0; k--) {
      var d = new Date(); d.setDate(d.getDate() - k);
      var key = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      var e = map[key], bar = el('div', 'bar'), i = el('i');
      i.style.height = e ? (e.m * 20) + '%' : '4px';
      if (!e) i.className = 'empty'; else if (e.m <= 2) i.className = 'low';
      i.title = e ? MOODS[e.m - 1][1] : 'Belum diisi';
      bar.appendChild(i); bar.appendChild(el('span', '', ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()]));
      chart.appendChild(bar);
    }
    chart.setAttribute('aria-label', 'Grafik mood 7 hari terakhir. ' + list.length + ' hari tercatat.');
    renderInsight(list);
  }
  function renderInsight(list) {
    var box = $('#insight'); box.innerHTML = '';
    if (list.length < 3) { box.appendChild(el('p', '', 'Isi mood minimal 3 hari untuk melihat pola dan saran dari Teduh.')); return; }
    var recent = list.slice().sort(function (a, b) { return a.d < b.d ? 1 : -1; }).slice(0, 14);
    var avg = recent.reduce(function (s, e) { return s + e.m; }, 0) / recent.length;
    box.appendChild(el('p', '', 'Rata-rata mood ' + recent.length + ' hari terakhir: ' + avg.toFixed(1) + ' dari 5.'));
    var cnt = {}; recent.filter(function (e) { return e.m <= 2; }).forEach(function (e) { e.t.forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; }); });
    var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
    if (top) {
      box.appendChild(el('p', '', 'Pemicu yang paling sering muncul saat moodmu rendah: ' + top + ' (' + cnt[top] + ' kali).'));
      box.appendChild(el('p', '', 'Saran: ' + TIPS[top]));
    } else if (avg >= 3.5) {
      box.appendChild(el('p', '', 'Moodmu cenderung stabil. Pertahankan kebiasaan yang bekerja untukmu.'));
    }
    var sc = store.get('td_screen', null);
    if (avg < 2.5 || (sc && sc.score >= 10)) {
      var p = el('p', '', 'Moodmu belakangan sering rendah. Pertimbangkan berbicara dengan konselor. '), a = el('a', '', 'Lihat layanan bantuan'); a.href = '#bantuan';
      p.appendChild(a); box.appendChild(p);
    }
    var notes = recent.filter(function (e) { return e.n; }).slice(0, 2);
    notes.forEach(function (e) { box.appendChild(el('p', 'note', e.d + ': ' + e.n)); });
  }

  /* ---------- Efek riak saat tombol ditekan ---------- */
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest('.btn,.sos'); if (!b) return;
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), x = document.createElement('span');
    x.className = 'ripple'; x.style.width = x.style.height = s + 'px';
    x.style.left = (e.clientX - r.left - s / 2) + 'px'; x.style.top = (e.clientY - r.top - s / 2) + 'px';
    b.appendChild(x); setTimeout(function () { x.remove(); }, 650);
  });

  /* ---------- Efek 3D ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mouse = { x: 0, y: 0 }, mqueued = false;
  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX / window.innerWidth * 2 - 1;
    mouse.y = e.clientY / window.innerHeight * 2 - 1;
    if (reduce || mqueued) return;
    mqueued = true;
    requestAnimationFrame(function () {
      mqueued = false;
      document.documentElement.style.setProperty('--mx', mouse.x.toFixed(3));
      document.documentElement.style.setProperty('--my', mouse.y.toFixed(3));
    });
  }, { passive: true });

  /* Muncul perlahan saat terlihat */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 }) : null;
  function reveal(root) {
    if (!root) return;
    root.querySelectorAll('.rv').forEach(function (n) {
      if (!io || reduce) { n.classList.add('in'); return; }
      n.classList.remove('in'); io.observe(n);
    });
  }

  /* Kartu miring mengikuti kursor */
  function initTilt() {
    if (reduce || !window.matchMedia('(hover: hover)').matches) return;
    document.querySelectorAll('[data-tilt]').forEach(function (n) {
      n.addEventListener('pointermove', function (e) {
        var r = n.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        n.style.setProperty('--ry', ((px - .5) * 14).toFixed(2) + 'deg');
        n.style.setProperty('--rx', ((.5 - py) * 14).toFixed(2) + 'deg');
        n.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        n.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      n.addEventListener('pointerleave', function () {
        n.style.setProperty('--rx', '0deg'); n.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* Bola partikel 3D (canvas, tanpa library) */
  function hero3D(cv) {
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
    var pts = [], N = 820, GA = Math.PI * (3 - Math.sqrt(5)), k, j;
    for (k = 0; k < N; k++) {
      var y = 1 - (k / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = GA * k;
      pts.push({ x: Math.cos(th) * r, y: y, z: Math.sin(th) * r, s: 0.7 + Math.random() * 0.9, ring: 0 });
    }
    [[1.55, 0.5, 170], [1.9, -0.9, 150]].forEach(function (c, idx) {
      for (j = 0; j < c[2]; j++) {
        var a = j / c[2] * Math.PI * 2, cx = Math.cos(a) * c[0], cz = Math.sin(a) * c[0];
        var cy = cz * Math.sin(c[1]); cz = cz * Math.cos(c[1]);
        pts.push({ x: cx, y: cy, z: cz, s: 0.8 + Math.random() * 0.6, ring: idx + 1 });
      }
    });
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    var sx = 0, sy = 0, running = false, raf = 0, t0 = performance.now();
    function frame(now) {
      var t = (now - t0) / 1000;
      sx += (mouse.x - sx) * 0.05; sy += (mouse.y - sy) * 0.05;
      var ay = t * 0.14 + sx * 0.7, ax = 0.32 + sy * 0.45;
      var cy_ = Math.cos(ay), sy_ = Math.sin(ay), cx_ = Math.cos(ax), sx_ = Math.sin(ax);
      var breath = 1 + 0.07 * Math.sin(t * Math.PI * 2 / 14);
      var R = Math.min(W, H) * 0.27 * breath, cx = W / 2, cy = H / 2;
      ctx.clearRect(0, 0, W, H);
      var light = false;
      ctx.globalCompositeOperation = 'source-over';
      var g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.1);
      g.addColorStop(0, light ? 'rgba(63,181,148,.22)' : 'rgba(63,181,148,.30)'); g.addColorStop(.5, light ? 'rgba(154,134,245,.12)' : 'rgba(154,134,245,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], d = 1;
        if (!p.ring) d = 1 + 0.07 * Math.sin(3 * p.x + t * 1.1) * Math.cos(3 * p.y - t * 0.9);
        var x = p.x * d, y = p.y * d, z = p.z * d;
        var x1 = x * cy_ + z * sy_, z1 = -x * sy_ + z * cy_;
        var y1 = y * cx_ - z1 * sx_, z2 = y * sx_ + z1 * cx_;
        var f = 3.4 / (3.4 - z2), px = cx + x1 * R * f, py = cy + y1 * R * f;
        var depth = (z2 + 1.6) / 3.2, a = light ? 0.25 + depth * 0.7 : 0.15 + depth * 0.85;
        var hue = p.ring === 1 ? 28 : p.ring === 2 ? 262 : 158 + (y + 1) * 52;
        ctx.fillStyle = 'hsla(' + hue.toFixed(0) + ',85%,' + (light ? 36 + depth * 12 : 62 + depth * 14).toFixed(0) + '%,' + a.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(px, py, p.s * f * (W / 360 + 0.6), 0, 6.2832); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (running) raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduce) return; size(); running = true; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    size();
    window.addEventListener('resize', function () { size(); if (!running) frame(performance.now()); });
    if (reduce) { frame(performance.now()); return; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(cv);
    } else start();
  }

  /* ---------- Nomor bantuan: telepon di HP, salin di komputer ---------- */
  var toast = el('div', 'toast'); toast.setAttribute('role', 'status'); document.body.appendChild(toast);
  var tt = null;
  function say(msg) { toast.textContent = msg; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 3500); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="tel:"]'); if (!a) return;
    var num = a.getAttribute('href').slice(4);
    var mobile = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile) return; /* di HP, biarkan membuka aplikasi telepon */
    e.preventDefault();
    var done = function () { say('Nomor ' + num + ' disalin. Hubungi lewat telepon atau aplikasi panggilan kamu.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(num).then(done, function () { say('Hubungi nomor ' + num + ' lewat telepon kamu.'); });
    else say('Hubungi nomor ' + num + ' lewat telepon kamu.');
  });

  /* ---------- Riwayat hasil cek ---------- */
  function fmtDate(iso, short) {
    try { return new Date(iso).toLocaleDateString('id-ID', short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return iso.slice(0, 10); }
  }
  function levelName(total) { return LEVELS.filter(function (l) { return total <= l[0]; })[0][1]; }
  function renderHist() {
    var box = $('#histbox'), list = store.get('td_hist', []), out = $('#hist');
    if (!list.length) { box.hidden = true; return; }
    box.hidden = false; out.innerHTML = '';
    var wrap = el('div', 'hbars'); wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', 'Grafik skor ' + Math.min(list.length, 10) + ' cek terakhir');
    list.slice(-10).forEach(function (e) {
      var b = el('div', 'hb'), i = el('i');
      i.style.height = Math.max(6, e.s / 27 * 100) + '%';
      if (e.s >= 15 || e.r) i.className = 'hi';
      i.title = 'Skor ' + e.s; b.appendChild(i); b.appendChild(el('span', '', fmtDate(e.d, true)));
      wrap.appendChild(b);
    });
    out.appendChild(wrap);
    if (list.length >= 2) {
      var a = list[list.length - 2].s, c = list[list.length - 1].s, diff = c - a, t;
      if (diff < 0) t = 'Skor turun ' + (-diff) + ' poin dibanding cek sebelumnya.';
      else if (diff > 0) t = 'Skor naik ' + diff + ' poin dibanding cek sebelumnya. Jika terasa berat, pertimbangkan bicara dengan konselor.';
      else t = 'Skor sama dengan cek sebelumnya.';
      out.appendChild(el('p', 'htrend', t));
    }
    var ul = el('ul', 'hlist');
    list.slice().reverse().forEach(function (e) {
      var li = el('li'); li.appendChild(el('span', '', fmtDate(e.d)));
      li.appendChild(el('b', '', levelName(e.s) + ' · skor ' + e.s));
      ul.appendChild(li);
    });
    out.appendChild(ul);
  }
  $('#clearhist').addEventListener('click', function () {
    if (confirm('Hapus semua riwayat hasil cek di perangkat ini?')) { store.set('td_hist', []); renderHist(); }
  });

  /* ---------- Ringkasan mood: unduh & cetak ---------- */
  function moodData() {
    var list = store.get('td_mood', []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }).slice(-14);
    if (!list.length) return null;
    var avg = list.reduce(function (s, e) { return s + e.m; }, 0) / list.length, cnt = {};
    list.forEach(function (e) { e.t.forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; }); });
    var tops = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 3).map(function (k) { return k + ' (' + cnt[k] + 'x)'; });
    var sc = store.get('td_hist', []); sc = sc.length ? sc[sc.length - 1] : null;
    return { list: list, avg: avg, tops: tops, sc: sc };
  }
  function reportText(d) {
    var L = ['RINGKASAN MOOD – TEDUH', 'Dibuat: ' + fmtDate(new Date().toISOString()), 'Periode: ' + fmtDate(d.list[0].d) + ' s.d. ' + fmtDate(d.list[d.list.length - 1].d), ''];
    L.push('Rata-rata mood: ' + d.avg.toFixed(1) + ' dari 5 (' + d.list.length + ' hari tercatat)');
    L.push('Pemicu tersering: ' + (d.tops.length ? d.tops.join(', ') : '-'));
    if (d.sc) L.push('Cek kondisi terakhir (' + fmtDate(d.sc.d) + '): skor ' + d.sc.s + ' dari 27, ' + levelName(d.sc.s));
    L.push('', 'CATATAN HARIAN');
    d.list.forEach(function (e) {
      L.push(fmtDate(e.d) + ' | ' + MOODS[e.m - 1][1] + ' | ' + (e.t.length ? e.t.join(', ') : '-') + (e.n ? ' | ' + e.n : ''));
    });
    L.push('', 'Catatan: ringkasan ini dibuat sendiri oleh pengguna lewat Teduh. Bukan diagnosis dan tidak menggantikan penilaian tenaga profesional.');
    return L.join('\n');
  }
  function noData() { var s = $('#saved'); s.textContent = 'Belum ada catatan mood untuk diunduh.'; }
  $('#dl').addEventListener('click', function () {
    var d = moodData(); if (!d) { noData(); return; }
    var blob = new Blob([reportText(d)], { type: 'text/plain;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'ringkasan-mood-teduh.txt';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('#pr').addEventListener('click', function () {
    var d = moodData(); if (!d) { noData(); return; }
    var r = $('#report'); r.innerHTML = '';
    r.appendChild(el('h1', '', 'Ringkasan Mood – Teduh'));
    r.appendChild(el('p', '', 'Dibuat ' + fmtDate(new Date().toISOString()) + ' · Periode ' + fmtDate(d.list[0].d) + ' s.d. ' + fmtDate(d.list[d.list.length - 1].d)));
    r.appendChild(el('p', '', 'Rata-rata mood: ' + d.avg.toFixed(1) + ' dari 5 (' + d.list.length + ' hari tercatat). Pemicu tersering: ' + (d.tops.length ? d.tops.join(', ') : '-') + '.'));
    if (d.sc) r.appendChild(el('p', '', 'Cek kondisi terakhir (' + fmtDate(d.sc.d) + '): skor ' + d.sc.s + ' dari 27, ' + levelName(d.sc.s) + '.'));
    r.appendChild(el('h2', '', 'Catatan harian'));
    var tb = el('table'), th = el('tr');
    ['Tanggal', 'Mood', 'Pemicu', 'Catatan'].forEach(function (x) { th.appendChild(el('th', '', x)); });
    tb.appendChild(th);
    d.list.forEach(function (e) {
      var tr = el('tr');
      [fmtDate(e.d), MOODS[e.m - 1][0] + ' ' + MOODS[e.m - 1][1], e.t.join(', ') || '-', e.n || '-'].forEach(function (x) { tr.appendChild(el('td', '', x)); });
      tb.appendChild(tr);
    });
    r.appendChild(tb);
    r.appendChild(el('p', '', 'Ringkasan ini dibuat sendiri oleh pengguna lewat Teduh. Bukan diagnosis dan tidak menggantikan penilaian tenaga profesional.')).className = 'note';
    window.print();
  });

  /* ---------- Offline (service worker) ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  /* ---------- Init ---------- */
  mountBreath($('#b2'));
  buildForm(); buildMood();
  initTilt(); hero3D($('#hero3d'));
  $('#wipe').addEventListener('click', function () {
    if (confirm('Hapus semua data Teduh di perangkat ini?')) { store.wipe(); renderMood(); renderHist(); $('#result').hidden = true; alert('Data sudah dihapus.'); }
  });
  route();
})();