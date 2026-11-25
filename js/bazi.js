/* 八字排盘计算模块：基于 lunar-javascript（本地化，无需联网） */
(function (global) {
  'use strict';

  var Solar = global.Solar;
  var LunarUtil = global.LunarUtil;

  var SHEN_ABBR = {
    '日主': '日',
    '比肩': '比', '劫财': '劫',
    '食神': '食', '伤官': '伤',
    '正财': '才', '偏财': '财',
    '正官': '官', '七杀': '杀', '偏官': '杀',
    '正印': '印', '偏印': '枭'
  };

  var DISHI_ABBR = {
    '长生': '长', '沐浴': '沐', '冠带': '冠', '临官': '临',
    '帝旺': '帝', '衰': '衰', '病': '病', '死': '死',
    '墓': '墓', '绝': '绝', '胎': '胎', '养': '养'
  };

  var REGIONS = [
    { name: '未知地-即北京时间', longitude: null },
    { name: '北京', longitude: 116.4 },
    { name: '上海', longitude: 121.5 },
    { name: '广州', longitude: 113.3 },
    { name: '深圳', longitude: 114.1 },
    { name: '成都', longitude: 104.1 },
    { name: '重庆', longitude: 106.5 },
    { name: '杭州', longitude: 120.2 },
    { name: '南京', longitude: 118.8 },
    { name: '武汉', longitude: 114.3 },
    { name: '西安', longitude: 108.9 },
    { name: '天津', longitude: 117.2 },
    { name: '沈阳', longitude: 123.4 },
    { name: '哈尔滨', longitude: 126.6 },
    { name: '香港', longitude: 114.2 },
    { name: '台北', longitude: 121.5 },
    { name: '乌鲁木齐', longitude: 87.6 },
    { name: '拉萨', longitude: 91.1 }
  ];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function parseDateTime(dateStr, timeStr) {
    var d = String(dateStr || '').split('-');
    var t = String(timeStr || '00:00').split(':');
    return {
      year: parseInt(d[0], 10),
      month: parseInt(d[1], 10),
      day: parseInt(d[2], 10),
      hour: parseInt(t[0], 10),
      minute: parseInt(t[1], 10)
    };
  }

  function shiftMinutes(dt, minutes) {
    var base = new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, 0);
    var shifted = new Date(base.getTime() + minutes * 60000);
    return {
      year: shifted.getFullYear(),
      month: shifted.getMonth() + 1,
      day: shifted.getDate(),
      hour: shifted.getHours(),
      minute: shifted.getMinutes()
    };
  }

  function fmtBeijing(dt) {
    return dt.year + '年' + dt.month + '月' + dt.day + '日' + pad(dt.hour) + '时' + pad(dt.minute) + '分';
  }

  function fmtShort(dt) {
    return dt.year + '-' + pad(dt.month) + '-' + pad(dt.day) + ' ' + pad(dt.hour) + ':' + pad(dt.minute);
  }

  function ageText(dt) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var birthday = new Date(now.getFullYear(), dt.month - 1, dt.day);
    var age = now.getFullYear() - dt.year;
    if (today < birthday) {
      age -= 1;
      birthday = new Date(now.getFullYear() - 1, dt.month - 1, dt.day);
    }
    var days = Math.floor((today - birthday) / 86400000);
    if (days < 0) days = 0;
    return age + '岁,' + days + '天';
  }

  function timeZhiName(hour) {
    var idx = Math.floor(((hour % 24) + 1) / 2) % 12;
    return LunarUtil.ZHI[idx + 1] + '时';
  }

  function shen(dayGan, gan) {
    var full = LunarUtil.SHI_SHEN[dayGan + gan];
    return SHEN_ABBR[full] || full || '';
  }

  function dishi(dayGan, zhi) {
    var offset = LunarUtil.CHANG_SHENG_OFFSET[dayGan];
    // 地支索引用 0-11（子=0），与库内部 getZhiIndex 一致
    var zhiIndex = LunarUtil.ZHI.indexOf(zhi) - 1;
    var ganIndex = LunarUtil.GAN.indexOf(dayGan) - 1;
    var index = offset + (ganIndex % 2 === 0 ? zhiIndex : -zhiIndex);
    index = ((index % 12) + 12) % 12;
    var full = LunarUtil.CHANG_SHENG[index];
    return DISHI_ABBR[full] || full || '';
  }

  /**
   * 计算八字
   * @param {Object} input
   *   date: 'YYYY-MM-DD'（北京时间日期）
   *   time: 'HH:mm'（北京时间）
   *   gender: 1 男 / 0 女
   *   region: {name, longitude}
   */
  function compute(input) {
    var beijing = parseDateTime(input.date, input.time);
    var longitude = input.region && typeof input.region.longitude === 'number'
      ? input.region.longitude : null;

    var solarTime = beijing;
    var correctionMinutes = null;
    if (longitude !== null) {
      correctionMinutes = (longitude - 120) * 4;
      solarTime = shiftMinutes(beijing, correctionMinutes);
    }

    var solar = Solar.fromYmdHms(
      solarTime.year, solarTime.month, solarTime.day,
      solarTime.hour, solarTime.minute, 0
    );
    var lunar = solar.getLunar();
    var ec = lunar.getEightChar();

    var dayGan = ec.getDayGan();
    var names = ['年', '月', '日', '时'];
    var ganzhi = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()];
    var hideGans = [ec.getYearHideGan(), ec.getMonthHideGan(), ec.getDayHideGan(), ec.getTimeHideGan()];
    var hideShens = [ec.getYearShiShenZhi(), ec.getMonthShiShenZhi(), ec.getDayShiShenZhi(), ec.getTimeShiShenZhi()];
    var ganShens = [ec.getYearShiShenGan(), ec.getMonthShiShenGan(), ec.getDayShiShenGan(), ec.getTimeShiShenGan()];
    var dishis = [ec.getYearDiShi(), ec.getMonthDiShi(), ec.getDayDiShi(), ec.getTimeDiShi()];
    var nayins = [ec.getYearNaYin(), ec.getMonthNaYin(), ec.getDayNaYin(), ec.getTimeNaYin()];

    var pillars = [];
    for (var i = 0; i < 4; i++) {
      pillars.push({
        label: names[i],
        ganShen: SHEN_ABBR[ganShens[i]] || ganShens[i],
        gan: ganzhi[i].charAt(0),
        zhi: ganzhi[i].charAt(1),
        hide: (hideGans[i] || []).map(function (g) { return g; }).join(''),
        hideShen: (hideShens[i] || []).map(function (s) { return SHEN_ABBR[s] || s; }).join(''),
        dishi: DISHI_ABBR[dishis[i]] || dishis[i],
        nayin: nayins[i]
      });
    }

    // 大运（性别 1=男，0=女；1=1 派排法）
    var yun = ec.getYun(input.gender === 0 ? 0 : 1, 1);
    var startSolar = yun.getStartSolar();
    var startLunar = Solar.fromYmd(startSolar.getYear(), startSolar.getMonth(), startSolar.getDay()).getLunar();
    var dayunRaw = yun.getDaYun(9).slice(1);
    var dayun = dayunRaw.map(function (d) {
      var gz = d.getGanZhi() || '';
      var gan = gz.charAt(0);
      var zhi = gz.charAt(1);
      return {
        shen: gan ? shen(dayGan, gan) : '',
        gan: gan,
        zhi: zhi,
        age: d.getStartAge(),
        year: d.getStartYear(),
        dishi: zhi ? dishi(dayGan, zhi) : ''
      };
    });

    var correctionText = null;
    if (correctionMinutes !== null) {
      var sign = correctionMinutes >= 0 ? '+' : '−';
      correctionText = '真太阳时：' + fmtShort(solarTime) + '（经度校正 ' + sign + Math.abs(Math.round(correctionMinutes)) + ' 分钟）';
    }

    return {
      input: {
        name: input.name || '',
        gender: input.gender === 0 ? 0 : 1,
        remark: input.remark || '',
        date: input.date,
        time: input.time,
        region: input.region || REGIONS[0]
      },
      beijing: beijing,
      solarTime: solarTime,
      correctionText: correctionText,
      beijingText: fmtBeijing(beijing),
      lunarText: solar.getYear() + '年' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() + '日' + timeZhiName(solarTime.hour),
      weekday: '星期' + solar.getWeekInChinese(),
      ageText: ageText(beijing),
      pillars: pillars,
      yun: {
        startText: '命主从' + yun.getStartYear() + '岁' + yun.getStartMonth() + '月' + yun.getStartDay() + '天开始行大运',
        jiaoText: '于每一交运年的' + startLunar.getMonthInChinese() + '月' + startLunar.getDayInChinese() + '日交运',
        list: dayun
      }
    };
  }

  global.Bazi = {
    compute: compute,
    REGIONS: REGIONS,
    formatShort: fmtShort,
    shenAbbr: function (s) { return SHEN_ABBR[s] || s; }
  };
})(window);
