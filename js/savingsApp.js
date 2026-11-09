/**
 * 예적금 이자 & 청년도약계좌 계산기 UI 인터랙션 스크립트
 */

(function () {
  'use strict';

  // Elements - Mode buttons
  const btnModeInstallment = document.getElementById('mode-installment');
  const btnModeDeposit = document.getElementById('mode-deposit');
  const btnModeYouth = document.getElementById('mode-youth');

  // Input groups
  const groupInstallment = document.getElementById('group-installment');
  const groupDeposit = document.getElementById('group-deposit');
  const groupYouth = document.getElementById('group-youth');
  const groupCommonPeriod = document.getElementById('group-common-period');
  const groupCommonTax = document.getElementById('group-common-tax');
  const groupCommonCalcType = document.getElementById('group-common-calc-type');

  // Inputs
  const elMonthlyDeposit = document.getElementById('monthly-deposit');
  const elDepositPrincipal = document.getElementById('deposit-principal');
  const elYouthDeposit = document.getElementById('youth-deposit');
  const elYouthIncome = document.getElementById('youth-income');
  const elMonths = document.getElementById('period-months');
  const elRate = document.getElementById('interest-rate');
  const elRateYouth = document.getElementById('youth-rate');
  const elTaxRadios = document.querySelectorAll('input[name="tax_type"]');
  const elCalcTypeRadios = document.querySelectorAll('input[name="calc_type"]');

  // Outputs
  const elResultTotalPayout = document.getElementById('result-total-payout');
  const elResultNetInterest = document.getElementById('result-net-interest');
  const elResultPrincipal = document.getElementById('result-principal');
  const elResultGrossInterest = document.getElementById('result-gross-interest');
  const elResultTax = document.getElementById('result-tax');
  const elResultGovContributionRow = document.getElementById('row-gov-contribution');
  const elResultGovContribution = document.getElementById('result-gov-contribution');
  const elResultTaxSavedRow = document.getElementById('row-tax-saved');
  const elResultTaxSaved = document.getElementById('result-tax-saved');

  const elCopyBtn = document.getElementById('copy-btn');
  const elToast = document.getElementById('toast');

  let currentMode = 'installment'; // 'installment' | 'deposit' | 'youth'

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
    let selected = 'general';
    elTaxRadios.forEach(r => { if (r.checked) selected = r.value; });
    return selected;
  }

  function getCalcType() {
    let selected = 'simple';
    elCalcTypeRadios.forEach(r => { if (r.checked) selected = r.value; });
    return selected;
  }

  function setMode(mode) {
    currentMode = mode;
    btnModeInstallment.classList.toggle('is-active', mode === 'installment');
    btnModeDeposit.classList.toggle('is-active', mode === 'deposit');
    btnModeYouth.classList.toggle('is-active', mode === 'youth');

    groupInstallment.style.display = mode === 'installment' ? 'block' : 'none';
    groupDeposit.style.display = mode === 'deposit' ? 'block' : 'none';
    groupYouth.style.display = mode === 'youth' ? 'block' : 'none';

    groupCommonPeriod.style.display = mode === 'youth' ? 'none' : 'block';
    groupCommonTax.style.display = mode === 'youth' ? 'none' : 'block';
    groupCommonCalcType.style.display = mode === 'youth' ? 'none' : 'block';

    recalculate();
  }

  function recalculate() {
    const taxType = getTaxType();
    const calcType = getCalcType();
    const months = parseInt(elMonths.value, 10) || 12;
    const rate = parseFloat(elRate.value) || 0;

    if (currentMode === 'installment') {
      const monthlyDeposit = parseNumber(elMonthlyDeposit.value);
      const res = SavingsCalculator.calcInstallment({
        monthlyDeposit,
        months,
        annualRate: rate,
        calcType,
        taxType
      });

      if (elResultTotalPayout) elResultTotalPayout.textContent = formatKRW(res.totalPayout);
      if (elResultNetInterest) elResultNetInterest.textContent = '+' + formatKRW(res.netInterest);
      if (elResultPrincipal) elResultPrincipal.textContent = formatKRW(res.totalPrincipal);
      if (elResultGrossInterest) elResultGrossInterest.textContent = formatKRW(res.grossInterest);
      if (elResultTax) elResultTax.textContent = '-' + formatKRW(res.tax);
      if (elResultGovContributionRow) elResultGovContributionRow.style.display = 'none';
      if (elResultTaxSavedRow) elResultTaxSavedRow.style.display = 'none';

    } else if (currentMode === 'deposit') {
      const principal = parseNumber(elDepositPrincipal.value);
      const res = SavingsCalculator.calcDeposit({
        principal,
        months,
        annualRate: rate,
        calcType,
        taxType
      });

      if (elResultTotalPayout) elResultTotalPayout.textContent = formatKRW(res.totalPayout);
      if (elResultNetInterest) elResultNetInterest.textContent = '+' + formatKRW(res.netInterest);
      if (elResultPrincipal) elResultPrincipal.textContent = formatKRW(res.principal);
      if (elResultGrossInterest) elResultGrossInterest.textContent = formatKRW(res.grossInterest);
      if (elResultTax) elResultTax.textContent = '-' + formatKRW(res.tax);
      if (elResultGovContributionRow) elResultGovContributionRow.style.display = 'none';
      if (elResultTaxSavedRow) elResultTaxSavedRow.style.display = 'none';

    } else if (currentMode === 'youth') {
      const monthlyDeposit = parseNumber(elYouthDeposit.value);
      const youthRate = parseFloat(elRateYouth.value) || 5.5;
      const incomeTier = elYouthIncome.value;

      const res = SavingsCalculator.calcYouthLeap({
        monthlyDeposit,
        annualRate: youthRate,
        incomeTier
      });

      if (elResultTotalPayout) elResultTotalPayout.textContent = formatKRW(res.totalPayout);
      if (elResultNetInterest) elResultNetInterest.textContent = '+' + formatKRW(res.totalNetProfit);
      if (elResultPrincipal) elResultPrincipal.textContent = formatKRW(res.totalPrincipal);
      if (elResultGrossInterest) elResultGrossInterest.textContent = formatKRW(res.bankInterest);
      if (elResultTax) elResultTax.textContent = '0원 (전액 비과세)';

      if (elResultGovContributionRow) {
        elResultGovContributionRow.style.display = 'flex';
        elResultGovContribution.textContent = '+' + formatKRW(res.totalGovContribution + res.govInterest);
      }
      if (elResultTaxSavedRow) {
        elResultTaxSavedRow.style.display = 'flex';
        elResultTaxSaved.textContent = '+' + formatKRW(res.taxSaved);
      }
    }
  }

  // Bind Mode buttons
  btnModeInstallment.addEventListener('click', () => setMode('installment'));
  btnModeDeposit.addEventListener('click', () => setMode('deposit'));
  btnModeYouth.addEventListener('click', () => setMode('youth'));

  // Bind inputs
  bindNumberInput(elMonthlyDeposit, recalculate);
  bindNumberInput(elDepositPrincipal, recalculate);
  bindNumberInput(elYouthDeposit, recalculate);

  elMonths.addEventListener('input', recalculate);
  elRate.addEventListener('input', recalculate);
  elRateYouth.addEventListener('input', recalculate);
  elYouthIncome.addEventListener('change', recalculate);

  elTaxRadios.forEach(r => r.addEventListener('change', recalculate));
  elCalcTypeRadios.forEach(r => r.addEventListener('change', recalculate));

  // Period chips
  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      elMonths.value = btn.dataset.period;
      recalculate();
    });
  });

  // Copy result
  if (elCopyBtn) {
    elCopyBtn.addEventListener('click', () => {
      const modeName = currentMode === 'installment' ? '정기적금' : currentMode === 'deposit' ? '정기예금' : '청년도약계좌';
      const payout = elResultTotalPayout ? elResultTotalPayout.textContent : '';
      const profit = elResultNetInterest ? elResultNetInterest.textContent : '';
      const principal = elResultPrincipal ? elResultPrincipal.textContent : '';

      const text = `[데이터라이터 ${modeName} 만기 계산 결과]\n• 원금 합계: ${principal}\n• 세후 순수익(이자+기여금): ${profit}\n• 만기 총 수령액: ${payout}\n\n계산기 바로가기: https://www.datawriter.co.kr/savings-interest.html`;

      navigator.clipboard.writeText(text).then(() => {
        showToast('계산 결과가 복사되었습니다.');
      }).catch(() => {
        showToast('복사에 실패했습니다.');
      });
    });
  }

  recalculate();

})();
