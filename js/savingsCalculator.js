/**
 * 예적금 이자 & 청년도약계좌 계산 엔진
 * 단리, 월복리, 세금(일반과세 15.4%, 세금우대 1.4%, 비과세 0%) 및 청년도약계좌 정부기여금
 */

const SavingsCalculator = {
  // 세금 요율
  TAX_RATES: {
    general: 0.154,    // 일반과세 (이자소득세 14% + 지방소득세 1.4%)
    preferential: 0.014, // 세금우대/농특세 (상호금융 1.4%)
    taxFree: 0.0       // 비과세 (0%)
  },

  /**
   * 정기예금 (목돈 굴리기)
   */
  calcDeposit({
    principal = 10000000, // 예치금액
    months = 12,          // 예치기간 (개월)
    annualRate = 3.5,     // 연이자율 (%)
    calcType = 'simple',  // 'simple' | 'compound'
    taxType = 'general'   // 'general' | 'preferential' | 'taxFree'
  }) {
    const r = annualRate / 100;
    let grossInterest = 0;

    if (calcType === 'simple') {
      // 단리: 원금 * 연이율 * (개월수 / 12)
      grossInterest = Math.round(principal * r * (months / 12));
    } else {
      // 월복리: 원금 * (1 + r/12)^months - 원금
      grossInterest = Math.round(principal * Math.pow(1 + r / 12, months) - principal);
    }

    const taxRate = this.TAX_RATES[taxType] ?? 0.154;
    const tax = Math.floor(grossInterest * taxRate);
    const netInterest = grossInterest - tax;
    const totalPayout = principal + netInterest;

    return {
      type: 'deposit',
      principal,
      months,
      annualRate,
      calcType,
      taxType,
      grossInterest,
      tax,
      netInterest,
      totalPayout
    };
  },

  /**
   * 정기적금 (매달 모으기)
   */
  calcInstallment({
    monthlyDeposit = 500000, // 매월 납입액
    months = 12,             // 납입기간 (개월)
    annualRate = 4.0,        // 연이자율 (%)
    calcType = 'simple',     // 'simple' | 'compound'
    taxType = 'general'      // 'general' | 'preferential' | 'taxFree'
  }) {
    const totalPrincipal = monthlyDeposit * months;
    const r = annualRate / 100;
    let grossInterest = 0;

    if (calcType === 'simple') {
      // 단리 적금: 매월 납입분마다 잔여 기간에 비례
      // 공식: 월납입액 * (r / 12) * [months * (months + 1) / 2]
      grossInterest = Math.round(monthlyDeposit * (r / 12) * (months * (months + 1) / 2));
    } else {
      // 월복리 적금
      let balance = 0;
      for (let i = 0; i < months; i++) {
        balance = (balance + monthlyDeposit) * (1 + r / 12);
      }
      grossInterest = Math.round(balance - totalPrincipal);
    }

    const taxRate = this.TAX_RATES[taxType] ?? 0.154;
    const tax = Math.floor(grossInterest * taxRate);
    const netInterest = grossInterest - tax;
    const totalPayout = totalPrincipal + netInterest;

    return {
      type: 'installment',
      monthlyDeposit,
      totalPrincipal,
      months,
      annualRate,
      calcType,
      taxType,
      grossInterest,
      tax,
      netInterest,
      totalPayout
    };
  },

  /**
   * 청년도약계좌 시뮬레이션
   * 매월 납입액 (최대 70만 원), 5년(60개월), 기본금리 약 4.5%~6.0%, 비과세, 정부 기여금 매칭
   */
  calcYouthLeap({
    monthlyDeposit = 700000,
    annualRate = 5.5,
    incomeTier = 'under_24m' // 'under_24m' (기여금 3.3만) | '24m_36m' (2.9만) | '36m_48m' (2.5만) | '48m_60m' (2.1만) | 'over_60m' (기여금 매칭 비대상, 비과세만)
  }) {
    const months = 60; // 5년 만기
    const totalPrincipal = monthlyDeposit * months;

    // 소득 구간별 월 최대 정부 기여금
    let monthlyGovContribution = 0;
    if (incomeTier === 'under_24m') monthlyGovContribution = 33000;
    else if (incomeTier === '24m_36m') monthlyGovContribution = 29000;
    else if (incomeTier === '36m_48m') monthlyGovContribution = 25000;
    else if (incomeTier === '48m_60m') monthlyGovContribution = 21000;
    else monthlyGovContribution = 0;

    const totalGovContribution = monthlyGovContribution * months;

    // 은행 이자 (단리 적금 기준, 비과세)
    const r = annualRate / 100;
    const bankInterest = Math.round(monthlyDeposit * (r / 12) * (months * (months + 1) / 2));

    // 정부 기여금에 대한 이자 (약 5.5% 단리 적금 비례 적용)
    const govInterest = monthlyGovContribution > 0
      ? Math.round(monthlyGovContribution * (r / 12) * (months * (months + 1) / 2))
      : 0;

    const totalInterest = bankInterest + govInterest;
    const totalNetProfit = totalInterest + totalGovContribution; // 비과세이므로 세금 0
    const totalPayout = totalPrincipal + totalNetProfit;

    return {
      type: 'youth_leap',
      monthlyDeposit,
      months,
      annualRate,
      totalPrincipal,
      monthlyGovContribution,
      totalGovContribution,
      bankInterest,
      govInterest,
      totalInterest,
      totalNetProfit,
      totalPayout,
      taxSaved: Math.floor(totalInterest * 0.154) // 15.4% 비과세로 아낀 세금
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SavingsCalculator;
}
