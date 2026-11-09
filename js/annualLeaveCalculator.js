/**
 * 미사용 연차수당 계산 엔진 (근로기준법 기준)
 * 
 * 통상시급 = 월 통상임금 / 월 소정근로시간(주 40시간 기준 209시간)
 * 1일 통상임금 = 통상시급 * 1일 소정근로시간(통상 8시간)
 * 연차수당(세전) = 1일 통상임금 * 미사용 연차일수
 */

const AnnualLeaveCalculator = {
  // 주당 근로시간에 따른 월 소정근로시간 계산
  calcMonthlyHours(weeklyHours = 40) {
    const weeklyPaidHours = weeklyHours + (weeklyHours >= 15 ? 8 : 0); // 주휴시간(주 15시간 이상 시 8시간)
    return Math.round((weeklyPaidHours * 365 / 7 / 12) * 10) / 10; // 주 40시간 기준 약 208.57 -> 209시간
  },

  calculate({
    salaryType = 'monthly', // 'monthly' | 'annual'
    monthlyBase = 3000000,
    annualSalary = 36000000,
    fixedAllowances = 0,    // 직책수당 등 고정수당
    weeklyHours = 40,       // 주 소정근로시간
    dailyHours = 8,         // 1일 소정근로시간
    unusedDays = 5          // 미사용 연차일수
  }) {
    // 1. 월 통상임금 산출
    let monthlyWage = 0;
    if (salaryType === 'annual') {
      monthlyWage = Math.floor(annualSalary / 12) + fixedAllowances;
    } else {
      monthlyWage = monthlyBase + fixedAllowances;
    }

    // 2. 월 소정근로시간 (주 40시간 -> 209시간)
    const monthlyHours = weeklyHours === 40 ? 209 : this.calcMonthlyHours(weeklyHours);

    // 3. 통상시급 & 1일 통상임금
    const hourlyWage = Math.floor(monthlyWage / monthlyHours);
    const dailyWage = Math.floor(hourlyWage * dailyHours);

    // 4. 세전 연차수당
    const totalGross = Math.floor(dailyWage * unusedDays);

    // 5. 예상 원천징수 세금 (근로소득세 + 지방소득세 약 8.8% ~ 간이 추정)
    // 연차수당은 당월 급여에 합산되어 근로소득세율이 적용되므로 통상적인 실효세율(약 10%) 적용 추정치 제공
    const estimatedTax = Math.floor(totalGross * 0.099); // 소득세+지방세 약 9.9%
    const estimatedNet = totalGross - estimatedTax;

    return {
      salaryType,
      monthlyWage,
      monthlyHours,
      hourlyWage,
      dailyWage,
      unusedDays,
      totalGross,
      estimatedTax,
      estimatedNet
    };
  },

  // 근속연수에 따른 법정 연차일수 자동 계산
  getStatutoryLeaveDays(serviceYears) {
    if (serviceYears < 1) {
      return { days: 11, desc: '1년 미만: 1개월 개근 시 1일씩 (최대 11일)' };
    }
    // 1년 이상: 기본 15일, 3년차부터 2년마다 1일씩 가산 (최대 25일)
    const additionalDays = Math.floor((serviceYears - 1) / 2);
    const totalDays = Math.min(25, 15 + additionalDays);
    return {
      days: totalDays,
      desc: `${serviceYears}년 근속: 기본 15일 + 가산 ${additionalDays}일 (최대 25일 한도)`
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnnualLeaveCalculator;
}
