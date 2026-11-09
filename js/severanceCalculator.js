/**
 * 대한민국 퇴직금 & 퇴직소득세 및 IRP 절세 계산 모듈
 * 근로자퇴직급여 보장법 & 소득세법 제22조, 제48조, 제55조 반영
 * datawriter.co.kr
 */

const SeveranceCalculator = (() => {
  const won = (n) => Math.round(n || 0);
  const floor10 = (n) => Math.floor(Math.max(0, n) / 10) * 10;

  /**
   * 날짜 차이(일수) 계산 (입사일 ~ 퇴사일, 시작일 포함)
   */
  const calcWorkingDays = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    // 근속일수는 당일 포함이므로 +1
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  /**
   * 근속연수 계산 (월수 올림 기준)
   */
  const calcServiceYears = (days) => {
    if (days < 365) return 0;
    // 365일 단위 근속연수 (올림 적용)
    return Math.max(1, Math.ceil(days / 365));
  };

  /**
   * 1일 평균임금 계산
   * @param {Object} params
   * @param {number} params.threeMonthBase - 퇴직 전 3개월 기본급 합계
   * @param {number} params.threeMonthAllowance - 퇴직 전 3개월 기타수당 합계
   * @param {number} params.annualBonus - 퇴직 전 1년 연간 상여금 총액
   * @param {number} params.annualLeaveAllowance - 퇴직 전 1년 연차수당 총액
   * @param {number} [params.threeMonthDays=91] - 3개월 역일수 (보통 89~92일, 기본 91일)
   */
  const calcAverageDailyWage = ({
    threeMonthBase = 0,
    threeMonthAllowance = 0,
    annualBonus = 0,
    annualLeaveAllowance = 0,
    threeMonthDays = 91
  }) => {
    const days = Math.max(1, threeMonthDays);
    const threeMonthPay = (Number(threeMonthBase) || 0) + (Number(threeMonthAllowance) || 0);
    const bonusPart = ((Number(annualBonus) || 0) + (Number(annualLeaveAllowance) || 0)) * (3 / 12);
    return (threeMonthPay + bonusPart) / days;
  };

  /**
   * 법정 퇴직금 계산
   * 공식: (1일 평균임금 × 30일 × 계속근로일수) ÷ 365
   */
  const calcGrossSeverance = (averageDailyWage, workingDays) => {
    if (workingDays < 365) return 0;
    return (averageDailyWage * 30 * workingDays) / 365;
  };

  /**
   * 근속연수공제 계산 (2023년 개정 소득세법 대폭 상향 기준)
   */
  const calcServiceYearDeduction = (serviceYears) => {
    const y = Math.max(1, serviceYears);
    if (y <= 5) {
      return y * 1000000;
    } else if (y <= 10) {
      return 5000000 + (y - 5) * 2000000;
    } else if (y <= 20) {
      return 15000000 + (y - 10) * 2500000;
    } else {
      return 40000000 + (y - 20) * 3000000;
    }
  };

  /**
   * 환산급여공제 계산
   */
  const calcConvertedSalaryDeduction = (convertedSalary) => {
    const s = Math.max(0, convertedSalary);
    if (s <= 8000000) {
      return s;
    } else if (s <= 70000000) {
      return 8000000 + (s - 8000000) * 0.60;
    } else if (s <= 120000000) {
      return 45200000 + (s - 70000000) * 0.55;
    } else if (s <= 300000000) {
      return 72700000 + (s - 120000000) * 0.45;
    } else {
      return 153700000 + (s - 300000000) * 0.35;
    }
  };

  /**
   * 소득세 기본세율 (누진세율)
   */
  const calcBaseTax = (taxBase) => {
    const b = Math.max(0, taxBase);
    if (b <= 14000000) return b * 0.06;
    if (b <= 50000000) return 840000 + (b - 14000000) * 0.15;
    if (b <= 88000000) return 6240000 + (b - 50000000) * 0.24;
    if (b <= 150000000) return 15360000 + (b - 88000000) * 0.35;
    if (b <= 300000000) return 37060000 + (b - 150000000) * 0.38;
    if (b <= 500000000) return 94060000 + (b - 300000000) * 0.40;
    if (b <= 1000000000) return 174060000 + (b - 500000000) * 0.42;
    return 384060000 + (b - 1000000000) * 0.45;
  };

  /**
   * 퇴직소득세 정밀 계산
   */
  const calcSeveranceTax = (grossSeverance, serviceYears) => {
    if (grossSeverance <= 0 || serviceYears < 1) {
      return {
        incomeTax: 0,
        localTax: 0,
        totalTax: 0,
        effectiveTaxRate: 0
      };
    }

    // 1) 근속연수공제
    const serviceDeduction = calcServiceYearDeduction(serviceYears);

    // 2) 환산급여 = (퇴직급여 - 근속연수공제) * 12 / 근속연수
    const netAfterService = Math.max(0, grossSeverance - serviceDeduction);
    const convertedSalary = (netAfterService * 12) / serviceYears;

    // 3) 환산급여공제
    const convertedDeduction = calcConvertedSalaryDeduction(convertedSalary);

    // 4) 퇴직소득 과세표준
    const taxBase = Math.max(0, convertedSalary - convertedDeduction);

    // 5) 환산산출세액
    const convertedTax = calcBaseTax(taxBase);

    // 6) 산출세액 = 환산산출세액 * 근속연수 / 12
    const incomeTax = floor10((convertedTax * serviceYears) / 12);

    // 7) 지방소득세 = 10%
    const localTax = floor10(incomeTax * 0.1);
    const totalTax = incomeTax + localTax;

    const effectiveTaxRate = grossSeverance > 0 ? ((totalTax / grossSeverance) * 100).toFixed(2) : 0;

    return {
      serviceDeduction: won(serviceDeduction),
      convertedSalary: won(convertedSalary),
      convertedDeduction: won(convertedDeduction),
      taxBase: won(taxBase),
      incomeTax,
      localTax,
      totalTax,
      effectiveTaxRate: Number(effectiveTaxRate)
    };
  };

  /**
   * IRP 이전 시 절세 혜택 계산
   * - 10년 이하 연금 수령 시: 퇴직소득세의 30% 감면 (70%만 납부)
   * - 10년 초과 수령 시: 40% 감면 (60% 납부)
   */
  const calcIrpBenefit = (totalTax) => {
    const tax30Saved = won(totalTax * 0.30);
    const tax40Saved = won(totalTax * 0.40);
    return {
      saved30: tax30Saved, // 10년 이내 수령 시 아끼는 세금
      saved40: tax40Saved, // 10년 초과 수령 시 아끼는 세금
      taxAfter30: totalTax - tax30Saved,
      taxAfter40: totalTax - tax40Saved
    };
  };

  /**
   * 통합 계산
   */
  const calculate = (params) => {
    const workingDays = params.workingDays ?? calcWorkingDays(params.startDate, params.endDate);
    const serviceYears = calcServiceYears(workingDays);

    const avgDailyWage = calcAverageDailyWage({
      threeMonthBase: params.threeMonthBase,
      threeMonthAllowance: params.threeMonthAllowance,
      annualBonus: params.annualBonus,
      annualLeaveAllowance: params.annualLeaveAllowance,
      threeMonthDays: params.threeMonthDays || 91
    });

    const grossSeverance = won(calcGrossSeverance(avgDailyWage, workingDays));
    const taxInfo = calcSeveranceTax(grossSeverance, serviceYears);
    const netSeverance = Math.max(0, grossSeverance - taxInfo.totalTax);
    const irp = calcIrpBenefit(taxInfo.totalTax);

    return {
      workingDays,
      serviceYears,
      avgDailyWage: won(avgDailyWage),
      grossSeverance,
      netSeverance,
      tax: taxInfo,
      irp,
      isQualified: workingDays >= 365
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
    calcWorkingDays,
    calcServiceYears,
    calcAverageDailyWage,
    calcGrossSeverance,
    calcSeveranceTax,
    calcIrpBenefit,
    calculate,
    formatWon,
    formatKoreanWon
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SeveranceCalculator;
}
