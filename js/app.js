/* 应用主逻辑 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  var CN_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

  function lunarMonthsOf(year) {
    return LunarYear.fromYear(year).getMonths().filter(function (m) { return m.getYear() === year; })
      .map(function (m) {
        var v = m.getMonth();
        return { value: v, label: (v < 0 ? '闰' : '') + CN_MONTHS[Math.abs(v) - 1], days: m.getDayCount() };
      });
  }

  function monthDays(cal, year, month) {
    if (cal === 'solar') return new Date(year, month, 0).getDate();
    var months = lunarMonthsOf(year);
    for (var i = 0; i < months.length; i++) {
      if (months[i].value === month) return months[i].days;
    }
    return 30;
  }

  function formatDisplayDate(cal, d) {
    if (cal === 'lunar') {
      var months = lunarMonthsOf(d.year);
      var found = null;
      for (var i = 0; i < months.length; i++) if (months[i].value === d.month) found = months[i];
      return '农历：' + d.year + '年' + (found ? found.label : d.month + '月') + d.day + '日 ' + pad(d.hour) + ':' + pad(d.minute);
    }
    return '公历：' + d.year + '年' + d.month + '月' + d.day + '日 ' + pad(d.hour) + ':' + pad(d.minute);
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function timeStr() {
    var d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function nowParts() {
    var d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
  }

  var state = {
    name: '',
    gender: 1,
    remark: '',
    date: todayStr(),
    time: timeStr(),
    calendar: 'solar',
    displayDate: nowParts(),
    region: { name: '未知地-即北京时间', longitude: null },
    save: true,
    currentResult: null,
    currentCaseId: null,
    resultOrigin: 'input',
    manageMode: false,
    selected: {},
    confirmAction: null,
    pendingRegionIndex: 0
  };

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ---------- 滚轮日期选择器 ---------- */
  var picker = {
    cal: 'solar', year: 2026, month: 1, day: 1, hour: 0, minute: 0,
    sound: true, timer: null
  };
  var audioCtx = null;

  function tickSound() {
    if (!picker.sound) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate(8);
  }

  function pickerToSolar(p) {
    if (p.cal === 'solar') {
      return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute };
    }
    var solar = Lunar.fromYmd(p.year, p.month, p.day).getSolar();
    return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay(), hour: p.hour, minute: p.minute };
  }

  function solarToPicker(s, cal) {
    if (cal === 'solar') {
      return { year: s.year, month: s.month, day: s.day, hour: s.hour, minute: s.minute };
    }
    var lunar = Solar.fromYmd(s.year, s.month, s.day).getLunar();
    return { year: lunar.getYear(), month: lunar.getMonth(), day: lunar.getDay(), hour: s.hour, minute: s.minute };
  }

  function clampPicker() {
    if (picker.cal === 'lunar') {
      var months = lunarMonthsOf(picker.year);
      var found = false;
      for (var i = 0; i < months.length; i++) if (months[i].value === picker.month) found = true;
      if (!found && months.length) picker.month = months[0].value;
    }
    var max = monthDays(picker.cal, picker.year, picker.month);
    if (picker.day > max) picker.day = max;
    if (picker.day < 1) picker.day = 1;
  }

  function wheelItems(key) {
    var items = [];
    var i;
    if (key === 'year') {
      for (i = 1900; i <= 2100; i++) items.push({ value: i, label: String(i) });
    } else if (key === 'month') {
      if (picker.cal === 'solar') {
        for (i = 1; i <= 12; i++) items.push({ value: i, label: i + '月' });
      } else {
        items = lunarMonthsOf(picker.year).map(function (m) { return { value: m.value, label: m.label }; });
      }
    } else if (key === 'day') {
      var max = monthDays(picker.cal, picker.year, picker.month);
      for (i = 1; i <= max; i++) items.push({ value: i, label: i + '日' });
    } else if (key === 'hour') {
      for (i = 0; i < 24; i++) items.push({ value: i, label: i + '时' });
    } else if (key === 'minute') {
      for (i = 0; i < 60; i++) items.push({ value: i, label: i + '分' });
    }
    return items;
  }

  function renderWheelCol(key) {
    var col = document.querySelector('.wheel-col[data-key="' + key + '"]');
    if (!col) return;
    var items = wheelItems(key);
    col._items = items;
    var selected = 0;
    for (var i = 0; i < items.length; i++) if (items[i].value === picker[key]) selected = i;
    col.innerHTML = '<div class="wheel-list">' + items.map(function (it) {
      return '<div class="wheel-item">' + esc(it.label) + '</div>';
    }).join('') + '</div>';
    col.scrollTop = selected * 40;
  }

  function renderAllWheels() {
    ['year', 'month', 'day', 'hour', 'minute'].forEach(renderWheelCol);
  }

  function updatePickerPreview() {
    var s = pickerToSolar(picker);
    $('dt-solar-preview').textContent = '对应公历：' + s.year + '-' + pad(s.month) + '-' + pad(s.day) + ' ' + pad(s.hour) + ':' + pad(s.minute);
  }

  function onWheelScroll(e) {
    var col = e.currentTarget;
    var key = col.dataset.key;
    var items = col._items;
    if (!items || !items.length) return;
    var idx = Math.round(col.scrollTop / 40);
    if (idx < 0 || idx >= items.length) return;
    var value = items[idx].value;
    if (picker[key] === value) return;
    picker[key] = value;
    tickSound();
    clearTimeout(picker.timer);
    picker.timer = setTimeout(function () {
      clampPicker();
      if (key === 'year') renderWheelCol('month');
      if (key === 'year' || key === 'month') renderWheelCol('day');
      updatePickerPreview();
    }, 130);
  }

  function openPicker() {
    var d = state.date.split('-');
    var t = state.time.split(':');
    var solar = {
      year: parseInt(d[0], 10), month: parseInt(d[1], 10), day: parseInt(d[2], 10),
      hour: parseInt(t[0], 10), minute: parseInt(t[1], 10)
    };
    picker.cal = state.calendar;
    var parts = solarToPicker(solar, picker.cal);
    picker.year = parts.year;
    picker.month = parts.month;
    picker.day = parts.day;
    picker.hour = parts.hour;
    picker.minute = parts.minute;
    clampPicker();
    document.querySelectorAll('.cal-tab').forEach(function (b) {
      b.classList.toggle('selected', b.dataset.cal === picker.cal);
    });
    $('datetime-modal').classList.remove('hidden');
    renderAllWheels();
    updatePickerPreview();
  }

  function switchCalendar(cal) {
    if (cal === picker.cal) return;
    var solar = pickerToSolar(picker);
    picker.cal = cal;
    var parts = solarToPicker(solar, cal);
    picker.year = parts.year;
    picker.month = parts.month;
    picker.day = parts.day;
    clampPicker();
    document.querySelectorAll('.cal-tab').forEach(function (b) {
      b.classList.toggle('selected', b.dataset.cal === cal);
    });
    renderAllWheels();
    updatePickerPreview();
  }

  function showView(name) {
    ['input', 'result', 'cases'].forEach(function (v) {
      $('view-' + v).classList.toggle('active', v === name);
    });
    if (name === 'cases') renderCases();
    var pages = document.querySelectorAll('.view.active .page');
    if (pages.length) pages[0].scrollTop = 0;
  }

  /* ---------- 输入页 ---------- */
  function syncInputUI() {
    $('input-name').value = state.name;
    $('input-remark').value = state.remark;
    $('datetime-text').textContent = formatDisplayDate(state.calendar, state.displayDate);
    $('region-text').textContent = '地区：' + state.region.name;
    document.querySelectorAll('.gender-option').forEach(function (b) {
      b.classList.toggle('selected', Number(b.dataset.gender) === state.gender);
    });
    $('switch-save').classList.toggle('on', state.save);
    $('switch-save').setAttribute('aria-checked', state.save ? 'true' : 'false');
  }

  function currentInput() {
    return {
      name: state.name,
      gender: state.gender,
      remark: state.remark,
      date: state.date,
      time: state.time,
      calendar: state.calendar,
      displayDate: state.displayDate,
      region: state.region
    };
  }

  function calculate(saveOverride) {
    var input = currentInput();
    if (!input.date || !input.time) { toast('请先选择公历时间'); return; }
    try {
      var result = Bazi.compute(input);
      state.currentResult = result;
      renderResult(result);
      showView('result');

      var shouldSave = typeof saveOverride === 'boolean' ? saveOverride : state.save;
      if (shouldSave && !state.currentCaseId) {
        var id = CaseStore.add(input);
        if (id) {
          state.currentCaseId = id;
          toast('命例已保存');
        } else {
          toast('保存失败，本地存储空间可能已满');
        }
      } else if (shouldSave && state.currentCaseId) {
        CaseStore.update(state.currentCaseId, input);
        toast('命例已更新');
      }
    } catch (e) {
      toast('排盘失败：' + e.message);
    }
  }

  /* ---------- 结果页 ---------- */
  function renderResult(r) {
    var info = ''
      + '<p>' + (r.input.name || '某人') + '：' + (r.input.gender === 0 ? '女士' : '男士') + '</p>'
      + '<p>出生地区：' + esc(r.input.region.name || '未知') + '</p>'
      + '<p>北京时间：' + esc(r.beijingText) + '</p>';
    if (r.correctionText) info += '<p>' + esc(r.correctionText) + '</p>';
    info += '<p>年龄：' + esc(r.ageText) + '。出生当日:' + esc(r.weekday) + '</p>'
      + '<p>农历：' + esc(r.lunarText) + '</p>';

    var pillars = r.pillars.map(function (p) {
      return '<div class="pillar">'
        + '<div class="p-gan-shen">' + esc(p.ganShen) + '</div>'
        + '<div class="p-gan">' + esc(p.gan) + '</div>'
        + '<div class="p-zhi">' + esc(p.zhi) + '</div>'
        + '<div class="p-hide">' + esc(p.hide) + '</div>'
        + '<div class="p-hide-shen">' + esc(p.hideShen) + '</div>'
        + '<div class="p-dishi">' + esc(p.dishi) + '</div>'
        + '<div class="p-nayin">' + esc(p.nayin) + '</div>'
        + '</div>';
    }).join('');

    var yunRows = function (cls, key, suffix) {
      return '<tr>' + r.yun.list.map(function (d) {
        return '<td class="' + cls + '">' + esc(d[key] + (suffix || '')) + '</td>';
      }).join('') + '</tr>';
    };
    var yunHtml = '<div class="yun-scroll"><table class="yun-table"><tbody>'
      + yunRows('yun-shen', 'shen')
      + yunRows('yun-gan', 'gan')
      + yunRows('yun-zhi', 'zhi')
      + '<tr>' + r.yun.list.map(function (d) { return '<td class="yun-num">' + pad(d.age) + '</td>'; }).join('') + '</tr>'
      + '<tr>' + r.yun.list.map(function (d) { return '<td class="yun-num">' + String(d.year).slice(-2) + '</td>'; }).join('') + '</tr>'
      + yunRows('yun-dishi', 'dishi')
      + '</tbody></table></div>';

    $('result-content').innerHTML = ''
      + '<div class="result-info">' + info + '</div>'
      + '<div class="pillars">' + pillars + '</div>'
      + '<div class="yun-intro"><p>' + esc(r.yun.startText) + '</p><p>' + esc(r.yun.jiaoText) + '</p></div>'
      + yunHtml
      + '<div class="result-remark" data-edit-remark="result">'
      + '<div class="result-remark-head"><span>备注</span><span class="result-remark-edit">点击修改</span></div>'
      + '<div class="result-remark-text' + (r.input.remark ? '' : ' empty') + '">'
      + (r.input.remark ? esc(r.input.remark) : '暂无备注，点击添加')
      + '</div></div>'
      + '<div class="result-tail">八字排盘 · 结果仅供传统文化研究参考</div>';
  }

  /* ---------- 命例页 ---------- */
  function renderCases() {
    var cases = CaseStore.list();
    var listEl = $('cases-list');
    $('cases-empty').classList.toggle('hidden', cases.length > 0);
    listEl.classList.toggle('manage-mode', state.manageMode);
    $('btn-manage-cases').textContent = state.manageMode ? '完成' : '管理';
    $('case-toolbar').classList.toggle('hidden', !state.manageMode);
    $('cases-footer').classList.toggle('hidden', state.manageMode);

    listEl.innerHTML = cases.map(function (c) {
      var selected = !!state.selected[c.id];
      var meta = (c.calendar === 'lunar' && c.displayDate && c.displayDate.year)
        ? formatDisplayDate('lunar', c.displayDate)
        : c.date + ' ' + c.time;
      meta += ' · ' + ((c.region && c.region.name) || '未知地');
      return '<div class="case-item' + (selected ? ' selected' : '') + '" data-id="' + esc(c.id) + '">'
        + '<input type="checkbox" class="case-check" ' + (selected ? 'checked' : '') + ' data-id="' + esc(c.id) + '" aria-label="选择命例">'
        + '<div class="case-main" data-open="' + esc(c.id) + '">'
        + '<div class="case-name">' + esc(c.name || '未命名') + '<span class="case-gender">' + (c.gender === 0 ? '女' : '男') + '</span></div>'
        + '<div class="case-meta">' + esc(meta) + '</div>'
        + '<div class="case-remark' + (c.remark ? '' : ' empty') + '" data-edit-remark="' + esc(c.id) + '">'
        + (c.remark ? '<span class="remark-tag">备注</span>' + esc(c.remark) : '点击添加备注')
        + '</div>'
        + '</div>'
        + '<button type="button" class="case-del" data-del="' + esc(c.id) + '">删除</button>'
        + '</div>';
    }).join('');
  }

  function openCase(id) {
    var c = CaseStore.get(id);
    if (!c) { toast('命例不存在'); return; }
    state.name = c.name || '';
    state.gender = c.gender;
    state.remark = c.remark || '';
    state.date = c.date;
    state.time = c.time;
    state.calendar = c.calendar === 'lunar' ? 'lunar' : 'solar';
    if (c.displayDate && c.displayDate.year) {
      state.displayDate = c.displayDate;
    } else {
      var dd = c.date.split('-');
      var tt = c.time.split(':');
      state.displayDate = {
        year: parseInt(dd[0], 10), month: parseInt(dd[1], 10), day: parseInt(dd[2], 10),
        hour: parseInt(tt[0], 10), minute: parseInt(tt[1], 10)
      };
    }
    state.region = c.region || { name: '未知地-即北京时间', longitude: null };
    state.currentCaseId = id;
    state.resultOrigin = 'cases';
    syncInputUI();
    try {
      var r = Bazi.compute(currentInput());
      state.currentResult = r;
      renderResult(r);
      showView('result');
    } catch (e) { toast('排盘失败：' + e.message); }
  }

  var remarkTarget = null;

  function openRemarkEditor(target) {
    remarkTarget = target;
    var current = '';
    if (target === 'result') {
      current = state.remark || '';
      $('remark-dialog-title').textContent = '修改备注';
    } else {
      var c = CaseStore.get(target);
      current = c ? (c.remark || '') : '';
      $('remark-dialog-title').textContent = '修改命例备注';
    }
    $('remark-input').value = current;
    $('remark-modal').classList.remove('hidden');
    setTimeout(function () { $('remark-input').focus(); }, 50);
  }

  function saveRemark() {
    var value = $('remark-input').value.trim();
    if (remarkTarget === 'result') {
      state.remark = value;
      if (state.currentCaseId) CaseStore.update(state.currentCaseId, { remark: value });
      if (state.currentResult) {
        state.currentResult.input.remark = value;
        renderResult(state.currentResult);
      }
      toast('备注已更新');
    } else if (remarkTarget) {
      var ok = CaseStore.update(remarkTarget, { remark: value });
      if (ok) {
        if (state.currentCaseId === remarkTarget) {
          state.remark = value;
          if (state.currentResult) {
            state.currentResult.input.remark = value;
            renderResult(state.currentResult);
          }
        }
        renderCases();
        toast('备注已保存');
      } else {
        toast('保存失败');
      }
    }
    $('remark-modal').classList.add('hidden');
    remarkTarget = null;
  }

  function askConfirm(title, message, action) {
    $('confirm-title').textContent = title;
    $('confirm-message').textContent = message;
    state.confirmAction = action;
    $('confirm-modal').classList.remove('hidden');
  }

  function selectedIds() {
    return Object.keys(state.selected).filter(function (k) { return state.selected[k]; });
  }

  function exportResults(inputs, baseName) {
    var results = [];
    for (var i = 0; i < inputs.length; i++) {
      try { results.push(Bazi.compute(inputs[i])); }
      catch (e) { toast('第 ' + (i + 1) + ' 例计算失败'); }
    }
    if (!results.length) return;
    WordExport.exportWord(results, baseName).then(function (ok) {
      toast(ok ? 'Word 已导出' : '导出失败');
    }).catch(function () { toast('导出失败'); });
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    $('btn-input-back').onclick = function () { showView('cases'); };
    $('btn-goto-cases').onclick = function () { state.currentCaseId = null; showView('cases'); };
    $('btn-result-back').onclick = function () { showView(state.resultOrigin === 'cases' ? 'cases' : 'input'); };
    $('btn-result-to-input').onclick = function () { state.currentCaseId = null; showView('input'); };
    $('btn-cases-back').onclick = function () { state.currentCaseId = null; showView('input'); };
    $('btn-empty-to-input').onclick = function () { showView('input'); };

    $('input-name').oninput = function () { state.name = this.value; };
    $('input-remark').oninput = function () { state.remark = this.value; };

    document.querySelectorAll('.gender-option').forEach(function (b) {
      b.onclick = function () {
        state.gender = Number(this.dataset.gender);
        syncInputUI();
      };
    });

    $('switch-save').onclick = function () {
      state.save = !state.save;
      syncInputUI();
    };

    $('btn-pick-datetime').onclick = openPicker;
    document.querySelectorAll('.cal-tab').forEach(function (b) {
      b.onclick = function () { switchCalendar(this.dataset.cal); };
    });
    $('dt-sound-toggle').onclick = function () {
      picker.sound = !picker.sound;
      this.textContent = '声音：' + (picker.sound ? '开' : '关');
      if (picker.sound) tickSound();
    };
    document.querySelectorAll('.wheel-col').forEach(function (col) {
      col.addEventListener('scroll', onWheelScroll, { passive: true });
    });
    $('btn-datetime-confirm').onclick = function () {
      var s = pickerToSolar(picker);
      state.calendar = picker.cal;
      state.displayDate = {
        year: picker.year, month: picker.month, day: picker.day,
        hour: picker.hour, minute: picker.minute
      };
      state.date = s.year + '-' + pad(s.month) + '-' + pad(s.day);
      state.time = pad(s.hour) + ':' + pad(s.minute);
      syncInputUI();
      $('datetime-modal').classList.add('hidden');
    };

    $('btn-pick-region').onclick = function () {
      state.pendingRegionIndex = 0;
      renderRegionChips();
      $('picker-longitude').value = (typeof state.region.longitude === 'number') ? state.region.longitude : '';
      $('region-modal').classList.remove('hidden');
    };
    $('btn-region-confirm').onclick = function () {
      var custom = parseFloat($('picker-longitude').value);
      if (!isNaN(custom) && custom >= 70 && custom <= 140) {
        state.region = { name: '自定义东经' + custom + '°', longitude: custom };
      } else {
        var r = Bazi.REGIONS[state.pendingRegionIndex] || Bazi.REGIONS[0];
        state.region = { name: r.name, longitude: r.longitude };
      }
      syncInputUI();
      $('region-modal').classList.add('hidden');
    };

    $('btn-calculate').onclick = function () { calculate(); };

    $('btn-export-current').onclick = function () {
      if (!state.currentResult) { toast('请先排盘'); return; }
      var name = state.currentResult.input.name || '八字命例';
      exportResults([currentInput()], name);
    };
    $('btn-save-current').onclick = function () {
      if (!state.currentResult) { toast('请先排盘'); return; }
      if (state.currentCaseId) {
        CaseStore.update(state.currentCaseId, currentInput());
        toast('命例已更新');
      } else {
        var id = CaseStore.add(currentInput());
        if (id) { state.currentCaseId = id; toast('命例已保存'); }
        else toast('保存失败');
      }
    };

    $('btn-manage-cases').onclick = function () {
      state.manageMode = !state.manageMode;
      if (!state.manageMode) state.selected = {};
      renderCases();
    };
    $('btn-select-all').onclick = function () {
      var cases = CaseStore.list();
      var ids = cases.map(function (c) { return c.id; });
      var allSelected = ids.length > 0 && ids.every(function (id) { return state.selected[id]; });
      state.selected = {};
      if (!allSelected) ids.forEach(function (id) { state.selected[id] = true; });
      renderCases();
    };
    $('btn-export-selected').onclick = function () {
      var ids = selectedIds();
      if (!ids.length) { toast('请先勾选命例'); return; }
      var inputs = ids.map(function (id) { return CaseStore.get(id); }).filter(Boolean);
      exportResults(inputs, '八字命例_共' + inputs.length + '例');
    };
    $('btn-delete-selected').onclick = function () {
      var ids = selectedIds();
      if (!ids.length) { toast('请先勾选命例'); return; }
      askConfirm('批量删除', '确定删除选中的 ' + ids.length + ' 条命例吗？此操作不可恢复。', function () {
        var n = CaseStore.remove(ids);
        state.selected = {};
        renderCases();
        toast('已删除 ' + n + ' 条命例');
      });
    };
    $('btn-export-all').onclick = function () {
      var cases = CaseStore.list();
      if (!cases.length) { toast('没有可导出的命例'); return; }
      exportResults(cases, '八字命例_全部' + cases.length + '例');
    };
    $('btn-backup-cases').onclick = function () {
      var cases = CaseStore.list();
      if (!cases.length) { toast('没有可备份的命例'); return; }
      var blob = new Blob([CaseStore.exportJSON()], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '八字命例备份_' + todayStr() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
      toast('已备份 ' + cases.length + ' 条命例');
    };
    $('btn-import-cases').onclick = function () { $('file-import').click(); };
    $('file-import').onchange = function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var n = CaseStore.importJSON(String(reader.result));
        renderCases();
        toast(n ? '成功导入 ' + n + ' 条命例' : '导入失败或没有有效命例');
      };
      reader.readAsText(file, 'utf-8');
      this.value = '';
    };

    document.addEventListener('click', function (e) {
      var close = e.target.closest('[data-close]');
      if (close) { $(close.dataset.close).classList.add('hidden'); return; }
      var remark = e.target.closest('[data-edit-remark]');
      if (remark) { openRemarkEditor(remark.dataset.editRemark); return; }
      var del = e.target.closest('[data-del]');
      if (del) {
        e.stopPropagation();
        var id = del.dataset.del;
        askConfirm('删除命例', '确定删除这条命例吗？此操作不可恢复。', function () {
          CaseStore.remove([id]);
          if (state.currentCaseId === id) state.currentCaseId = null;
          delete state.selected[id];
          renderCases();
          toast('已删除');
        });
        return;
      }
      var check = e.target.closest('.case-check');
      if (check) {
        state.selected[check.dataset.id] = check.checked;
        check.closest('.case-item').classList.toggle('selected', check.checked);
        return;
      }
      var open = e.target.closest('[data-open]');
      if (open) { openCase(open.dataset.open); return; }
      var chip = e.target.closest('.region-chip');
      if (chip) {
        state.pendingRegionIndex = Number(chip.dataset.index);
        renderRegionChips();
      }
    });

    $('btn-remark-save').onclick = saveRemark;
    $('btn-confirm-ok').onclick = function () {
      $('confirm-modal').classList.add('hidden');
      var fn = state.confirmAction;
      state.confirmAction = null;
      if (fn) fn();
    };
  }

  function renderRegionChips() {
    $('region-list').innerHTML = Bazi.REGIONS.map(function (r, i) {
      return '<button type="button" class="region-chip' + (i === state.pendingRegionIndex ? ' selected' : '') + '" data-index="' + i + '">' + esc(r.name) + '</button>';
    }).join('');
  }

  /* ---------- 启动 ---------- */
  syncInputUI();
  bind();
})();
