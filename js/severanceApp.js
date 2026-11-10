document.addEventListener('DOMContentLoaded', () => {
  const SC = SeveranceCalculator;
  const $ = (id) => document.getElementById(id);

  const startDateInput = $('start-date');
  const endDateInput = $('end-date');
  const workingDaysHint = $('working-days-hint');
  const serviceChips = $('service-chips');

  const basePayInput = $('base-pay');
  const basePayHint = $('base-pay-hint');
  const allowanceInput = $('allowance-pay');
  const bonusInput = $('annual-bonus');
  const leaveInput = $('annual-leave');
  const calcBtn = $('calc-btn');
  const qualifyWarning = $('qualify-warning');

  // Result fields
  const rNetSev = $('r-net-sev');
  const rGrossSev = $('r-gross-sev');
  const rTaxSev = $('r-tax-sev');
  const rIrpSave = $('r-irp-save');
  const rIrpSave40 = $('r-irp-save-40');
  const rDays = $('r-days');
  const rYears = $('r-years');
  const rDailyWage = $('r-daily-wage');
  const rGrossTable = $('r-gross-table');
  const rItax = $('r-itax');
  const rLtax = $('r-ltax');
  const rTaxTotal = $('r-tax-total');
  const rEffRate = $('r-eff-rate');
  const rIrpFinal = $('r-irp-final');

  const copyBtn = $('copy-btn');
  const shareBtn = $('share-btn');
  const toastEl = $('toast');

  const digits = (v) => Number(String(v).replace(/[^0-9]/g, '')) || 0;
  const won = (n) => SC.formatWon(n) + '원';

  function initDates() {
    const today = new Date();
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(today.getFullYear() - 3);

    const fmt = (d) => d.toISOString().split('T')[0];
    startDateInput.value = fmt(threeYearsAgo);
    endDateInput.value = fmt(today);
    updateDaysHint();
  }

  function updateDaysHint() {
    const days = SC.calcWorkingDays(startDateInput.value, endDateInput.value);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    workingDaysHint.textContent = `${SC.formatWon(days)}일 (약 ${years}년 ${months}개월)`;

    if (days < 365) {
      qualifyWarning.style.display = 'block';
    } else {
      qualifyWarning.style.display = 'none';
    }
    return days;
  }

  function calculate() {
    const days = updateDaysHint();
    const basePay = digits(basePayInput.value);
    const allowance = digits(allowanceInput.value);
    const bonus = digits(bonusInput.value);
    const leave = digits(leaveInput.value);

    // Update hints
    const monthlyAvg = Math.round(basePay / 3);
    basePayHint.textContent = `${SC.formatKoreanWon(basePay)} (월 ${SC.formatKoreanWon(monthlyAvg).replace(' 원', '')})`;

    const res = SC.calculate({
      startDate: startDateInput.value,
      endDate: endDateInput.value,
      workingDays: days,
      threeMonthBase: basePay,
      threeMonthAllowance: allowance,
      annualBonus: bonus,
      annualLeaveAllowance: leave,
      threeMonthDays: 91
    });

    rNetSev.textContent = SC.formatWon(res.netSeverance);
    rGrossSev.textContent = won(res.grossSeverance);
    rTaxSev.textContent = won(res.tax.totalTax);
    rIrpSave.textContent = won(res.irp.saved30);
    rIrpSave40.textContent = won(res.irp.saved40);

    rDays.textContent = SC.formatWon(res.workingDays) + '일';
    rYears.textContent = res.serviceYears + '년';
    rDailyWage.textContent = won(res.avgDailyWage);
    rGrossTable.textContent = won(res.grossSeverance);
    rItax.textContent = won(res.tax.incomeTax);
    rLtax.textContent = won(res.tax.localTax);
    rTaxTotal.textContent = '−' + won(res.tax.totalTax);
    rEffRate.textContent = res.tax.effectiveTaxRate + '%';
    rIrpFinal.textContent = won(res.irp.taxAfter30);
  }

  function setPresetYears(years) {
    const end = new Date(endDateInput.value || new Date());
    const start = new Date(end);
    start.setFullYear(end.getFullYear() - years);
    startDateInput.value = start.toISOString().split('T')[0];

    serviceChips.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('is-active', Number(b.dataset.years) === years);
    });

    calculate();
  }

  function summaryText() {
    return `[퇴직금 계산 결과 - 데이터라이터]\n` +
      `재직기간: ${rDays.textContent} (${rYears.textContent})\n` +
      `예상 퇴직금 (세전): ${rGrossSev.textContent}\n` +
      `공제 세금: ${rTaxSev.textContent} (실효세율 ${rEffRate.textContent})\n` +
      `통장 입금액 (세후): ${rNetSev.textContent}원\n` +
      `[절세 팁] IRP로 연금 수령 시 세금 ${rIrpSave.textContent} 감면!\n${location.origin}${location.pathname}`;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // Events
  startDateInput.addEventListener('change', calculate);
  endDateInput.addEventListener('change', calculate);

  serviceChips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    setPresetYears(Number(b.dataset.years));
  });

  [basePayInput, allowanceInput, bonusInput, leaveInput].forEach((el) => {
    el.addEventListener('input', (e) => {
      e.target.value = SC.formatWon(digits(e.target.value));
      calculate();
    });
  });

  calcBtn.addEventListener('click', () => {
    calculate();
    if (window.innerWidth < 900) {
      $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(summaryText())
      .then(() => toast('결과를 복사했습니다'))
      .catch(() => toast('복사하지 못했습니다'));
  });

  shareBtn.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: '퇴직금 계산기', text: summaryText() }).catch(() => {});
    } else {
      navigator.clipboard.writeText(summaryText()).then(() => toast('링크와 결과를 복사했습니다'));
    }
  });

  initDates();
  calculate();
});
