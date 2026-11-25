/* 命例本地存储模块 */
(function (global) {
  'use strict';

  var KEY = 'bazi_pwa_cases_v1';

  function read() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid() {
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function normalize(input) {
    return {
      id: input.id || uid(),
      name: String(input.name || '').trim(),
      gender: input.gender === 0 ? 0 : 1,
      remark: String(input.remark || '').trim(),
      date: String(input.date || ''),
      time: String(input.time || ''),
      region: input.region || { name: '未知地-即北京时间', longitude: null },
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function list() {
    return read().sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }

  function get(id) {
    var all = read();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function add(input) {
    var all = read();
    var item = normalize(input);
    all.push(item);
    return write(all) ? item.id : null;
  }

  function update(id, patch) {
    var all = read();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) {
        all[i] = normalize(Object.assign({}, all[i], patch, { id: id, createdAt: all[i].createdAt }));
        return write(all);
      }
    }
    return false;
  }

  function remove(ids) {
    if (!Array.isArray(ids)) ids = [ids];
    var set = {};
    ids.forEach(function (id) { set[id] = true; });
    var all = read();
    var kept = all.filter(function (item) { return !set[item.id]; });
    return write(kept) ? (all.length - kept.length) : 0;
  }

  function clear() {
    return write([]);
  }

  function exportJSON() {
    return JSON.stringify({
      app: '八字排盘',
      version: 1,
      exportedAt: new Date().toISOString(),
      cases: list()
    }, null, 2);
  }

  function importJSON(text) {
    try {
      var data = JSON.parse(text);
      var incoming = Array.isArray(data) ? data : data.cases;
      if (!Array.isArray(incoming)) return 0;
      var all = read();
      var existing = {};
      all.forEach(function (c) { existing[c.id] = true; });
      var added = 0;
      incoming.forEach(function (raw) {
        if (!raw || !raw.date || !raw.time) return;
        var item = normalize(raw);
        if (!item.id || existing[item.id]) item.id = uid();
        all.push(item);
        added++;
      });
      return write(all) ? added : 0;
    } catch (e) {
      return 0;
    }
  }

  global.CaseStore = {
    list: list,
    get: get,
    add: add,
    update: update,
    remove: remove,
    clear: clear,
    exportJSON: exportJSON,
    importJSON: importJSON
  };
})(window);
