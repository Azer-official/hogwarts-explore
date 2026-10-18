/*
 * dialogue.js — 도트 마을(/workspace/dotgame/game/js/dialogue.js)의 스타듀풍 하단 대화창을 복사·단순화.
 *   변경: 네임스페이스 HW, 초상화 제거. 나머지(타자기, 선택지, Backspace/← 이전 줄, Esc 닫기)는 그대로.
 *   open({speaker, pages:[{text, speaker?, narration?}]}, onClose?) / advance() / back() / close() / isOpen()
*/
window.HW = window.HW || {};

// Backspace 브라우저 뒤로가기 방지: 입력칸 밖이면 항상 preventDefault (전파는 막지 않음 — 학원 입력칸 글자 삭제는 그대로)
(function () {
  function editable(t) {
    return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')));
  }
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && !editable(e.target)) e.preventDefault();
  }, true);
})();

HW.Dialogue = (function () {
  var CHAR_MS = 28;
  var el, nameEl, badgeEl, textEl, metaEl, nextEl, pageEl;
  var pages = [], index = 0, typing = false, shown = 0, timer = null, open = false;
  var onClose = null, defaultSpeaker = '', defaultPortrait = null, boxEl;
  var choiceEl = null, choiceIdx = 0, closeListeners = [], nameBox = null, hintEl = null;

  function init() {
    el = document.getElementById('dialogue');
    nameEl = document.getElementById('dlg-name-text');
    badgeEl = document.getElementById('dlg-badge');
    textEl = document.getElementById('dlg-text');
    metaEl = document.getElementById('dlg-meta');
    nextEl = document.getElementById('dlg-next');
    pageEl = document.getElementById('dlg-page');
    boxEl = el.querySelector('.dlg-box');
    choiceEl = document.getElementById('dlg-choices');
    nameBox = el.querySelector('.dlg-name');
    hintEl = document.getElementById('dlg-hint');
    document.addEventListener('keydown', onChoiceKey, true);
  }

  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function isChoice() { return open && pages[index] && !!pages[index].choice; }
  function renderChoices() {
    var p = pages[index];
    choiceEl.innerHTML = '';
    choiceEl.classList.toggle('hidden', !p.choice);
    if (!p.choice) return;
    p.choice.options.forEach(function (o, i) {
      var li = document.createElement('li');
      var locked = p.chosen !== undefined;
      li.className = 'dlg-choice' + (i === choiceIdx ? ' selected' : '') + (locked && i !== p.chosen ? ' locked' : '');
      li.setAttribute('data-choice', o.id);
      li.textContent = (i + 1) + '. ' + o.text;
      li.addEventListener('mousedown', function (e) { e.preventDefault(); if (!locked) { choiceIdx = i; renderChoices(); } });
      li.addEventListener('click', function () { choose(i); });
      choiceEl.appendChild(li);
    });
  }
  function choose(i) {
    var p = pages[index];
    if (!p || !p.choice) return;
    if (typing) finishTyping();
    if (p.chosen === undefined) {
      // 첫 선택만 효과 적용. 선택지 페이지는 남겨 두고(이전 줄로 돌아올 수 있게) 뒤에 고른 말 + 반응을 끼운다
      var extra = (p.onChoose ? p.onChoose(i) : []) || [];
      p.chosen = i;
      var answered = { text: p.choice.options[i].text, speaker: p.speaker, portrait: p.portrait, chosenFrom: true };
      pages.splice.apply(pages, [index + 1, 0, answered].concat(extra));
    }
    // 이미 고른 선택지(되돌아온 경우): 고정 — 같은 반응 줄을 다시 보여 줄 뿐 효과는 다시 적용하지 않음
    index += 1;
    render();
  }

  // 이전 줄 (Backspace / ←). 첫 줄이면 무시. 되돌아간 줄은 바로 전체 표시
  function back() {
    if (!open || index <= 0) return false;
    index -= 1;
    render(true);
    return true;
  }
  // 선택지 키 처리 (Phaser 보다 먼저 받음)
  // + 이전 줄 키(Backspace/←)는 모든 대화 페이지에서 여기서 소비 → Phaser(이동)로 가지 않음
  function onChoiceKey(e) {
    if (!open) return;
    var k = e.key;
    if (k === 'Backspace' || k === 'ArrowLeft') {
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) back();                       // 누르고 있어도 한 번에 한 줄
      return;
    }
    if (!isChoice()) return;
    var p = pages[index], n = p.choice.options.length;
    if (k === 'Escape') return;                    // Esc 는 평소처럼 대화 닫기
    e.stopPropagation();
    if (p.chosen !== undefined && k !== 'Enter' && k !== ' ') { e.preventDefault(); return; }   // 고정된 선택지: 이동 불가
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); choiceIdx = (choiceIdx + n - 1) % n; renderChoices(); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); choiceIdx = (choiceIdx + 1) % n; renderChoices(); }
    else if (/^[1-9]$/.test(k) && +k <= n) { e.preventDefault(); choiceIdx = +k - 1; renderChoices(); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (!e.repeat) { if (typing) finishTyping(); else choose(choiceIdx); } }
  }

  function hintText(p) {
    var parts = [];
    if (p.choice) parts.push(p.chosen !== undefined ? 'Space 계속(선택 고정)' : '↑↓ 고르기 · Space 결정');
    else parts.push(index === pages.length - 1 ? 'Space 닫기' : 'Space 다음');
    if (index > 0) parts.push('Backspace 이전');
    parts.push('Esc 닫기');
    return parts.join(' · ');
  }

  function render(instant) {
    var p = pages[index];
    var full = p.text;
    var narr = !!p.narration;
    boxEl.classList.toggle('narration', narr);
    boxEl.classList.toggle('choosing', !!p.choice);
    if (nameBox) nameBox.classList.toggle('invisible', narr);
    nameEl.textContent = narr ? '' : (p.speaker || defaultSpeaker);   // 페이지별 화자(스토리용) 지원
    choiceIdx = p.chosen !== undefined ? p.chosen : 0;
    renderChoices();
    if (hintEl) hintEl.textContent = hintText(p);
    textEl.classList.toggle('title', !!p.title);
    metaEl.textContent = p.meta || '';
    pageEl.textContent = (index + 1) + ' / ' + pages.length;
    nextEl.textContent = p.choice ? '◆' : index === pages.length - 1 ? '■' : '▼';
    shown = 0; typing = true;
    textEl.textContent = '';
    nextEl.classList.add('hidden');
    stopTimer();
    if (instant) { finishTyping(); return; }
    timer = setInterval(function () {
      shown += 1;
      textEl.textContent = full.slice(0, shown);
      if (shown >= full.length) finishTyping();
    }, CHAR_MS);
  }

  function finishTyping() {
    stopTimer();
    typing = false;
    textEl.textContent = pages[index].text;
    nextEl.classList.remove('hidden');
  }

  function openDialogue(d, closeCb) {
    if (!el) init();
    pages = d.pages && d.pages.length ? d.pages : [{ text: '...' }];
    index = 0; open = true; onClose = closeCb || null;
    defaultSpeaker = d.speaker || '';
    defaultPortrait = d.portrait || null;
    badgeEl.classList.toggle('hidden', !d.isSample);
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    render();
  }

  function advance() {
    if (!open) return;
    if (typing) { finishTyping(); return; }
    if (pages[index].choice) { if (pages[index].chosen !== undefined) choose(pages[index].chosen); return; }   // 선택지는 onChoiceKey / 클릭으로만 진행 (고정된 선택지는 계속)
    if (index < pages.length - 1) { index += 1; render(); }
    else close();
  }

  function close() {
    if (!open) return;
    stopTimer();
    open = false; typing = false;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
    if (choiceEl) { choiceEl.innerHTML = ''; choiceEl.classList.add('hidden'); }
    var cb = onClose; onClose = null;
    if (cb) cb();
    closeListeners.forEach(function (fn) { try { fn(); } catch (e) { console.warn('[HW]', e); } });
  }

  return {
    open: openDialogue, advance: advance, close: close, back: back,
    isOpen: function () { return open; },
    onAnyClose: function (fn) { closeListeners.push(fn); },
    choose: function (i) { choose(i); },
    info: function () {
      var p = open ? pages[index] : null;
      return { open: open, index: index, total: pages.length, typing: typing, narration: !!(p && p.narration),
        hint: hintEl ? hintEl.textContent : '',
        choice: p && p.choice ? { options: p.choice.options.map(function (o) { return o.id; }), selected: choiceIdx,
          locked: p.chosen !== undefined } : null };
    }
  };
})();
