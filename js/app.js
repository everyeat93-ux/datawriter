document.addEventListener('DOMContentLoaded', () => {
  const SC = SalaryCalculator;
  const $ = (id) => document.getElementById(id);

  const PRESETS = {
    annual: [30000000, 40000000, 50000000, 60000000, 70000000, 80000000, 100000000],
    monthly: [2500000, 3000000, 3500000, 4000000, 5000000, 6000000, 8000000],
  };

  let mode = 'annual';
  let amount = 50000000;

  const salary = $('salary');
  const chips = $('chips');
  const won = (n) => SC.formatWon(n) + '원';
  const digits = (s) => Number(String(s).replace(/[^0-9]/g, '')) || 0;

  function renderChips() {
    chips.innerHTML = PRESETS[mode]
      .map((v) => `<button type="button" data-value="${v}">${SC.formatKoreanWon(v).replace(' 원', '')}</button>`)
      .join('');
    syncChips();
  }

  function syncChips() {
    chips.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('is-active', Number(b.dataset.value) === amount);
    });
  }

  function syncInput() {
    salary.value = SC.formatWon(amount);
    $('salary-hint').textContent = amount ? SC.formatKoreanWon(amount) : '';
  }

  function setMode(next) {
    if (mode === next) return;
    mode = next;
    $('mode-annual').classList.toggle('is-active', mode === 'annual');
    $('mode-monthly').classList.toggle('is-active', mode === 'monthly');
    $('mode-annual').setAttribute('aria-selected', mode === 'annual');
    $('mode-monthly').setAttribute('aria-selected', mode === 'monthly');
    $('salary-label').textContent = mode === 'annual' ? '연봉 (세전)' : '월급 (세전)';
    amount = mode === 'annual' ? 50000000 : 4000000;
    syncInput();
    renderChips();
    calculate();
  }

  function calculate() {
    const annual = mode === 'monthly' ? amount * 12 : amount;
    const r = SC.calculate({
      annualSalary: annual,
      nonTaxableMonthly: digits($('nontax').value),
      dependents: Number($('dependents').value),
      children: Number($('children').value),
      severanceIncluded: $('severance').value === 'included',
      taxRatePercent: Number($('taxrate').value),
    });

    $('r-net').textContent = SC.formatWon(r.monthlyNetSalary);
    $('r-gross').textContent = won(r.monthlyGross);
    $('r-ded').textContent = won(r.totalDeductions);
    $('r-pension').textContent = won(r.nationalPension);
    $('r-health').textContent = won(r.healthInsurance);
    $('r-care').textContent = won(r.longTermCare);
    $('r-employ').textContent = won(r.employmentInsurance);
    $('r-itax').textContent = won(r.monthlyIncomeTax);
    $('r-ltax').textContent = won(r.localIncomeTax);
    $('r-total').textContent = '−' + won(r.totalDeductions);
    $('r-annual-gross').textContent = won(r.annualSalary);
    $('r-annual-net').textContent = won(r.annualNetSalary);

    $('p-net').textContent = r.netSalaryPercent;
    $('p-ins').textContent = r.insurancePercent;
    $('p-tax').textContent = r.taxPercent;
    $('bar-net').style.width = r.netSalaryPercent + '%';
    $('bar-ins').style.width = r.insurancePercent + '%';
    $('bar-tax').style.width = r.taxPercent + '%';
  }

  function renderTable() {
    const rows = [];
    for (let m = 2400; m <= 12000; m += 400) {
      const annual = m * 10000;
      const r = SC.calculate({ annualSalary: annual });
      rows.push(`<tr>
        <td>${SC.formatKoreanWon(annual)}</td>
        <td>${won(r.monthlyGross)}</td>
        <td class="em">${won(r.monthlyNetSalary)}</td>
        <td>${won(r.totalSocialInsurance)}</td>
        <td>${won(r.monthlyIncomeTax + r.localIncomeTax)}</td>
        <td>${won(r.totalDeductions)}</td>
      </tr>`);
    }
    $('table-body').innerHTML = rows.join('');
  }

  function summaryText() {
    const label = mode === 'annual' ? '연봉' : '월급';
    return `${label} ${SC.formatKoreanWon(amount)} 기준 월 실수령액은 ${$('r-net').textContent}원입니다.\n` +
      `(공제 ${$('r-ded').textContent} / 2026년 요율)\n${location.origin}${location.pathname}`;
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // Events
  $('mode-annual').addEventListener('click', () => setMode('annual'));
  $('mode-monthly').addEventListener('click', () => setMode('monthly'));

  salary.addEventListener('input', () => {
    amount = digits(salary.value);
    syncInput();
    syncChips();
    calculate();
  });

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    amount = Number(b.dataset.value);
    syncInput();
    syncChips();
    calculate();
  });

  $('nontax').addEventListener('input', (e) => {
    e.target.value = SC.formatWon(digits(e.target.value));
    calculate();
  });

  ['severance', 'dependents', 'children', 'taxrate'].forEach((id) =>
    $(id).addEventListener('change', calculate)
  );

  $('calc-btn').addEventListener('click', () => {
    calculate();
    if (window.innerWidth < 900) $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(summaryText())
      .then(() => toast('결과를 복사했습니다'))
      .catch(() => toast('복사하지 못했습니다'));
  });

  $('share-btn').addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: '연봉 실수령액 계산기', text: summaryText() }).catch(() => {});
    } else {
      navigator.clipboard.writeText(summaryText()).then(() => toast('링크와 결과를 복사했습니다'));
    }
  });

  renderChips();
  renderTable();
  syncInput();
  calculate();
});
