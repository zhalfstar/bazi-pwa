/* 应用主逻辑 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
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

  var state = {
    name: '',
    gender: 1,
    remark: '',
    date: todayStr(),
    time: timeStr(),
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
    var d = state.date.split('-');
    $('datetime-text').textContent = '公历：' + d[0] + '年' + Number(d[1]) + '月' + Number(d[2]) + '日 ' + state.time;
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
    if (r.input.remark) info += '<p>备注：' + esc(r.input.remark) + '</p>';

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
      var meta = c.date + ' ' + c.time + ' · ' + ((c.region && c.region.name) || '未知地');
      return '<div class="case-item' + (selected ? ' selected' : '') + '" data-id="' + esc(c.id) + '">'
        + '<input type="checkbox" class="case-check" ' + (selected ? 'checked' : '') + ' data-id="' + esc(c.id) + '" aria-label="选择命例">'
        + '<div class="case-main" data-open="' + esc(c.id) + '">'
        + '<div class="case-name">' + esc(c.name || '未命名') + '<span class="case-gender">' + (c.gender === 0 ? '女' : '男') + '</span></div>'
        + '<div class="case-meta">' + esc(meta) + '</div>'
        + (c.remark ? '<div class="case-remark">' + esc(c.remark) + '</div>' : '')
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

    $('btn-pick-datetime').onclick = function () {
      $('picker-date').value = state.date;
      $('picker-time').value = state.time;
      $('datetime-modal').classList.remove('hidden');
    };
    $('btn-datetime-confirm').onclick = function () {
      if (!$('picker-date').value || !$('picker-time').value) { toast('请选择完整日期和时间'); return; }
      state.date = $('picker-date').value;
      state.time = $('picker-time').value;
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
