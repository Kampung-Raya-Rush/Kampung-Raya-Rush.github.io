/* =====================================================================
   GAME.JS — the game engine.
   You do NOT need to edit this file. All text lives in game-config.js.

   HOW IT WORKS (short version)
   - The route is a list of pages ("steps") in game-config.js.
   - Some pages need a QR code: the QR opens  index.html#cp1 / #cp2 / ...
   - Progress is saved in the phone's localStorage (small text only, never photos).
   - Sign-up and the finish are sent to your Google Sheet (serverURL), which
     stamps the times, works out 1st / 2nd / 3rd and hands out the winner codes.
   - Photos are processed on the phone with an HTML canvas and never uploaded.
   ===================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');

  if (typeof GAME_CONFIG === 'undefined') {
    app.innerHTML = '<div class="screen"><h1 class="big sm">Config missing</h1><p>js/game-config.js did not load. Check the file is in the js folder.</p></div>';
    return;
  }

  var C = GAME_CONFIG;
  var STEPS = C.steps || [];
  var STOPS = C.stops || [];
  var DEBUG = C.debugAllowed !== false && new URLSearchParams(location.search).get('debug') === 'true';
  var STORE = C.storageKey || 'kampungRayaRush_v2';
  var PT = C.photoText || {};
  var FONT = "'Arial Black','Helvetica Neue',Arial,sans-serif";
  var UA = navigator.userAgent || '';
  var IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat|WhatsApp|Twitter/i.test(UA);

  // which page each QR code opens
  var QR_IDX = {};
  STEPS.forEach(function (s, i) { if (s.qr) QR_IDX[s.qr] = i; });

  document.title = C.eventName || document.title;

  /* ------------------------------------------------------------------
     SMALL HELPERS
     ------------------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function tpl(s, extra) {
    s = String(s == null ? '' : s)
      .replace(/\{hashtag\}/g, C.eventHashtag || '')
      .replace(/\{eventName\}/g, C.eventName || '');
    if (extra) Object.keys(extra).forEach(function (k) { s = s.split('{' + k + '}').join(extra[k]); });
    return s;
  }
  function rich(s, extra) { return esc(tpl(s, extra)).replace(/\n/g, '<br>'); }

  // Normalise an answer: lowercase, no punctuation, single spaces
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[.,!?;:"'`‘’“”]/g, '')
      .replace(/\s+/g, ' ').trim();
  }
  function squash(s) { return norm(s).replace(/[\s\-_]/g, ''); }
  function matches(input, accepted) {
    var a = norm(input), b = squash(input);
    if (!a) return false;
    return (accepted || []).some(function (x) { return norm(x) === a || squash(x) === b; });
  }
  function words(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, ' ').trim().split(' ').filter(Boolean);
  }

  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtDuration(ms) {
    var t = Math.max(0, Math.floor((ms || 0) / 1000));
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s);
  }
  function ordinal(n) {
    var s = (n % 100 >= 11 && n % 100 <= 13) ? 'TH' : ({ 1: 'ST', 2: 'ND', 3: 'RD' }[n % 10] || 'TH');
    return n + s;
  }

  /* ---- timers that are cleaned up on every screen change ---- */
  var timers = [], cleanups = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function every(fn, ms) { var t = setInterval(fn, ms); timers.push(t); return t; }
  function cleanup() {
    timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    timers = [];
    cleanups.forEach(function (f) { try { f(); } catch (e) {} });
    cleanups = [];
  }

  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.hidden = true; }, 2800);
  }

  /* ------------------------------------------------------------------
     SAVED PROGRESS (localStorage — text only)
     ------------------------------------------------------------------ */
  function blank() {
    return {
      step: 0, arrived: {}, solved: {}, fails: {}, checks: {}, answers: {}, photos: {},
      clueSeen: {}, poemEnd: {}, player: null, finish: null
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) return Object.assign(blank(), JSON.parse(raw));
    } catch (e) {}
    return blank();
  }
  var state = load();
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }

  function started() { return !!state.player; }
  function elapsed() {
    if (!state.player) return 0;
    if (state.finish && state.finish.totalMs != null) return state.finish.totalMs;
    return Date.now() + (state.player.offset || 0) - state.player.startMs;
  }

  /* ------------------------------------------------------------------
     TALKING TO THE GOOGLE SHEET  (serverURL in game-config.js)
     ------------------------------------------------------------------ */
  function post(body) {
    // text/plain avoids the browser's extra "preflight" request, which
    // Google Apps Script can't answer.
    var ctl = window.AbortController ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, 25000) : null;
    return fetch(C.serverURL, {
      method: 'POST', body: JSON.stringify(body), redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (t) clearTimeout(t);
      if (!j || !j.ok) { var e = new Error((j && j.error) || 'server'); e.code = j && j.error; throw e; }
      return j;
    }, function (e) { if (t) clearTimeout(t); throw e; });
  }
  function ping(stepId, n) {
    if (!C.serverURL || !state.player || state.player.local) return;
    post({ action: 'progress', id: state.player.id, step: stepId, n: n }).catch(function () {});
  }

  /* ------------------------------------------------------------------
     ROUTING
     ------------------------------------------------------------------ */
  function getRoute() { return (location.hash || '').replace('#', '').toLowerCase().trim(); }
  function go(r) { if (getRoute() === r) render(); else location.hash = r; }
  function goHome() {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    render();
  }
  window.addEventListener('hashchange', render);

  /* ------------------------------------------------------------------
     SCREEN WRAPPER, PROGRESS BAR, TIMER
     ------------------------------------------------------------------ */
  function progressHTML() {
    var cur = state.finish ? STOPS.length : STOPS.indexOf((STEPS[state.step] || {}).stop);
    var html = '';
    STOPS.forEach(function (k, i) {
      var last = i === STOPS.length - 1;
      var cls = i < cur ? 'done' : (i === cur ? 'current' : 'locked');
      html += '<span class="node ' + (last ? 'final ' : '') + cls + '" title="' + esc(k) + '">' +
        (i < cur ? (last ? '★' : '✓') : (last ? '?' : '')) + '</span>' +
        (last ? '' : '<span class="link ' + (i < cur ? 'done' : '') + '"></span>');
    });
    var label = STOPS[Math.min(cur, STOPS.length - 1)] || '';
    return '<div class="progress-wrap" aria-label="Progress: ' + esc(label) + '">' +
           '<div class="pcount">' + esc(label) + '</div><div class="progress">' + html + '</div></div>';
  }

  var currentHints = [];
  function show(html, opts) {
    opts = opts || {};
    app.innerHTML = '<section class="screen ' + (opts.cls || '') + '">' +
      (opts.noProgress ? '' : progressHTML()) + html + '</section>';
    currentHints = opts.hints || [];
    window.scrollTo(0, 0);
  }

  function hintsHTML(hints) {
    if (!hints || !hints.length) return '';
    return '<div class="hints">' + hints.map(function (h, i) {
      return '<details class="hint"><summary>HINT ' + (i + 1) + '</summary><p>' + rich(h) + '</p></details>';
    }).join('') + '</div>';
  }
  function head(s) {
    return '<div class="eyebrow">' + esc(C.eventName) + '</div><h1 class="big sm">' + rich(s.title) + '</h1>';
  }

  // The running clock in the corner
  var pill = document.createElement('div');
  pill.id = 'timerPill'; pill.className = 'timer-pill'; pill.hidden = true;
  pill.setAttribute('aria-hidden', 'true');
  document.body.appendChild(pill);
  function tick() {
    var on = started() && !state.finish;
    pill.hidden = !on;
    if (on) pill.textContent = '⏱ ' + fmtDuration(elapsed());
    var big = $('#bigClock');
    if (big) big.textContent = fmtDuration(elapsed());
  }
  setInterval(tick, 1000);

  /* ------------------------------------------------------------------
     QUESTION FORMS
     ------------------------------------------------------------------ */
  function questionsHTML(setId, qs) {
    var solved = state.solved[setId] || {};
    return qs.map(function (q, i) {
      var sv = solved[i], isSolved = sv !== undefined, input;
      if (q.type === 'choice') {
        input = '<div class="choices" role="radiogroup">' + q.options.map(function (o, j) {
          return '<label class="choice"><input type="radio" name="' + setId + '-' + i + '" value="' + esc(o) + '"' +
            (isSolved ? ' disabled' : '') + (isSolved && norm(sv) === norm(o) ? ' checked' : '') + '>' +
            '<span><b>' + 'ABCDEFGH'.charAt(j) + '.</b> ' + esc(o) + '</span></label>';
        }).join('') + '</div>';
      } else {
        input = '<input class="field" type="text" name="' + setId + '-' + i + '" autocomplete="off" autocapitalize="none" ' +
          'autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="' + esc(q.placeholder || 'Your answer') + '" ' +
          'value="' + (isSolved ? esc(sv) : '') + '"' + (isSolved ? ' readonly' : '') + '>';
      }
      return '<div class="q ' + (isSolved ? 'ok' : '') + '" data-i="' + i + '">' +
        '<div class="q-label">' + (qs.length > 1 ? 'QUESTION ' + (i + 1) : 'ANSWER') + (isSolved ? ' ✓' : '') + '</div>' +
        '<p class="q-text">' + rich(q.prompt) + '</p>' + input + '</div>';
    }).join('');
  }

  function readAnswer(setId, i, q) {
    var el = q.type === 'choice'
      ? $('input[name="' + setId + '-' + i + '"]:checked', app)
      : $('input[name="' + setId + '-' + i + '"]', app);
    return el ? el.value : '';
  }

  function checkSet(setId, qs) {
    state.solved[setId] = state.solved[setId] || {};
    var all = true;
    qs.forEach(function (q, i) {
      var box = $('.q[data-i="' + i + '"]', app);
      if (state.solved[setId][i] !== undefined) return;
      var v = readAnswer(setId, i, q);
      box.classList.remove('bad');
      if (matches(v, q.acceptedAnswers)) {
        state.solved[setId][i] = v;
        box.classList.add('ok');
        $$('input', box).forEach(function (x) { if (x.type === 'radio') x.disabled = true; else x.readOnly = true; });
      } else {
        all = false;
        void box.offsetWidth;          // restart the shake animation
        box.classList.add('bad');
      }
    });
    save();
    return all;
  }

  function bindQuestionForm(setId, qs, wrongMsg, onPass) {
    var btn = $('#submitBtn'), msg = $('#qmsg'), busy = false;
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      if (busy) return;                       // blocks double taps
      busy = true; btn.disabled = true; btn.textContent = 'CHECKING…';
      later(function () {
        if (checkSet(setId, qs)) {
          msg.className = 'msg good'; msg.textContent = '✓';
          onPass();
        } else {
          msg.className = 'msg bad'; msg.textContent = tpl(wrongMsg || 'Not quite. Look around again.');
          busy = false; btn.disabled = false; btn.textContent = label;
        }
      }, 450);
    });
    $$('.field', app).forEach(function (f) {
      f.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); f.blur(); btn.click(); }
      });
    });
  }

  /* ------------------------------------------------------------------
     MOVING THROUGH THE ROUTE
     ------------------------------------------------------------------ */
  var justCompleted = null;
  function completeStep(i) {
    var s = STEPS[i], next = STEPS[i + 1];
    state.step = i + 1; save();
    ping(s.id, i + 1);
    if (s.clue || (next && next.qr)) justCompleted = i;
    else if (s.doneTitle) toast(tpl(s.doneTitle));
    render();
  }

  /* ------------------------------------------------------------------
     SCREENS
     ------------------------------------------------------------------ */
  function screenIntro() {
    var t = C.intro;
    show('<div class="intro"><div class="eyebrow">' + esc(C.eventName) + '</div>' +
      '<h1 class="big mega">' + rich(t.headline) + '</h1>' +
      '<p class="lead">' + rich(t.sub) + '</p>' +
      '<button class="btn primary pulse" id="startBtn" type="button">' + esc(t.button) + '</button>' +
      '<p class="tagline">' + rich(t.footer) + '</p></div>', { noProgress: true });
    $('#startBtn').addEventListener('click', function () { go('signup'); });
  }

  function screenSignup() {
    var S = C.signup, draft = state.signupDraft || {};
    var fields = S.fields.map(function (f) {
      return '<div class="q" data-k="' + esc(f.key) + '"><div class="q-label">' + esc(f.label) + '</div>' +
        '<input class="field" name="' + esc(f.key) + '" type="' + (f.type || 'text') + '" maxlength="60" ' +
        (f.type === 'tel' ? 'inputmode="tel" autocomplete="tel" ' : 'autocomplete="name" ') +
        'placeholder="' + esc(f.placeholder || '') + '" value="' + esc(draft[f.key] || '') + '"></div>';
    }).join('');
    show('<div class="eyebrow">' + esc(C.eventName) + '</div><h1 class="big sm">' + rich(S.title) + '</h1>' +
      '<p class="lead">' + rich(S.intro) + '</p>' + fields +
      '<p class="note">' + rich(S.privacyNote) + '</p>' +
      '<div id="qmsg" class="msg" role="status" aria-live="polite"></div>' +
      '<button class="btn primary pulse" id="goBtn" type="button">' + esc(S.button) + '</button>', { noProgress: true });

    var inputs = $$('.field', app);
    inputs.forEach(function (x) {
      x.addEventListener('input', function () {
        state.signupDraft = state.signupDraft || {};
        state.signupDraft[x.name] = x.value; save();
      });
    });
    var btn = $('#goBtn'), msg = $('#qmsg'), busy = false;
    btn.addEventListener('click', function () {
      if (busy) return;
      var data = {}, ok = true;
      S.fields.forEach(function (f) {
        var x = $('input[name="' + f.key + '"]', app), box = x.parentNode;
        data[f.key] = x.value.trim();
        box.classList.remove('bad');
        if (f.required && !data[f.key]) { ok = false; void box.offsetWidth; box.classList.add('bad'); }
      });
      if (!ok) { msg.className = 'msg bad'; msg.textContent = S.emptyMessage; return; }
      busy = true; btn.disabled = true; btn.textContent = S.working;
      msg.className = 'msg'; msg.textContent = '';
      startTimer(data).then(function (p) {
        state.player = p; delete state.signupDraft; save();
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
        completeStep(0);
      }).catch(function (e) {
        if (window.console) console.error(e);
        msg.className = 'msg bad'; msg.textContent = S.errorNoNet;
        busy = false; btn.disabled = false; btn.textContent = S.button;
      });
    });
  }

  function startTimer(data) {
    var p = { name: data.name || '', phone: data.phone || '' };
    if (!C.serverURL) {
      p.id = 'LOCAL-' + randomCode(5); p.startMs = Date.now(); p.offset = 0; p.local = true;
      return Promise.resolve(p);
    }
    var sentAt = Date.now();
    return post({ action: 'start', name: p.name, phone: p.phone, extra: data, test: DEBUG }).then(function (j) {
      var now = Date.now();
      p.id = j.id; p.startMs = j.startMs;
      p.offset = j.serverNow - Math.round((sentAt + now) / 2);   // phone clock vs Google clock
      return p;
    });
  }

  function screenLocked() {
    var L = C.locked;
    show('<div class="center lock-wrap"><h1 class="big sm">' + rich(L.title) + '</h1>' +
      '<p class="lead">' + rich(L.line1) + '</p><p>' + rich(L.line2) + '</p>' +
      '<button class="btn ghost" id="backBtn" type="button">' + esc(L.button) + '</button></div>',
      { noProgress: !started() });
    $('#backBtn').addEventListener('click', goHome);
  }

  // "You finished this page — here is your clue" (also the screen you see
  // while walking to the next QR code)
  function screenClue(i, fresh) {
    var s = STEPS[i], next = STEPS[i + 1];
    var clue = s.clue || {};
    var waitingForQr = next && next.qr && !state.arrived[next.qr];
    var extra = '';
    if (s.showInterviewWords) {
      var ws = STEPS.filter(function (x) { return x.stop === s.stop && state.answers[x.id]; })
        .map(function (x) { return state.answers[x.id]; });
      if (ws.length) extra = '<div class="card reveal-in" style="--d:' + (fresh ? 1.6 : 0) + 's"><div class="eyebrow">MELAKA IN ' + ws.length + ' WORDS</div><div class="chips">' +
        ws.map(function (w) { return '<span class="chip">' + esc(w) + '</span>'; }).join('') + '</div></div>';
    }
    var footer = waitingForQr
      ? '<p class="note">' + rich(C.scanNote) + '</p>'
      : '<button class="btn primary" id="nextBtn" type="button">' + esc(C.nextButton || 'NEXT →') + '</button>';

    show((s.doneTitle ? '<div class="center"><div class="stamp ' + (fresh ? '' : 'static') + '">' + rich(s.doneTitle) + '</div></div>' : '') +
      extra +
      (clue.text ? '<div class="card clue reveal-in" style="--d:' + (fresh ? 1.0 : 0) + 's">' +
        '<div class="eyebrow">' + esc(clue.label || 'YOUR NEXT CLUE') + '</div>' +
        '<p class="clue-text">' + rich(clue.text) + '</p></div>' : '') +
      hintsHTML(clue.hints) + footer, { hints: clue.hints });
    var b = $('#nextBtn');
    if (b) b.addEventListener('click', function () { state.clueSeen[i] = true; save(); render(); });
  }

  function screenStep(i) {
    var s = STEPS[i];
    if (s.type === 'questions') return screenQuestions(i);
    if (s.type === 'poem') return screenPoem(i);
    if (s.type === 'task') return screenTask(i);
    if (s.type === 'poemTest') return screenPoemTest(i);
    if (s.type === 'finish') return screenFinish(i);
    if (s.type === 'signup') return screenSignup();
    show('<p>Unknown page type "' + esc(s.type) + '" in game-config.js</p>');
  }

  /* ---- questions ---- */
  function screenQuestions(i) {
    var s = STEPS[i];
    show(head(s) + '<p class="lead">' + rich(s.intro) + '</p>' +
      '<div id="qform">' + questionsHTML(s.id, s.questions) + '</div>' +
      '<div id="qmsg" class="msg" role="status" aria-live="polite"></div>' +
      '<button class="btn primary" id="submitBtn" type="button">' + esc(s.submitButton || 'CHECK ANSWERS') + '</button>' +
      hintsHTML(s.hints), { hints: s.hints });
    bindQuestionForm(s.id, s.questions, s.wrongMessage, function () {
      later(function () { completeStep(i); }, 700);
    });
  }

  /* ---- poem: shown once, then gone ---- */
  function screenPoem(i) {
    var s = STEPS[i], P = C.poem;
    var end = state.poemEnd[s.id];
    if (end && Date.now() < end) return showPoem(i, end);
    if (end) {
      show(head(s) + '<div class="center"><h2 class="big sm">' + esc(s.afterTitle) + '</h2></div>' +
        '<p class="lead">' + rich(s.afterText) + '</p>' +
        '<button class="btn primary" id="nextStep" type="button">' + esc(C.nextButton || 'NEXT →') + '</button>');
      $('#nextStep').addEventListener('click', function () { completeStep(i); });
      return;
    }
    show(head(s) + '<p class="lead">' + (s.introLines || []).map(esc).join('<br>') + '</p>' +
      '<button class="btn primary pulse" id="readyBtn" type="button">' + esc(s.readyButton) + '</button>');
    $('#readyBtn').addEventListener('click', function () {
      state.poemEnd[s.id] = Date.now() + (P.seconds || 30) * 1000; save();
      render();
    });
  }
  function showPoem(i, end) {
    var s = STEPS[i], P = C.poem, total = (P.seconds || 30) * 1000;
    show('<div class="eyebrow">' + esc(s.memoriseTitle) + '</div>' +
      '<div class="poem-card"><p class="poem">' + P.lines.map(esc).join('<br>') + '</p></div>' +
      '<div class="countdown" id="cd" aria-live="off"></div>' +
      '<div class="bar"><i id="cdbar"></i></div>' +
      '<p class="note center">It disappears when the timer reaches zero.</p>');
    function upd() {
      var left = Math.max(0, end - Date.now()), sec = Math.ceil(left / 1000);
      var cd = $('#cd'), bar = $('#cdbar');
      if (cd) { cd.textContent = '00:' + pad2(sec); cd.classList.toggle('low', sec <= 5); }
      if (bar) bar.style.transform = 'scaleX(' + (left / total) + ')';
      if (left <= 0) render();                 // poem is now completely gone
    }
    upd(); every(upd, 250);
  }

  /* ---- task: tick boxes + photo + answer ---- */
  function screenTask(i) {
    var s = STEPS[i];
    var ticked = state.checks[s.id] || [];
    var checks = (s.checks || []).map(function (c, j) {
      return '<label class="check"><input type="checkbox" data-j="' + j + '"' + (ticked[j] ? ' checked' : '') + '><span>' + esc(c) + '</span></label>';
    }).join('');
    var ans = s.answer
      ? '<div class="q" id="ansBox"><div class="q-label">' + esc(s.answer.label || 'ANSWER') + '</div>' +
        '<input class="field" id="ansField" type="text" maxlength="60" autocomplete="off" enterkeyhint="done" placeholder="' +
        esc(s.answer.placeholder || 'Your answer') + '" value="' + esc(state.answers[s.id] || '') + '"></div>'
      : '';
    show(head(s) +
      (IN_APP && s.photo ? '<div class="card warn-card">⚠️ ' + rich(PT.inApp) + '</div>' : '') +
      '<div class="card task"><p class="task-text">' + rich(s.text) + '</p></div>' +
      (s.link ? '<a class="btn primary" href="' + esc(s.link.url) + '" target="_blank" rel="noopener">' + esc(s.link.label || 'OPEN') + '</a>' : '') +
      (checks ? '<div class="checks">' + checks + '</div>' : '') +
      (s.photo ? photoHTML(!!state.photos[s.id]) : '') + ans +
      '<div id="qmsg" class="msg" role="status" aria-live="polite"></div>' +
      '<button class="btn gold" id="doneBtn" type="button">DONE — NEXT →</button>' +
      hintsHTML(s.hints), { hints: s.hints });

    $$('.check input', app).forEach(function (x) {
      x.addEventListener('change', function () {
        var arr = state.checks[s.id] || [];
        arr[+x.getAttribute('data-j')] = x.checked;
        state.checks[s.id] = arr; save();
      });
    });
    var af = $('#ansField');
    if (af) af.addEventListener('input', function () { state.answers[s.id] = af.value; save(); });
    if (s.photo) bindPhoto({ onPhoto: function () { state.photos[s.id] = true; save(); } });

    var btn = $('#doneBtn'), msg = $('#qmsg');
    btn.addEventListener('click', function () {
      var missing = [];
      var arr = state.checks[s.id] || [];
      (s.checks || []).forEach(function (c, j) { if (!arr[j]) missing.push('tick “' + c + '”'); });
      if (s.photo && !state.photos[s.id]) missing.push('take the photo');
      if (s.answer) {
        var v = (af.value || '').trim();
        $('#ansBox').classList.remove('bad');
        if (!v) missing.push('type the answer');
        else if (s.answer.acceptedAnswers && !matches(v, s.answer.acceptedAnswers)) {
          void $('#ansBox').offsetWidth; $('#ansBox').classList.add('bad');
          missing.push('check your answer');
        }
      }
      if (missing.length) {
        msg.className = 'msg bad';
        msg.textContent = 'First: ' + missing.join(', ') + '.';
        return;
      }
      btn.disabled = true;
      completeStep(i);
    });
  }

  /* ---- poemTest: type the poem from memory ---- */
  function poemScore(text) {
    var target = words(C.poem.lines.join(' ')), bag = {};
    words(text).forEach(function (w) { bag[w] = (bag[w] || 0) + 1; });
    var hit = 0;
    target.forEach(function (w) { if (bag[w]) { hit++; bag[w]--; } });
    return target.length ? Math.round(hit * 100 / target.length) : 100;
  }
  function screenPoemTest(i) {
    var s = STEPS[i], fails = state.fails[s.id] || 0;
    var helpOn = fails >= (s.helpAfterFails || 99);
    var help = helpOn
      ? '<div class="card"><div class="eyebrow">A LITTLE HELP</div><p class="poem small">' +
        C.poem.lines.map(function (l) { return esc(l.split(' ')[0]) + ' …'; }).join('<br>') + '</p></div>'
      : '';
    show(head(s) + '<div class="card task"><p class="task-text">' + rich(s.text) + '</p></div>' + help +
      '<textarea class="field area" id="poemField" rows="6" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="' +
      esc(s.placeholder) + '">' + esc(state.answers[s.id] || '') + '</textarea>' +
      '<div id="qmsg" class="msg" role="status" aria-live="polite"></div>' +
      '<button class="btn primary" id="submitBtn" type="button">CHECK MY POEM</button>', { hints: s.hints });
    var f = $('#poemField'), btn = $('#submitBtn'), msg = $('#qmsg');
    f.addEventListener('input', function () { state.answers[s.id] = f.value; save(); });
    btn.addEventListener('click', function () {
      var score = poemScore(f.value);
      if (score >= (C.poem.passPercent || 70)) {
        msg.className = 'msg good'; msg.textContent = '✓ ' + score + '% right!';
        btn.disabled = true;
        later(function () { completeStep(i); }, 900);
      } else {
        state.fails[s.id] = fails + 1; save();
        msg.className = 'msg bad'; msg.textContent = tpl(s.wrongMessage) + ' (' + score + '%)';
        if (state.fails[s.id] === s.helpAfterFails) later(render, 1600);
      }
    });
  }

  /* ---- finish: organiser stops the timer ---- */
  function screenFinish(i) {
    var s = STEPS[i];
    var needPin = !!(C.serverURL && C.finishNeedsOrganiserPin);
    show('<div class="center"><h1 class="big">' + rich(s.title) + '</h1></div>' +
      '<p class="lead center">' + rich(s.text) + '</p>' +
      '<div class="card code-card"><div class="eyebrow">' + esc((state.player && state.player.name) || '') + '</div>' +
      '<div class="code" id="bigClock">' + fmtDuration(elapsed()) + '</div>' +
      '<p class="note" style="margin:0">Timer still running</p></div>' +
      (needPin ? '<div class="q" id="pinBox"><div class="q-label">' + esc(s.pinLabel) + '</div>' +
        '<input class="field" id="pinField" type="password" inputmode="numeric" autocomplete="off" placeholder="' + esc(s.pinPlaceholder) + '"></div>' : '') +
      '<div id="qmsg" class="msg" role="status" aria-live="polite"></div>' +
      '<button class="btn primary pulse" id="stopBtn" type="button">' + esc(s.button) + '</button>');

    var btn = $('#stopBtn'), msg = $('#qmsg'), busy = false;
    btn.addEventListener('click', function () {
      if (busy) return;
      var pin = needPin ? $('#pinField').value.trim() : '';
      if (needPin && !pin) { msg.className = 'msg bad'; msg.textContent = s.wrongPin; return; }
      busy = true; btn.disabled = true; btn.textContent = s.working;
      stopTimer(pin).then(function (res) {
        state.finish = res; state.step = STEPS.length; save();
        revealFresh = true;
        goHome();
      }).catch(function (e) {
        if (window.console) console.error(e);
        msg.className = 'msg bad';
        msg.textContent = e && e.code === 'pin' ? s.wrongPin : (e && e.code === 'unknown-player'
          ? 'This phone\'s sign-up wasn\'t found in the sheet. Ask the organiser.' : s.errorNoNet);
        busy = false; btn.disabled = false; btn.textContent = s.button;
      });
    });
  }

  function randomCode(len) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    var arr = new Uint32Array(len);
    try { crypto.getRandomValues(arr); } catch (e) { for (var i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 1e9); }
    for (var j = 0; j < len; j++) out += chars.charAt(arr[j] % chars.length);
    return out;
  }
  function stopTimer(pin) {
    if (!C.serverURL || !state.player || state.player.local) {
      return Promise.resolve({ place: null, code: 'HUNT-' + randomCode(4), totalMs: elapsed(), local: true });
    }
    return post({ action: 'finish', id: state.player.id, pin: pin, test: DEBUG }).then(function (j) {
      return { place: j.place, code: j.code, totalMs: j.totalMs, flagged: !!j.flagged };
    });
  }

  /* ---- the last screen ---- */
  var revealFresh = false;
  function screenReveal() {
    var R = C.reveal, f = state.finish, fresh = revealFresh; revealFresh = false;
    var winner = f.place && f.place <= 3;
    var d = function (n) { return fresh ? n : 0; };
    var follow = C.instagramURL
      ? '<a class="btn primary" href="' + esc(C.instagramURL) + '" target="_blank" rel="noopener">' + esc(R.followButton) + '</a>' : '';
    show('<div class="rv-lines"><div class="rv rline first" style="--d:' + d(0) + 's">' +
        rich(winner ? R.winnerTitle : R.finisherTitle, { place: f.place ? ordinal(f.place) : '' }) + '</div></div>' +
      '<div class="rv" style="--d:' + d(1.2) + 's">' +
        '<div class="card code-card ' + (winner ? 'winner' : '') + '"><div class="eyebrow">' + esc(winner ? R.winnerCodeTitle : R.finisherCodeTitle) + '</div>' +
        '<div class="code">' + esc(f.code) + '</div><p class="note" style="margin:0">' + esc(R.codeNote) + '</p></div>' +
        '<div class="stats">' +
          '<div class="card stat"><div class="eyebrow">' + esc(R.timeLabel) + '</div><div class="stat-v">' + fmtDuration(f.totalMs) + '</div></div>' +
          (f.place ? '<div class="card stat"><div class="eyebrow">' + esc(R.placeLabel) + '</div><div class="stat-v">' + ordinal(f.place) + '</div></div>' : '') +
        '</div>' +
        '<p class="lead center">' + rich(R.thanks) + '</p>' + follow +
        '<button class="btn ghost" id="shareHunt" type="button">' + esc(R.shareButton) + '</button></div>',
      { cls: fresh ? '' : 'static' });
    if (fresh) later(confetti, 1400);
    $('#shareHunt').addEventListener('click', shareLink);
  }

  function confetti() {
    var colors = ['#ff4a36', '#ffc83a', '#2fd6c0', '#fff8ee'];
    for (var i = 0; i < 40; i++) {
      var c = document.createElement('span');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (2.5 + Math.random() * 2.5) + 's';
      c.style.animationDelay = (Math.random() * 0.8) + 's';
      document.body.appendChild(c);
      (function (el) { setTimeout(function () { el.remove(); }, 6500); })(c);
    }
  }

  function shareLink() {
    var url = C.shareURL || (location.origin + location.pathname);
    var data = { title: C.eventName, text: tpl(C.shareText), url: url };
    if (navigator.share) {
      navigator.share(data).catch(function (e) { if (!e || e.name !== 'AbortError') copyText(url, 'Link copied!'); });
    } else copyText(url, 'Link copied!');
  }
  function copyText(t, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { toast(okMsg); }, function () { toast(t); });
    } else toast(t);
  }

  /* ------------------------------------------------------------------
     PHOTOS  (all processing happens on the phone)
     ------------------------------------------------------------------ */
  function photoHTML(already) {
    return '<div class="photo" id="photo">' +
      (already ? '<div class="badge-ok" id="ph-already">✓ PHOTO TAKEN</div>' : '') +
      '<div id="ph-capture">' +
        '<label class="btn primary" for="ph-cam">📷 ' + esc(already ? PT.retake : PT.take) + '</label>' +
        '<input class="sr-only" id="ph-cam" type="file" accept="image/*" capture="environment">' +
        '<label class="btn ghost" for="ph-lib">🖼 ' + esc(PT.choose) + '</label>' +
        '<input class="sr-only" id="ph-lib" type="file" accept="image/*">' +
      '</div>' +
      '<div id="ph-work" class="working" hidden><div class="spinner"></div><p>' + esc(PT.working) + '</p></div>' +
      '<div id="ph-result" hidden>' +
        '<h2 class="big sm">' + esc(PT.looksGood) + '</h2>' +
        '<img id="ph-img" class="photo-out" alt="Your finished photo">' +
        '<button class="btn primary" id="ph-save" type="button">⬇ ' + esc(PT.save) + '</button>' +
        '<button class="btn primary" id="ph-share" type="button">↗ ' + esc(PT.share) + '</button>' +
        (C.eventHashtag ? '<button class="btn ghost small" id="ph-tag" type="button">COPY ' + esc(C.eventHashtag) + '</button>' : '') +
        '<button class="btn ghost small" id="ph-retake" type="button">' + esc(PT.retake) + '</button>' +
        '<p class="note" style="margin-top:0">' + esc(PT.holdTip) + '</p>' +
      '</div>' +
      '<div id="ph-msg" class="msg" role="status" aria-live="polite"></div>' +
      '<p class="privacy">🔒 ' + esc(PT.privacy) + '</p></div>';
  }

  function canShareFile(f) {
    try { return !!(f && navigator.share && navigator.canShare && navigator.canShare({ files: [f] })); } catch (e) { return false; }
  }

  function bindPhoto(o) {
    var root = $('#photo');
    var q = function (s) { return $(s, root); };
    var url = null, file = null, fname = '', busy = false;
    cleanups.push(function () { if (url) URL.revokeObjectURL(url); });

    function setMsg(t, cls) { var m = q('#ph-msg'); m.className = 'msg ' + (cls || ''); m.innerHTML = t ? rich(t) : ''; }
    function showCapture() { q('#ph-capture').hidden = false; q('#ph-work').hidden = true; q('#ph-result').hidden = true; }

    function handle(f) {
      if (busy || !f) return;
      busy = true; setMsg('');
      q('#ph-capture').hidden = true; q('#ph-work').hidden = false;
      var al = q('#ph-already'); if (al) al.hidden = true;
      makePhoto(f).then(function (r) {
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(r.blob); file = r.file; fname = r.name;
        // A data: picture (not blob:) so "press and hold → Save" works on every phone
        return new Promise(function (res) {
          var fr = new FileReader();
          fr.onload = function () { res(fr.result); };
          fr.onerror = function () { res(url); };
          fr.readAsDataURL(r.blob);
        });
      }).then(function (src) {
        q('#ph-img').src = src;
        q('#ph-work').hidden = true; q('#ph-result').hidden = false;
        q('#ph-result').classList.add('pop');
        busy = false;
        o.onPhoto();
      }).catch(function (err) {
        if (window.console) console.error(err);
        showCapture(); setMsg(PT.error, 'bad'); busy = false;
      });
    }
    ['#ph-cam', '#ph-lib'].forEach(function (sel) {
      q(sel).addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        e.target.value = '';
        handle(f);
      });
    });

    q('#ph-retake').addEventListener('click', function () { setMsg(''); showCapture(); });

    function download() {
      var a = document.createElement('a');
      a.href = url; a.download = fname; a.rel = 'noopener';
      document.body.appendChild(a); a.click();
      setTimeout(function () { a.remove(); }, 1000);
    }

    // SAVE: iPhone can only put a picture in Photos through the share menu
    // ("Save Image"). Android / computers download the file.
    q('#ph-save').addEventListener('click', function () {
      if (!url) return;
      if (IOS && canShareFile(file)) {
        setMsg(PT.saveIOS, 'good');
        navigator.share({ files: [file] }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          download(); setMsg(PT.holdTip);
        });
      } else {
        download();
        setMsg(PT.saveAndroid, 'good');
      }
    });

    // SHARE: files only (adding text makes WhatsApp / Instagram drop the photo)
    q('#ph-share').addEventListener('click', function () {
      if (!file) return;
      if (canShareFile(file)) {
        setMsg('');
        navigator.share({ files: [file] }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          download(); setMsg('Your browser couldn\'t share it, so the photo was saved instead. Open Instagram or WhatsApp and pick it from your gallery.');
        });
      } else {
        download();
        setMsg('This browser can\'t share photos directly, so it was saved instead. Open Instagram or WhatsApp and pick it from your gallery.');
      }
    });

    var tag = q('#ph-tag');
    if (tag) tag.addEventListener('click', function () { copyText(C.eventHashtag, tpl(PT.hashtagCopied)); });
  }

  /* ---- loading the photo + fixing phone rotation ---- */
  var AUTO_ROTATE = (function () {
    try { return !!(window.CSS && CSS.supports && CSS.supports('image-orientation', 'from-image')); } catch (e) { return false; }
  })();

  function loadImg(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { im._u = u; res(im); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('image load failed')); };
      im.src = u;
    });
  }
  function loadURL(src) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error('load failed: ' + src)); };
      im.src = src;
    });
  }

  // Reads the EXIF "orientation" tag from a JPEG (1 = normal)
  function exifOrientation(file) {
    return new Promise(function (res) {
      var r = new FileReader();
      r.onload = function () {
        try {
          var v = new DataView(r.result);
          if (v.getUint16(0) !== 0xFFD8) return res(1);
          var off = 2, len = v.byteLength;
          while (off < len - 4) {
            var marker = v.getUint16(off); off += 2;
            if (marker === 0xFFE1) {
              if (v.getUint32(off + 2) !== 0x45786966) return res(1);
              var tiff = off + 8, little = v.getUint16(tiff) === 0x4949;
              var ifd = v.getUint32(tiff + 4, little);
              var n = v.getUint16(tiff + ifd, little);
              for (var i = 0; i < n; i++) {
                var e = tiff + ifd + 2 + i * 12;
                if (v.getUint16(e, little) === 0x0112) return res(v.getUint16(e + 8, little));
              }
              return res(1);
            } else if ((marker & 0xFF00) !== 0xFF00) break;
            else off += v.getUint16(off);
          }
        } catch (e) {}
        res(1);
      };
      r.onerror = function () { res(1); };
      r.readAsArrayBuffer(file.slice(0, 131072));
    });
  }

  function fmtDate(d) {
    var M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return pad2(d.getDate()) + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fmtTime(d) {
    var h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM';
    return (h % 12 || 12) + ':' + pad2(d.getMinutes()) + ' ' + ap;
  }
  function fileStamp(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
  }

  function makePhoto(file) {
    var taken = new Date();                       // the phone's own date + time
    return Promise.all([loadImg(file), exifOrientation(file)]).then(function (r) {
      var img = r[0], orient = r[1];
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      var manual = !AUTO_ROTATE && orient > 1;
      var sw = w, sh = h;
      if (manual && orient >= 5) { sw = h; sh = w; }
      var scale = Math.min(1, (C.photoMaxLongSide || 1920) / Math.max(sw, sh));
      var W = Math.round(sw * scale), H = Math.round(sh * scale);
      var F = Math.round(W * 0.19);

      var canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H + F;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H + F);

      // draw the photo (rotating it by hand only if the browser won't)
      ctx.save();
      if (manual) {
        var T = {
          2: [-1, 0, 0, 1, W, 0], 3: [-1, 0, 0, -1, W, H], 4: [1, 0, 0, -1, 0, H],
          5: [0, 1, 1, 0, 0, 0], 6: [0, 1, -1, 0, W, 0], 7: [0, -1, -1, 0, W, H], 8: [0, -1, 1, 0, 0, H]
        }[orient];
        if (T) ctx.transform.apply(ctx, T);
        if (orient >= 5) ctx.drawImage(img, 0, 0, H, W); else ctx.drawImage(img, 0, 0, W, H);
      } else {
        ctx.drawImage(img, 0, 0, W, H);
      }
      ctx.restore();
      try { URL.revokeObjectURL(img._u); } catch (e) {}

      return drawFooter(ctx, W, H, F, taken).then(function () {
        return new Promise(function (res, rej) {
          canvas.toBlob(function (blob) {
            if (!blob) return rej(new Error('toBlob failed'));
            var name = (C.photoFilePrefix || 'hunt') + '-' + fileStamp(taken) + '.jpg';
            var f;
            try { f = new File([blob], name, { type: 'image/jpeg', lastModified: taken.getTime() }); } catch (e) { f = null; }
            res({ blob: blob, file: f, name: name });
          }, 'image/jpeg', C.photoJpegQuality || 0.92);
        });
      });
    });
  }

  // The designed footer that becomes PART of the saved image
  function drawFooter(ctx, W, H, F, date) {
    var col = C.photoColors || {};
    var bg = col.background || '#0f0d12', txt = col.text || '#fff', accent = col.accent || '#ffc83a', muted = col.muted || '#cfc4d8';

    ctx.fillStyle = bg; ctx.fillRect(0, H, W, F);
    var stripe = Math.max(6, Math.round(F * 0.035));
    var g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#ff4a36'); g.addColorStop(1, '#ffc83a');
    ctx.fillStyle = g; ctx.fillRect(0, H, W, stripe);

    var pad = Math.round(W * 0.05);
    var reserve = 0;
    var logoStep = C.logoPath
      ? loadURL(C.logoPath).then(function (logo) {
          var s = Math.min((F * 0.56) / logo.naturalHeight, (W * 0.24) / logo.naturalWidth);
          var lw = logo.naturalWidth * s, lh = logo.naturalHeight * s;
          ctx.drawImage(logo, W - pad - lw, H + stripe + (F - stripe - lh) / 2, lw, lh);
          reserve = lw + pad * 0.5;
        }).catch(function () {})              // no logo file? just skip it
      : Promise.resolve();

    return logoStep.then(function () {
      var rows = [], parts = [];
      if (C.showPhotoDate !== false) parts.push(fmtDate(date));
      if (C.showPhotoTime !== false) parts.push(fmtTime(date));
      if (parts.length) rows.push({ t: parts.join('  •  '), w: 800, size: F * 0.17, color: txt });
      if (C.showPhotoHashtag !== false && C.eventHashtag) rows.push({ t: C.eventHashtag, w: 900, size: F * 0.26, color: accent });
      if (C.photoFooterText) rows.push({ t: tpl(C.photoFooterText), w: 600, size: F * 0.14, color: muted });
      if (!rows.length) return;

      var maxW = W - pad * 2 - reserve, gap = F * 0.07;
      rows.forEach(function (r) {
        var s = Math.round(r.size);
        ctx.font = r.w + ' ' + s + 'px ' + FONT;
        while (ctx.measureText(r.t).width > maxW && s > 10) { s -= 2; ctx.font = r.w + ' ' + s + 'px ' + FONT; }
        r.s = s;
      });
      var total = rows.reduce(function (a, r) { return a + r.s; }, 0) + gap * (rows.length - 1);
      var y = H + stripe + (F - stripe - total) / 2;
      ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      rows.forEach(function (r) {
        ctx.font = r.w + ' ' + r.s + 'px ' + FONT;
        ctx.fillStyle = r.color;
        ctx.fillText(r.t, pad, y);
        y += r.s + gap;
      });
    });
  }

  /* ------------------------------------------------------------------
     "STUCK?" HELP POPUP
     ------------------------------------------------------------------ */
  function openStuck() {
    var H = C.help, modal = $('#stuckModal'), hints = currentHints || [];
    modal.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true" aria-label="Help">' +
      '<button class="modal-close" id="mClose" type="button" aria-label="Close">✕</button>' +
      '<h2>' + esc(H.title) + '</h2>' +
      '<h3>HOW IT WORKS</h3><ol>' + H.howItWorks.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
      '<h3>HINTS</h3>' + (hints.length ? '<p class="note" style="margin-top:0">' + esc(H.hintsNote) + '</p>' + hintsHTML(hints) : '<p>' + esc(H.noHints) + '</p>') +
      '<details class="tech"><summary>' + esc(H.techTitle) + '</summary><ul>' +
      H.troubleshooting.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details></div>';
    modal.hidden = false;
    document.body.classList.add('modal-open');
    $('#mClose', modal).addEventListener('click', closeStuck);
    modal.onclick = function (e) { if (e.target === modal) closeStuck(); };
  }
  function closeStuck() {
    var m = $('#stuckModal'); m.hidden = true; m.innerHTML = '';
    document.body.classList.remove('modal-open');
  }
  $('#stuckBtn').addEventListener('click', openStuck);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#stuckModal').hidden) closeStuck(); });

  /* ------------------------------------------------------------------
     DEBUG / TESTING TOOLS   (only with ?debug=true on the address)
     ------------------------------------------------------------------ */
  function testPlayer() {
    if (!state.player) state.player = { id: 'TEST-' + randomCode(4), name: 'Test player', phone: '', startMs: Date.now(), offset: 0, local: true };
  }
  function dbgJump(n) {
    if (n === 0) { state = blank(); save(); goHome(); return; }   // page 1 = back to the start
    testPlayer();
    state.finish = null; state.step = n;
    STEPS.forEach(function (s, i) {
      if (s.qr) state.arrived[s.qr] = i <= n;
      if (i < n) state.clueSeen[i] = true; else delete state.clueSeen[i];
    });
    save(); goHome();
  }
  function dbgSkip() {
    if (state.finish) return;
    if (state.step === 0) { testPlayer(); save(); completeStep(0); return; }
    var s = STEPS[state.step];
    if (s.qr && !state.arrived[s.qr]) { state.arrived[s.qr] = true; save(); goHome(); return; }
    if (s.type === 'finish') {
      state.finish = { place: null, code: 'TEST-' + randomCode(4), totalMs: elapsed(), local: true };
      state.step = STEPS.length; revealFresh = true; save(); goHome(); return;
    }
    if (s.type === 'poem' && !state.poemEnd[s.id]) state.poemEnd[s.id] = Date.now() - 1;
    if (s.answer && !state.answers[s.id]) state.answers[s.id] = 'test';
    completeStep(state.step);
  }
  function renderDebug() {
    var host = $('#debugHost');
    $('#debugBanner').hidden = !DEBUG;
    document.body.classList.toggle('is-debug', DEBUG);
    if (!DEBUG) { host.innerHTML = ''; return; }
    var opts = STEPS.map(function (s, i) {
      return '<option value="' + i + '"' + (i === state.step ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(s.stop + ' — ' + (s.title || s.id)) + '</option>';
    }).join('');
    var info = 'Page ' + Math.min(state.step + 1, STEPS.length) + ' of ' + STEPS.length +
      (STEPS[state.step] ? ' (' + STEPS[state.step].id + ')' : '') +
      '\nPlayer ' + (state.player ? state.player.id + (state.player.local ? ' (not in sheet)' : '') : '—') +
      '\nSheet ' + (C.serverURL ? 'connected' : 'NOT SET (serverURL is empty)') +
      (state.finish ? '\nCODE ' + state.finish.code : '');
    host.innerHTML = '<div class="debug"><h3>🛠 DEBUG MODE</h3><pre>' + esc(info) + '</pre>' +
      '<select class="field" id="dbgSel">' + opts + '</select>' +
      '<button class="btn" data-dbg="jump" type="button">JUMP TO THAT PAGE</button>' +
      '<button class="btn" data-dbg="skip" type="button">SKIP CURRENT PAGE</button>' +
      '<button class="btn danger" data-dbg="reset" type="button">RESET ENTIRE HUNT</button>' +
      '<button class="btn danger" data-dbg="clear" type="button">CLEAR LOCALSTORAGE</button></div>';
    $$('[data-dbg]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-dbg');
        if (a === 'jump') dbgJump(+$('#dbgSel').value);
        else if (a === 'skip') dbgSkip();
        else if (a === 'reset') { if (confirm('Reset the whole hunt on this phone?')) { state = blank(); save(); goHome(); } }
        else if (a === 'clear') { if (confirm('Clear ALL localStorage for this site?')) { try { localStorage.clear(); } catch (e) {} state = blank(); goHome(); } }
      });
    });
  }

  /* ------------------------------------------------------------------
     MAIN RENDER
     ------------------------------------------------------------------ */
  function render() {
    cleanup();
    var r = getRoute();
    var done = justCompleted; justCompleted = null;

    if (state.finish) screenReveal();
    else if (!started()) {
      if (r === 'signup') screenSignup();
      else if (QR_IDX[r] !== undefined) screenLocked();
      else screenIntro();
    } else {
      var qi = QR_IDX[r];
      if (qi !== undefined && qi > state.step) screenLocked();
      else {
        if (qi !== undefined && qi === state.step && !state.arrived[r]) { state.arrived[r] = true; save(); ping('arrived-' + r, qi); }
        var cur = state.step, s = STEPS[cur], prev = cur - 1;
        if (done !== null) screenClue(done, true);
        else if (s.qr && !state.arrived[s.qr]) screenClue(prev, false);
        else if (prev >= 0 && STEPS[prev].clue && !state.clueSeen[prev] && !s.qr) screenClue(prev, false);
        else screenStep(cur);
      }
    }
    $('#stuckBtn').hidden = !(started() && !state.finish);
    tick();
    renderDebug();
  }

  /* ------------------------------------------------------------------
     START + OFFLINE SUPPORT
     ------------------------------------------------------------------ */
  render();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
