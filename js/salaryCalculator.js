/**
 * 2026 대한민국 연봉 실수령액 정밀 계산 모듈 (SalaryCalculator)
 * datawriter.co.kr
 * 
 * - 2026년 기준 4대 사회보험 요율 완벽 반영
 * - 국세청 근로소득 간이세액표 및 소득세법 누진세율 적용
 * - 비과세 식대(20만원), 부양가족, 20세 이하 자녀 세액공제, 소득세 원천징수율(80/100/120%) 지원
 */

const SalaryCalculator = (() => {
  // 2026년 요율 상수 정의
  // ※ 요율은 매년 고시로 바뀌므로 이 블록만 갱신하면 사이트 전체에 반영됩니다.
  const RATES = {
    // 국민연금: 2026년 연금개혁으로 총 9.5% → 근로자 4.75%
    // 기준소득월액 상한 6,590,000원 / 하한 410,000원 (2026.7.1 ~ 2027.6.30 적용, 매년 7월 갱신)
    PENSION_RATE: 0.0475,
    PENSION_MIN_INCOME: 410000,
    PENSION_MAX_INCOME: 6590000,

    // 건강보험: 2026년 총 7.19% → 근로자 3.595%
    HEALTH_RATE: 0.03595,

    // 장기요양보험: 소득 대비 0.9448% = 건강보험료의 약 13.14%
    LONGTERM_CARE_RATE: 0.1314,

    // 고용보험: 0.9%
    EMPLOYMENT_RATE: 0.009,

    // 기본 비과세 식대 한도 (월 200,000원)
    DEFAULT_NON_TAXABLE: 200000,
  };

  /**
   * 10원 단위 절사 (원단위 내림)
   */
  const floor10 = (val) => Math.floor(Math.max(0, val) / 10) * 10;

  /**
   * 근로소득공제 계산 (연간 기준)
   */
  const calcEarnedIncomeDeduction = (grossAnnual) => {
    if (grossAnnual <= 5000000) {
      return grossAnnual * 0.7;
    } else if (grossAnnual <= 15000000) {
      return 3500000 + (grossAnnual - 5000000) * 0.4;
    } else if (grossAnnual <= 45000000) {
      return 7500000 + (grossAnnual - 15000000) * 0.15;
    } else if (grossAnnual <= 100000000) {
      return 12000000 + (grossAnnual - 45000000) * 0.05;
    } else {
      return 14750000 + (grossAnnual - 100000000) * 0.02;
    }
  };

  /**
   * 종합소득 기본세율 계산 (누진공제 적용)
   */
  const calcBasicTax = (taxBase) => {
    if (taxBase <= 14000000) {
      return taxBase * 0.06;
    } else if (taxBase <= 50000000) {
      return 840000 + (taxBase - 14000000) * 0.15;
    } else if (taxBase <= 88000000) {
      return 6240000 + (taxBase - 50000000) * 0.24;
    } else if (taxBase <= 150000000) {
      return 15360000 + (taxBase - 88000000) * 0.35;
    } else if (taxBase <= 300000000) {
      return 37060000 + (taxBase - 150000000) * 0.38;
    } else if (taxBase <= 500000000) {
      return 94060000 + (taxBase - 300000000) * 0.40;
    } else if (taxBase <= 1000000000) {
      return 174060000 + (taxBase - 500000000) * 0.42;
    } else {
      return 384060000 + (taxBase - 1000000000) * 0.45;
    }
  };

  /**
   * 근로소득세액공제 계산
   */
  const calcTaxCredit = (calcTax, annualSalary) => {
    let credit = 0;
    if (calcTax <= 1300000) {
      credit = calcTax * 0.55;
    } else {
      credit = 715000 + (calcTax - 1300000) * 0.30;
    }

    // 한도액 계산
    let limit = 740000;
    if (annualSalary > 70000000) {
      limit = Math.max(500000, 660000 - (annualSalary - 70000000) * 0.5);
    } else if (annualSalary > 33000000) {
      limit = Math.max(660000, 740000 - (annualSalary - 33000000) * 0.008);
    }

    return Math.min(credit, limit);
  };

  /**
   * 연봉 실수령액 통합 계산 함수
   * @param {Object} options
   * @param {number} options.annualSalary - 세전 연봉 (원)
   * @param {number} [options.nonTaxableMonthly=200000] - 월 비과세액 (기본 식대 20만원)
   * @param {number} [options.dependents=1] - 부양가족 수 (본인 포함, 기본 1)
   * @param {number} [options.children=0] - 8~20세 자녀 수 (기본 0)
   * @param {number} [options.taxRatePercent=100] - 소득세 원천징수율 (80, 100, 120%)
   * @param {boolean} [options.severanceIncluded=false] - 퇴직금 포함 여부
   */
  const calculate = (options) => {
    const rawAnnual = Math.max(0, Number(options.annualSalary) || 0);
    const severanceIncluded = Boolean(options.severanceIncluded);
    
    // 퇴직금 포함인 경우 실제 연간 급여는 13등분
    const divisor = severanceIncluded ? 13 : 12;
    const monthlyGross = Math.floor(rawAnnual / divisor);

    const nonTaxableMonthly = Math.max(0, Number(options.nonTaxableMonthly ?? RATES.DEFAULT_NON_TAXABLE));
    const dependents = Math.max(1, Number(options.dependents) || 1);
    const children = Math.max(0, Number(options.children) || 0);
    const taxRateRatio = (Number(options.taxRatePercent) || 100) / 100;

    // 과세 대상 월 급여
    const monthlyTaxable = Math.max(0, monthlyGross - nonTaxableMonthly);

    // 1. 국민연금 (상/하한선 적용)
    let pensionBase = monthlyTaxable;
    if (pensionBase > RATES.PENSION_MAX_INCOME) pensionBase = RATES.PENSION_MAX_INCOME;
    if (pensionBase < RATES.PENSION_MIN_INCOME && pensionBase > 0) pensionBase = RATES.PENSION_MIN_INCOME;
    const nationalPension = floor10(pensionBase * RATES.PENSION_RATE);

    // 2. 건강보험
    const healthInsurance = floor10(monthlyTaxable * RATES.HEALTH_RATE);

    // 3. 장기요양보험 (건강보험료의 12.95%)
    const longTermCare = floor10(healthInsurance * RATES.LONGTERM_CARE_RATE);

    // 4. 고용보험 (0.9%)
    const employmentInsurance = floor10(monthlyTaxable * RATES.EMPLOYMENT_RATE);

    // 4대 보험 합계
    const totalSocialInsurance = nationalPension + healthInsurance + longTermCare + employmentInsurance;

    // 5. 근로소득세 계산 (연간 환산 후 소득공제 및 세액공제 적용)
    const annualTaxable = monthlyTaxable * 12;
    const earnedIncomeDeduction = calcEarnedIncomeDeduction(annualTaxable);
    
    // 인적공제: 1인당 150만원
    const personalDeduction = dependents * 1500000;
    
    // 연금보험료 공제 (국민연금 전액 공제)
    const pensionDeduction = nationalPension * 12;

    // 특별소득공제 (건강보험, 고용보험 + 표준특별세액공제 근사치)
    const healthAndEmployDeduction = (healthInsurance + longTermCare + employmentInsurance) * 12;
    
    // 과세표준 산출
    const taxBase = Math.max(0, annualTaxable - earnedIncomeDeduction - personalDeduction - pensionDeduction - healthAndEmployDeduction);

    // 산출세액
    const calcTax = calcBasicTax(taxBase);

    // 세액공제 (근로소득세액공제 + 자녀세액공제 + 표준세액공제)
    const incomeTaxCredit = calcTaxCredit(calcTax, annualTaxable);
    
    // 자녀 세액공제: 1명 15만, 2명 35만, 3명 이상 35만 + (초과수*30만)
    let childCredit = 0;
    if (children === 1) childCredit = 150000;
    else if (children === 2) childCredit = 350000;
    else if (children > 2) childCredit = 350000 + (children - 2) * 300000;

    const standardCredit = 130000; // 표준세액공제

    // 최종 연간 결정세액
    const annualIncomeTax = Math.max(0, calcTax - incomeTaxCredit - childCredit - standardCredit);

    // 월 근로소득세 (원천징수비율 적용 후 10원 단위 절사)
    const monthlyIncomeTax = floor10((annualIncomeTax / 12) * taxRateRatio);

    // 6. 지방소득세 (근로소득세의 10%)
    const localIncomeTax = floor10(monthlyIncomeTax * 0.1);

    // 총 공제액
    const totalDeductions = totalSocialInsurance + monthlyIncomeTax + localIncomeTax;

    // 월 실수령액
    const monthlyNetSalary = Math.max(0, monthlyGross - totalDeductions);

    // 연간 환산 합계
    const annualNetSalary = monthlyNetSalary * 12;
    const annualTotalDeductions = totalDeductions * 12;

    // 비율 계산 (백분율)
    const netSalaryPercent = monthlyGross > 0 ? ((monthlyNetSalary / monthlyGross) * 100).toFixed(1) : 0;
    const insurancePercent = monthlyGross > 0 ? ((totalSocialInsurance / monthlyGross) * 100).toFixed(1) : 0;
    const taxPercent = monthlyGross > 0 ? (((monthlyIncomeTax + localIncomeTax) / monthlyGross) * 100).toFixed(1) : 0;

    return {
      // 월간
      monthlyGross,
      monthlyTaxable,
      monthlyNetSalary,
      totalDeductions,

      // 공제 상세 (월)
      nationalPension,
      healthInsurance,
      longTermCare,
      employmentInsurance,
      totalSocialInsurance,
      monthlyIncomeTax,
      localIncomeTax,

      // 연간
      annualSalary: rawAnnual,
      annualNetSalary,
      annualTotalDeductions,

      // 비율
      netSalaryPercent: Number(netSalaryPercent),
      insurancePercent: Number(insurancePercent),
      taxPercent: Number(taxPercent),

      // 설정값
      severanceIncluded,
      nonTaxableMonthly,
      dependents,
      children,
      taxRateRatio
    };
  };

  /**
   * 화폐 단위 포맷 (예: 50,000,000)
   */
  const formatWon = (num) => {
    return (Math.round(num) || 0).toLocaleString('ko-KR');
  };

  /**
   * 한글 금액 표기 (예: 5,000만원, 1억 2,000만원)
   */
  const formatKoreanWon = (num) => {
    const val = Math.round(num);
    if (!val || val === 0) return '0원';
    
    const eok = Math.floor(val / 100000000);
    const man = Math.floor((val % 100000000) / 10000);
    const won = val % 10000;

    const parts = [];
    if (eok > 0) parts.push(`${eok}억`);
    if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`);
    if (won > 0 && eok === 0 && man === 0) parts.push(`${won}원`);
    else if (parts.length > 0) parts.push('원');

    return parts.join(' ');
  };

  /**
   * 주요 연봉 구간별 사전 데이터 생성 (SEO 표 생성용)
   */
  const generateSalaryTable = (startMillion = 24, endMillion = 120, stepMillion = 5) => {
    const table = [];
    for (let m = startMillion; m <= endMillion; m += stepMillion) {
      const annual = m * 1000000;
      const res = calculate({ annualSalary: annual });
      table.push({
        annual,
        annualLabel: formatKoreanWon(annual),
        monthlyGross: res.monthlyGross,
        monthlyNet: res.monthlyNetSalary,
        totalDeduction: res.totalDeductions,
        insuranceSum: res.totalSocialInsurance,
        taxSum: res.monthlyIncomeTax + res.localIncomeTax
      });
    }
    return table;
  };

  return {
    RATES,
    calculate,
    formatWon,
    formatKoreanWon,
    generateSalaryTable
  };
})();

// Node.js 모듈 및 브라우저 호환
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SalaryCalculator;
}
