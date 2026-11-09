/**
 * 2026 대한민국 실업급여(구직급여) 모의 계산 모듈
 * 고용보험법 제46조(구직급여일액), 제50조(소정급여일수) 반영
 * datawriter.co.kr
 */

const UnemploymentCalculator = (() => {
  const won = (n) => Math.round(n || 0);

  // 2026년 고용보험 법정 기준 상수
  const CONSTANTS = {
    // 1일 구직급여 상한액: 66,000원
    MAX_DAILY_BENEFIT: 66000,

    // 2026년 최저시급 기반 하한액 (최저임금의 80% × 1일 8시간)
    // 2026 최저임금 기준 1일 하한액: 약 64,192원 (보건복지/고용노동 고시)
    MIN_DAILY_BENEFIT: 64192,

    // 구직급여 지급 비율: 평균임금의 60%
    BENEFIT_RATE: 0.60,
  };

  /**
   * 소정급여일수 매트릭스 계산 (연령 및 고용보험 가입기간 기준)
   * @param {number} age - 퇴사 시점 만 나이
   * @param {string} periodKey - 고용보험 가입기간 ('under1', '1to3', '3to5', '5to10', 'over10')
   * @param {boolean} [isDisabled=false] - 장애인 여부
   * @returns {number} 지급일수 (120일 ~ 270일)
   */
  const calcBenefitDays = (age, periodKey, isDisabled = false) => {
    const isSeniorOrDisabled = age >= 50 || isDisabled;

    const table = {
      under1: { normal: 120, senior: 120 },   // 1년 미만
      '1to3': { normal: 150, senior: 180 },   // 1년 이상 ~ 3년 미만
      '3to5': { normal: 180, senior: 210 },   // 3년 이상 ~ 5년 미만
      '5to10': { normal: 210, senior: 240 },  // 5년 이상 ~ 10년 미만
      over10: { normal: 240, senior: 270 },   // 10년 이상
    };

    const row = table[periodKey] || table['1to3'];
    return isSeniorOrDisabled ? row.senior : row.normal;
  };

  /**
   * 1일 구직급여 수급액 계산 (상/하한선 적용)
   * @param {number} monthlyAvgWage - 퇴직 전 3개월 월 평균임금 (원)
   * @param {number} [dailyWorkingHours=8] - 1일 소정근로시간 (기본 8시간)
   */
  const calcDailyBenefit = (monthlyAvgWage, dailyWorkingHours = 8) => {
    const hours = Math.min(8, Math.max(4, Number(dailyWorkingHours) || 8));
    
    // 1일 평균임금 (월급 / 30일)
    const avgDailyWage = Math.max(0, monthlyAvgWage) / 30;

    // 1일 급여의 60%
    let calculatedDaily = avgDailyWage * CONSTANTS.BENEFIT_RATE;

    // 근무시간 비례 하한액 (8시간 기준 약 64,192원)
    const minBenefit = won(CONSTANTS.MIN_DAILY_BENEFIT * (hours / 8));
    const maxBenefit = CONSTANTS.MAX_DAILY_BENEFIT;

    // 상한액 및 하한액 판정
    let finalDaily = calculatedDaily;
    if (finalDaily > maxBenefit) {
      finalDaily = maxBenefit;
    } else if (finalDaily < minBenefit) {
      finalDaily = minBenefit;
    }

    return {
      avgDailyWage: won(avgDailyWage),
      rawBenefit: won(calculatedDaily),
      dailyBenefit: won(finalDaily),
      isCapped: calculatedDaily >= maxBenefit,
      isFloor: calculatedDaily <= minBenefit,
      minBenefit,
      maxBenefit
    };
  };

  /**
   * 실업급여 통합 계산
   * @param {Object} params
   * @param {number} params.monthlyWage - 퇴직 전 3개월 월 기본급+수당 평균
   * @param {number} params.age - 퇴사 당시 만 나이
   * @param {string} params.insuredPeriod - 고용보험 가입기간 키
   * @param {number} [params.dailyWorkingHours=8] - 1일 근무시간
   * @param {boolean} [params.isDisabled=false] - 장애인 여부
   */
  const calculate = (params) => {
    const age = Number(params.age) || 35;
    const hours = Number(params.dailyWorkingHours) || 8;
    const periodKey = params.insuredPeriod || '1to3';
    const isDisabled = Boolean(params.isDisabled);

    const benefitDays = calcBenefitDays(age, periodKey, isDisabled);
    const dailyInfo = calcDailyBenefit(params.monthlyWage, hours);

    // 총 예상 수급액
    const totalBenefit = dailyInfo.dailyBenefit * benefitDays;

    // 월 환산액 (30일 기준)
    const monthlyBenefit = dailyInfo.dailyBenefit * 30;

    // 수급 기간 (개월 수)
    const months = (benefitDays / 30).toFixed(1);

    // 조기재취업수당 예상액 (소정급여일수 1/2 이상 남기고 재취업 시 잔여일수 50% 지급)
    const earlyReemploymentAllowance = won((totalBenefit / 2) * 0.5);

    return {
      age,
      dailyWorkingHours: hours,
      benefitDays,
      months,
      dailyBenefit: dailyInfo.dailyBenefit,
      monthlyBenefit,
      totalBenefit,
      avgDailyWage: dailyInfo.avgDailyWage,
      isCapped: dailyInfo.isCapped,
      isFloor: dailyInfo.isFloor,
      earlyReemploymentAllowance
    };
  };

  const formatWon = (n) => (Math.round(n) || 0).toLocaleString('ko-KR');

  const formatKoreanWon = (n) => {
    const v = Math.round(n);
    if (!v || v === 0) return '0원';
    const eok = Math.floor(v / 100000000);
    const man = Math.floor((v % 100000000) / 10000);
    const parts = [];
    if (eok > 0) parts.push(`${eok}억`);
    if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`);
    if (parts.length > 0) parts.push('원');
    return parts.join(' ');
  };

  return {
    CONSTANTS,
    calcBenefitDays,
    calcDailyBenefit,
    calculate,
    formatWon,
    formatKoreanWon
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnemploymentCalculator;
}
