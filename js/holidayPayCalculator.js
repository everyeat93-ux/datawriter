/**
 * 주휴수당 및 알바 실수령액 계산 엔진
 * 근로기준법 제55조(휴일) 기준
 */

const HolidayPayCalculator = {
  // 2026년 법정 기준 최저임금
  MINIMUM_HOURLY_WAGE_2026: 10030,

  calculate({
    hourlyWage = 10030,
    dailyHours = 5,
    daysPerWeek = 4,
    taxType = 'four_major' // 'four_major' | 'freelancer_3_3' | 'employment_only' | 'none'
  }) {
    const weeklyHours = dailyHours * daysPerWeek;
    const isEligible = weeklyHours >= 15; // 주 15시간 이상 근무 시 지급 대상

    // 주휴시간 계산
    let weeklyHolidayHours = 0;
    if (isEligible) {
      if (weeklyHours >= 40) {
        weeklyHolidayHours = 8;
      } else {
        weeklyHolidayHours = Math.round((weeklyHours / 40 * 8) * 100) / 100;
      }
    }

    // 주당 금액
    const weeklyBasePay = Math.round(weeklyHours * hourlyWage);
    const weeklyHolidayPay = isEligible ? Math.round(weeklyHolidayHours * hourlyWage) : 0;
    const weeklyTotalGross = weeklyBasePay + weeklyHolidayPay;

    // 월 환산 기준 (월 평균 4.345주 = 365 / 7 / 12)
    const weeksInMonth = 365 / 7 / 12;
    const monthlyBaseHours = Math.round(weeklyHours * weeksInMonth * 10) / 10;
    const monthlyHolidayHours = isEligible ? Math.round(weeklyHolidayHours * weeksInMonth * 10) / 10 : 0;
    const monthlyTotalHours = monthlyBaseHours + monthlyHolidayHours;

    const monthlyBasePay = Math.round(monthlyBaseHours * hourlyWage);
    const monthlyHolidayPay = isEligible ? Math.round(monthlyHolidayHours * hourlyWage) : 0;
    const monthlyTotalGross = monthlyBasePay + monthlyHolidayPay;

    // 세금 및 4대보험 공제 계산
    let deductions = {
      pension: 0,
      health: 0,
      care: 0,
      employment: 0,
      incomeTax: 0,
      totalDeduction: 0
    };

    if (taxType === 'four_major' && monthlyBaseHours >= 60) {
      // 월 60시간 이상 4대보험 가입 대상
      // 2026년 요율: 국민연금 4.75%, 건보 3.595%, 요양 건보의 13.14%, 고용 0.9%
      deductions.pension = Math.floor(monthlyTotalGross * 0.0475);
      deductions.health = Math.floor(monthlyTotalGross * 0.03595);
      deductions.care = Math.floor(deductions.health * 0.1314);
      deductions.employment = Math.floor(monthlyTotalGross * 0.009);
      // 소득세: 알바 간이세액표 (월 106만 원 이하는 소득세 비과세)
      if (monthlyTotalGross > 1060000) {
        deductions.incomeTax = Math.floor((monthlyTotalGross - 1060000) * 0.06);
      }
      deductions.totalDeduction = deductions.pension + deductions.health + deductions.care + deductions.employment + deductions.incomeTax;
    } else if (taxType === 'freelancer_3_3') {
      // 3.3% 원천징수 (소득세 3% + 지방소득세 0.3%)
      deductions.incomeTax = Math.floor(monthlyTotalGross * 0.033);
      deductions.totalDeduction = deductions.incomeTax;
    } else if (taxType === 'employment_only' || (taxType === 'four_major' && monthlyBaseHours < 60)) {
      // 월 60시간 미만 초단시간 근로자는 고용보험 0.9%만 적용
      deductions.employment = Math.floor(monthlyTotalGross * 0.009);
      deductions.totalDeduction = deductions.employment;
    }

    const monthlyNetPay = Math.max(0, monthlyTotalGross - deductions.totalDeduction);

    return {
      hourlyWage,
      dailyHours,
      daysPerWeek,
      weeklyHours,
      isEligible,
      weeklyHolidayHours,
      weeklyBasePay,
      weeklyHolidayPay,
      weeklyTotalGross,
      monthlyBaseHours,
      monthlyHolidayHours,
      monthlyTotalHours,
      monthlyBasePay,
      monthlyHolidayPay,
      monthlyTotalGross,
      deductions,
      monthlyNetPay,
      effectiveHourlyWage: weeklyHours > 0 ? Math.round(weeklyTotalGross / weeklyHours) : hourlyWage
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HolidayPayCalculator;
}
