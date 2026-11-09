/**
 * 주휴수당 계산기 UI 인터랙션 스크립트
 */

(function () {
  'use strict';

  // Elements
  const elHourlyWage = document.getElementById('hourly-wage');
  const elDailyHours = document.getElementById('daily-hours');
  const elDaysPerWeek = document.getElementById('days-per-week');
  const elTaxTypeRadios = document.querySelectorAll('input[name="tax_type"]');

  // Outputs
  const elResultMonthlyGross = document.getElementById('result-monthly-gross');
  const elResultMonthlyNet = document.getElementById('result-monthly-net');
  const elResultWeeklyHolidayPay = document.getElementById('result-weekly-holiday-pay');
  const elResultMonthlyHolidayPay = document.getElementById('result-monthly-holiday-pay');
  const elResultWeeklyHours = document.getElementById('result-weekly-hours');
  const elResultHolidayHours = document.getElementById('result-holiday-hours');
  const elResultMonthlyBasePay = document.getElementById('result-monthly-base-pay');
  const elResultEffectiveHourly = document.getElementById('result-effective-hourly');
  const elResultDeduction = document.getElementById('result-deduction');
  const elStatusBadge = document.getElementById('status-badge');

  const elCopyBtn = document.getElementById('copy-btn');
  const elToast = document.getElementById('toast');

  function formatKRW(val) {
    return Math.round(val || 0).toLocaleString('ko-KR') + '원';
  }

  function parseNumber(str) {
    if (!str) return 0;
    const clean = String(str).replace(/[^\d.-]/g, '');
    return parseFloat(clean) || 0;
  }

  function bindNumberInput(input, onUpdate) {
    input.addEventListener('input', () => {
      const pos = input.selectionStart;
      const prevLen = input.value.length;
      const num = parseNumber(input.value);
      input.value = num ? num.toLocaleString('ko-KR') : '';
      const newLen = input.value.length;
      const nextPos = Math.max(0, pos + (newLen - prevLen));
      input.setSelectionRange(nextPos, nextPos);
      onUpdate();
    });
  }

  function showToast(msg) {
    if (!elToast) return;
    elToast.textContent = msg;
    elToast.classList.add('is-visible');
    setTimeout(() => {
      elToast.classList.remove('is-visible');
    }, 2400);
  }

  function getTaxType() {
    let selected = 'four_major';
    elTaxTypeRadios.forEach(r => {
      if (r.checked) selected = r.value;
    });
    return selected;
  }

  function recalculate() {
    const hourlyWage = parseNumber(elHourlyWage.value);
    const dailyHours = parseFloat(elDailyHours.value) || 0;
    const daysPerWeek = parseFloat(elDaysPerWeek.value) || 0;
    const taxType = getTaxType();

    const res = HolidayPayCalculator.calculate({
      hourlyWage,
      dailyHours,
      daysPerWeek,
      taxType
    });

    if (elResultMonthlyGross) elResultMonthlyGross.textContent = formatKRW(res.monthlyTotalGross);
    if (elResultMonthlyNet) elResultMonthlyNet.textContent = formatKRW(res.monthlyNetPay);
    if (elResultWeeklyHolidayPay) elResultWeeklyHolidayPay.textContent = formatKRW(res.weeklyHolidayPay);
    if (elResultMonthlyHolidayPay) elResultMonthlyHolidayPay.textContent = formatKRW(res.monthlyHolidayPay);
    if (elResultWeeklyHours) elResultWeeklyHours.textContent = res.weeklyHours + '시간';
    if (elResultHolidayHours) elResultHolidayHours.textContent = (res.isEligible ? `주 ${res.weeklyHolidayHours}시간` : '0시간 (미지급)');
    if (elResultMonthlyBasePay) elResultMonthlyBasePay.textContent = formatKRW(res.monthlyBasePay);
    if (elResultEffectiveHourly) elResultEffectiveHourly.textContent = formatKRW(res.effectiveHourlyWage);
    if (elResultDeduction) elResultDeduction.textContent = '-' + formatKRW(res.deductions.totalDeduction);

    if (elStatusBadge) {
      if (res.isEligible) {
        elStatusBadge.className = 'status-badge is-eligible';
        elStatusBadge.textContent = '주휴수당 지급 대상 (주 15시간 이상)';
      } else {
        elStatusBadge.className = 'status-badge is-ineligible';
        elStatusBadge.textContent = '지급 대상 아님 (주 15시간 미만 초단시간)';
      }
    }
  }

  bindNumberInput(elHourlyWage, recalculate);
  elDailyHours.addEventListener('input', recalculate);
  elDaysPerWeek.addEventListener('input', recalculate);

  elTaxTypeRadios.forEach(r => {
    r.addEventListener('change', recalculate);
  });

  // Preset buttons
  document.querySelectorAll('[data-preset-wage]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wage = parseInt(btn.dataset.presetWage, 10);
      elHourlyWage.value = wage.toLocaleString('ko-KR');
      recalculate();
    });
  });

  // Copy result
  if (elCopyBtn) {
    elCopyBtn.addEventListener('click', () => {
      const weekly = elResultWeeklyHolidayPay ? elResultWeeklyHolidayPay.textContent : '';
      const monthlyHoliday = elResultMonthlyHolidayPay ? elResultMonthlyHolidayPay.textContent : '';
      const monthlyTotal = elResultMonthlyGross ? elResultMonthlyGross.textContent : '';
      const net = elResultMonthlyNet ? elResultMonthlyNet.textContent : '';

      const text = `[데이터라이터 주휴수당 & 알바 실수령액 계산 결과]\n• 1주일 주휴수당: ${weekly}\n• 1달 주휴수당: ${monthlyHoliday}\n• 월 총급여(기본+주휴): ${monthlyTotal}\n• 예상 실수령액: ${net}\n\n계산기 바로가기: https://www.datawriter.co.kr/holiday-pay.html`;

      navigator.clipboard.writeText(text).then(() => {
        showToast('계산 결과가 복사되었습니다.');
      }).catch(() => {
        showToast('복사에 실패했습니다.');
      });
    });
  }

  recalculate();

})();
