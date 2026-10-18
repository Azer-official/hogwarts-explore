/*
 * save.js — 도트 마을 save.js(localStorage + ?reset=1 + 손상 복구 + 기본값 보정)를 단순화.
 * 저장 키: localStorage['hogwarts.save']
 *   { save_version, keys:[열쇠 id], passages:[통로 id], cleared, intro_seen, caught, updated_at }
 * ?reset=1 → 세이브 삭제 후 새로 시작 (파라미터는 주소에서 제거되어 새로고침해도 다시 리셋되지 않음)
 */
window.HW = window.HW || {};
HW.Save = (function () {
  var KEY = 'hogwarts.save', VERSION = 1;
  var data = null, storageOk = true, didReset = false;

  function fresh() { return { save_version: VERSION, keys: [], passages: [], cleared: false, intro_seen: false, caught: 0, updated_at: null }; }
  function normalize(s) {
    var base = fresh();
    if (!s || typeof s !== 'object') return base;
    Object.keys(base).forEach(function (k) {
      if (s[k] === undefined || s[k] === null || typeof s[k] !== typeof base[k] || Array.isArray(s[k]) !== Array.isArray(base[k])) s[k] = base[k];
    });
    s.keys = s.keys.filter(function (x) { return typeof x === 'string'; });
    s.passages = s.passages.filter(function (x) { return typeof x === 'string'; });
    s.save_version = VERSION;
    return s;
  }
  function persist() {
    if (!data) return;
    data.updated_at = new Date().toISOString();
    if (!storageOk) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { storageOk = false; console.warn('[HW] 저장 실패', e.message); }
  }
  function init() {
    var q = new URLSearchParams(location.search);
    if (q.get('reset') === '1') {
      didReset = true;
      try { localStorage.removeItem(KEY); } catch (e) {}
      q.delete('reset');
      try { var qs = q.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch (e) {}
    }
    var raw = null, parsed = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { storageOk = false; }
    if (raw) { try { parsed = JSON.parse(raw); } catch (e) { try { localStorage.setItem(KEY + '.corrupt', raw); } catch (e2) {} } }
    data = normalize(parsed);
    persist();
    return data;
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} data = fresh(); persist(); return data; }
  function addTo(list, id) { if (data[list].indexOf(id) < 0) { data[list].push(id); persist(); return true; } return false; }

  return {
    init: init, reset: reset, persist: persist,
    get data() { return data; },
    addKey: function (id) { return addTo('keys', id); },
    addPassage: function (id) { return addTo('passages', id); },
    hasKey: function (id) { return data.keys.indexOf(id) >= 0; },
    hasPassage: function (id) { return data.passages.indexOf(id) >= 0; },
    set: function (k, v) { data[k] = v; persist(); },
    didReset: function () { return didReset; },
    storageOk: function () { return storageOk; },
    KEY: KEY
  };
})();
