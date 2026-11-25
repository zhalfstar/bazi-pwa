/* 规整 Word（.docx）导出模块：纯前端生成 OOXML，无需服务端 */
(function (global) {
  'use strict';

  var JSZip = global.JSZip;

  var NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function run(text, o) {
    o = o || {};
    var pr = '<w:rPr>';
    pr += '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="' + (o.font || '宋体') + '"/>';
    if (o.bold) pr += '<w:b/><w:bCs/>';
    if (o.color) pr += '<w:color w:val="' + o.color + '"/>';
    if (o.size) pr += '<w:sz w:val="' + o.size + '"/><w:szCs w:val="' + o.size + '"/>';
    pr += '</w:rPr>';
    var t = String(text == null ? '' : text).split('\n');
    var body = '';
    t.forEach(function (line, i) {
      if (i > 0) body += '<w:br/>';
      body += '<w:t xml:space="preserve">' + esc(line) + '</w:t>';
    });
    return '<w:r>' + pr + body + '</w:r>';
  }

  function para(content, o) {
    o = o || {};
    var pPr = '<w:pPr>';
    pPr += '<w:jc w:val="' + (o.align || 'left') + '"/>';
    if (o.before || o.after || o.line) {
      pPr += '<w:spacing' +
        (o.before ? ' w:before="' + o.before + '"' : '') +
        (o.after ? ' w:after="' + o.after + '"' : '') +
        (o.line ? ' w:line="' + o.line + '" w:lineRule="auto"' : '') +
        '/>';
    }
    if (o.keepNext) pPr += '<w:keepNext/>';
    pPr += '</w:pPr>';
    return '<w:p>' + pPr + (content || '') + '</w:p>';
  }

  function cellPara(text, o) {
    o = o || {};
    var pPr = '<w:pPr><w:jc w:val="' + (o.align || 'center') + '"/><w:spacing w:before="40" w:after="40"/></w:pPr>';
    return '<w:p>' + pPr + run(text, o) + '</w:p>';
  }

  function cell(content, w, fill) {
    return '<w:tc><w:tcPr>' +
      '<w:tcW w:w="' + w + '" w:type="dxa"/>' +
      '<w:shd w:val="clear" w:color="auto" w:fill="' + (fill || 'FFFFFF') + '"/>' +
      '<w:vAlign w:val="center"/>' +
      '</w:tcPr>' + content + '</w:tc>';
  }

  function table(rows, widths) {
    var total = widths.reduce(function (a, b) { return a + b; }, 0);
    var borders = '';
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].forEach(function (edge) {
      borders += '<w:' + edge + ' w:val="single" w:sz="6" w:space="0" w:color="A6A6A6"/>';
    });
    var xml = '<w:tbl><w:tblPr>' +
      '<w:tblW w:w="' + total + '" w:type="dxa"/>' +
      '<w:tblBorders>' + borders + '</w:tblBorders>' +
      '<w:tblLayout w:type="fixed"/>' +
      '<w:jc w:val="center"/>' +
      '</w:tblPr><w:tblGrid>';
    widths.forEach(function (w) { xml += '<w:gridCol w:w="' + w + '"/>'; });
    xml += '</w:tblGrid>';
    rows.forEach(function (row) { xml += '<w:tr>' + row + '</w:tr>'; });
    return xml + '</w:tbl>';
  }

  function sectionTitle(text) {
    return para(run(text, { bold: true, size: 28, color: '333333' }), { before: 240, after: 120, keepNext: true });
  }

  function infoLine(label, value) {
    return para(run(label, { bold: true, size: 21 }) + run('：' + (value || ''), { size: 21 }), { after: 40 });
  }

  function buildPillarsTable(result) {
    var labelW = 1500;
    var colW = 2062;
    var widths = [labelW, colW, colW, colW, colW];
    var header = [cell(cellPara('项目', { bold: true, size: 21 }), labelW, 'EDEDED')];
    ['年柱', '月柱', '日柱', '时柱'].forEach(function (name) {
      header.push(cell(cellPara(name, { bold: true, size: 22 }), colW, 'EDEDED'));
    });
    var rows = [header.join('')];

    function addRow(label, values, opts) {
      opts = opts || {};
      var r = [cell(cellPara(label, { bold: true, size: 21 }), labelW, 'F7F7F7')];
      values.forEach(function (v) {
        r.push(cell(cellPara(v, {
          size: opts.size || 21,
          bold: !!opts.bold,
          color: opts.color || '000000',
          font: opts.font || '宋体'
        }), colW, 'FFFFFF'));
      });
      rows.push(r.join(''));
    }

    addRow('十神', result.pillars.map(function (p) { return p.ganShen; }));
    addRow('天干', result.pillars.map(function (p) { return p.gan; }), { size: 36, bold: true, color: 'F0451F', font: '微软雅黑' });
    addRow('地支', result.pillars.map(function (p) { return p.zhi; }), { size: 36, bold: true, color: 'F0451F', font: '微软雅黑' });
    addRow('藏干', result.pillars.map(function (p) { return p.hide; }));
    addRow('藏干十神', result.pillars.map(function (p) { return p.hideShen; }));
    addRow('十二长生', result.pillars.map(function (p) { return p.dishi; }));
    addRow('纳音', result.pillars.map(function (p) { return p.nayin; }), { color: '8E44AD' });
    return table(rows, widths);
  }

  function buildDayunTable(result) {
    var list = result.yun.list || [];
    if (!list.length) return '';
    var labelW = 1180;
    var colW = Math.floor((9746 - labelW) / list.length);
    var widths = [labelW];
    for (var i = 0; i < list.length; i++) widths.push(colW);

    var header = [cell(cellPara('项目', { bold: true, size: 20 }), labelW, 'EDEDED')];
    list.forEach(function (_, i) {
      header.push(cell(cellPara('第' + (i + 1) + '运', { bold: true, size: 19 }), colW, 'EDEDED'));
    });
    var rows = [header.join('')];

    function addRow(label, values, opts) {
      opts = opts || {};
      var r = [cell(cellPara(label, { bold: true, size: 19 }), labelW, 'F7F7F7')];
      values.forEach(function (v) {
        r.push(cell(cellPara(v, {
          size: opts.size || 19,
          bold: !!opts.bold,
          color: opts.color || '000000'
        }), colW, 'FFFFFF'));
      });
      rows.push(r.join(''));
    }

    addRow('十神', list.map(function (d) { return d.shen; }));
    addRow('天干', list.map(function (d) { return d.gan; }), { size: 28, bold: true, color: '2F5FE0' });
    addRow('地支', list.map(function (d) { return d.zhi; }), { size: 28, bold: true, color: '2F5FE0' });
    addRow('起运岁', list.map(function (d) { return String(d.age); }));
    addRow('交运年', list.map(function (d) { return String(d.year); }));
    addRow('地势', list.map(function (d) { return d.dishi; }), { color: 'C81E1E' });
    return table(rows, widths);
  }

  function buildCaseBody(result, index, total) {
    var html = '';
    if (index > 0) {
      html += para(run('', {}), { after: 0 }) ;
      html += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }
    html += para(run('八字排盘命例', { bold: true, size: 36, font: '微软雅黑' }), { align: 'center', after: 80 });
    if (total > 1) {
      html += para(run('第 ' + (index + 1) + ' / ' + total + ' 例', { size: 18, color: '777777' }), { align: 'center', after: 120 });
    }
    var inp = result.input;
    html += infoLine('姓名', inp.name || '未填写');
    html += infoLine('性别', inp.gender === 0 ? '女' : '男');
    html += infoLine('出生地区', (inp.region && inp.region.name) || '未知地');
    html += infoLine('北京时间', result.beijingText);
    if (result.correctionText) html += infoLine('真太阳时', result.correctionText.replace(/^真太阳时：/, ''));
    html += infoLine('农历', result.lunarText);
    html += infoLine('年龄', result.ageText + '，' + result.weekday);
    html += infoLine('备注', inp.remark || '无');
    html += infoLine('四柱', result.pillars.map(function (p) { return p.gan + p.zhi; }).join('  '));

    html += sectionTitle('一、四柱排盘');
    html += buildPillarsTable(result);

    html += sectionTitle('二、大运');
    html += para(run(result.yun.startText, { size: 21 }), { after: 40 });
    html += para(run(result.yun.jiaoText, { size: 21 }), { after: 80 });
    html += buildDayunTable(result);

    html += para(run('本命例由「八字排盘」生成 · 导出时间：' + new Date().toLocaleString('zh-CN'), { size: 16, color: '999999' }), { align: 'center', before: 240 });
    return html;
  }

  function buildDocument(results) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="' + NS_W + '"><w:body>' +
      results.map(function (r, i) { return buildCaseBody(r, i, results.length); }).join('') +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1134" w:right="1080" w:bottom="1134" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>' +
      '</w:sectPr></w:body></w:document>';
  }

  var CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    '</Types>';

  var ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
    '</Relationships>';

  var DOC_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="' + NS_W + '">' +
    '<w:docDefaults><w:rPrDefault><w:rPr>' +
    '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体"/><w:sz w:val="21"/><w:szCs w:val="21"/>' +
    '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    '</w:styles>';

  function coreProps() {
    var now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>八字排盘命例</dc:title><dc:creator>八字排盘</dc:creator><cp:lastModifiedBy>八字排盘</cp:lastModifiedBy>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created>' +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
      '</cp:coreProperties>';
  }

  var APP_PROPS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
    '<Application>八字排盘</Application><AppVersion>1.0</AppVersion></Properties>';

  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /**
   * 导出 Word 文件
   * @param {Array} results Bazi.compute() 的结果数组
   * @param {String} baseName 文件名前缀
   */
  function exportWord(results, baseName) {
    if (!results || !results.length) return Promise.resolve(false);
    var zip = new JSZip();
    zip.file('[Content_Types].xml', CONTENT_TYPES);
    zip.file('_rels/.rels', ROOT_RELS);
    zip.file('word/document.xml', buildDocument(results));
    zip.file('word/styles.xml', STYLES);
    zip.file('word/_rels/document.xml.rels', DOC_RELS);
    zip.file('docProps/core.xml', coreProps());
    zip.file('docProps/app.xml', APP_PROPS);

    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (baseName || '八字命例') + '_' + stamp() + '.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
        return true;
      });
  }

  global.WordExport = { exportWord: exportWord, _buildDocument: buildDocument };
})(window);
