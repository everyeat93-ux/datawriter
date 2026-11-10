document.addEventListener('DOMContentLoaded', () => {
  const UC = UnemploymentCalculator;
  const $ = (id) => document.getElementById(id);

  const wageInput = $('monthly-wage');
  const wageHint = $('wage-hint');
  const wageChips = $('wage-chips');
  const ageInput = $('age-input');
  const workHoursSelect = $('work-hours');
  const periodSelect = $('period-select');
  const disabledCheck = $('disabled-check');
  const calcBtn = $('calc-btn');

  // Result fields
  const rTotalBenefit = $('r-total-benefit');
  const rDays = $('r-days');
  const rMonthly = $('r-monthly');
  const rEarly = $('r-early');
  const rDaily = $('r-daily');
  const rMonthlyTable = $('r-monthly-table');
  const rDaysTable = $('r-days-table');
  const rAvgWage = $('r-avg-wage');
  const rCapStatus = $('r-cap-status');
  const rSumTotal = $('r-sum-total');

  const copyBtn = $('copy-btn');
  const shareBtn = $('share-btn');
  const toastEl = $('toast');

  const digits = (v) => Number(String(v).replace(/[^0-9]/g, '')) || 0;
  const won = (n) => UC.formatWon(n) + '원';

  function calculate() {
    const wage = digits(wageInput.value);
    wageHint.textContent = UC.formatKoreanWon(wage);

    const res = UC.calculate({
      monthlyWage: wage,
      age: Number(ageInput.value) || 35,
      dailyWorkingHours: Number(workHoursSelect.value) || 8,
      insuredPeriod: periodSelect.value,
      isDisabled: disabledCheck.checked
    });

    rTotalBenefit.textContent = UC.formatWon(res.totalBenefit);
    rDays.textContent = `${res.benefitDays}일 (약 ${res.months}개월)`;
    rMonthly.textContent = won(res.monthlyBenefit);
    rEarly.textContent = won(res.earlyReemploymentAllowance);

    rDaily.textContent = won(res.dailyBenefit);
    rMonthlyTable.textContent = won(res.monthlyBenefit);
    rDaysTable.textContent = `${res.benefitDays}일 (약 ${res.months}개월)`;
    rAvgWage.textContent = won(res.avgDailyWage);

    if (res.isCapped) {
      rCapStatus.textContent = '상한액 적용 (66,000원)';
      rCapStatus.style.color = 'var(--brand)';
    } else if (res.isFloor) {
      rCapStatus.textContent = '하한액 적용 (최저임금 80%)';
      rCapStatus.style.color = 'var(--ink-2)';
    } else {
      rCapStatus.textContent = '평균임금의 60% 적용';
      rCapStatus.style.color = 'var(--ink-2)';
    }

    rSumTotal.textContent = won(res.totalBenefit);
  }

  function summaryText() {
    return `[2026 실업급여 모의계산 결과 - 데이터라이터]\n` +
      `지급기간: ${rDays.textContent}\n` +
      `1일 구직급여액: ${rDaily.textContent}\n` +
      `월 예상액: ${rMonthly.textContent}\n` +
      `총 예상 수급액: ${rTotalBenefit.textContent}원\n` +
      `[수령 팁] 조기재취업수당: 최대 ${rEarly.textContent}\n${location.origin}${location.pathname}`;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // Events
  wageInput.addEventListener('input', (e) => {
    e.target.value = UC.formatWon(digits(e.target.value));
    calculate();
  });

  wageChips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const val = Number(b.dataset.val);
    wageInput.value = UC.formatWon(val);
    wageChips.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.val) === val);
    });
    calculate();
  });

  [ageInput, workHoursSelect, periodSelect, disabledCheck].forEach((el) => {
    el.addEventListener('change', calculate);
    el.addEventListener('input', calculate);
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
      navigator.share({ title: '실업급여 계산기', text: summaryText() }).catch(() => {});
    } else {
      navigator.clipboard.writeText(summaryText()).then(() => toast('링크와 결과를 복사했습니다'));
    }
  });

  calculate();
});
