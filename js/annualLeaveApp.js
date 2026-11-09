/**
 * 연차수당 계산기 UI 인터랙션 스크립트
 */

(function () {
  'use strict';

  // Elements
  const elSalaryTypeAnnual = document.getElementById('salary-annual');
  const elSalaryTypeMonthly = document.getElementById('salary-monthly');
  const elGroupMonthly = document.getElementById('group-monthly');
  const elGroupAnnual = document.getElementById('group-annual');

  const elMonthlyBase = document.getElementById('monthly-base');
  const elAnnualSalary = document.getElementById('annual-salary');
  const elFixedAllowances = document.getElementById('fixed-allowances');
  const elWeeklyHours = document.getElementById('weekly-hours');
  const elDailyHours = document.getElementById('daily-hours');
  const elUnusedDays = document.getElementById('unused-days');

  // Outputs
  const elResultTotalGross = document.getElementById('result-total-gross');
  const elResultEstimatedNet = document.getElementById('result-estimated-net');
  const elResultHourlyWage = document.getElementById('result-hourly-wage');
  const elResultDailyWage = document.getElementById('result-daily-wage');
  const elResultMonthlyWage = document.getElementById('result-monthly-wage');
  const elResultMonthlyHours = document.getElementById('result-monthly-hours');
  const elResultTax = document.getElementById('result-tax');
  const elResultDays = document.getElementById('result-days');

  const elCopyBtn = document.getElementById('copy-btn');
  const elToast = document.getElementById('toast');

  let currentSalaryType = 'monthly';

  // Number formatting
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

  function recalculate() {
    const monthlyBase = parseNumber(elMonthlyBase.value);
    const annualSalary = parseNumber(elAnnualSalary.value);
    const fixedAllowances = parseNumber(elFixedAllowances.value);
    const weeklyHours = parseFloat(elWeeklyHours.value) || 40;
    const dailyHours = parseFloat(elDailyHours.value) || 8;
    const unusedDays = parseFloat(elUnusedDays.value) || 0;

    const res = AnnualLeaveCalculator.calculate({
      salaryType: currentSalaryType,
      monthlyBase,
      annualSalary,
      fixedAllowances,
      weeklyHours,
      dailyHours,
      unusedDays
    });

    if (elResultTotalGross) elResultTotalGross.textContent = formatKRW(res.totalGross);
    if (elResultEstimatedNet) elResultEstimatedNet.textContent = formatKRW(res.estimatedNet);
    if (elResultHourlyWage) elResultHourlyWage.textContent = formatKRW(res.hourlyWage);
    if (elResultDailyWage) elResultDailyWage.textContent = formatKRW(res.dailyWage);
    if (elResultMonthlyWage) elResultMonthlyWage.textContent = formatKRW(res.monthlyWage);
    if (elResultMonthlyHours) elResultMonthlyHours.textContent = res.monthlyHours + '시간';
    if (elResultTax) elResultTax.textContent = formatKRW(res.estimatedTax);
    if (elResultDays) elResultDays.textContent = res.unusedDays + '일';
  }

  // Type toggling
  if (elSalaryTypeMonthly && elSalaryTypeAnnual) {
    elSalaryTypeMonthly.addEventListener('change', () => {
      currentSalaryType = 'monthly';
      elGroupMonthly.style.display = 'block';
      elGroupAnnual.style.display = 'none';
      recalculate();
    });

    elSalaryTypeAnnual.addEventListener('change', () => {
      currentSalaryType = 'annual';
      elGroupMonthly.style.display = 'none';
      elGroupAnnual.style.display = 'block';
      recalculate();
    });
  }

  // Bind inputs
  bindNumberInput(elMonthlyBase, recalculate);
  bindNumberInput(elAnnualSalary, recalculate);
  bindNumberInput(elFixedAllowances, recalculate);

  elWeeklyHours.addEventListener('input', recalculate);
  elDailyHours.addEventListener('input', recalculate);
  elUnusedDays.addEventListener('input', recalculate);

  // Quick chips for days
  document.querySelectorAll('[data-adjust-days]').forEach(btn => {
    btn.addEventListener('click', () => {
      const adj = parseFloat(btn.dataset.adjustDays) || 0;
      let cur = parseFloat(elUnusedDays.value) || 0;
      cur = Math.max(0, Math.round((cur + adj) * 10) / 10);
      elUnusedDays.value = cur;
      recalculate();
    });
  });

  // Copy result
  if (elCopyBtn) {
    elCopyBtn.addEventListener('click', () => {
      const gross = elResultTotalGross ? elResultTotalGross.textContent : '';
      const net = elResultEstimatedNet ? elResultEstimatedNet.textContent : '';
      const daily = elResultDailyWage ? elResultDailyWage.textContent : '';
      const days = elResultDays ? elResultDays.textContent : '';

      const text = `[데이터라이터 미사용 연차수당 계산 결과]\n• 미사용 연차: ${days}\n• 1일 통상임금: ${daily}\n• 총 수당(세전): ${gross}\n• 예상 실수령액: ${net}\n\n계산기 바로가기: https://www.datawriter.co.kr/annual-leave.html`;

      navigator.clipboard.writeText(text).then(() => {
        showToast('계산 결과가 클립보드에 복사되었습니다.');
      }).catch(() => {
        showToast('복사에 실패했습니다.');
      });
    });
  }

  // Initial calculation
  recalculate();

})();
