import type { TaxResult, TaxInputs, TaxDocumentsData, MonthlyBreakdown, Currency } from '@/types/tax';
import {
  computeForeignPropertyNetAnnual,
  convert,
  computeUKPropertyTaxBreakdownForNonResident,
} from '@/lib/taxCalculators';

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// UK tax year: Apr(1), May(2), ... Mar(12)
const UK_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
// Spain: Jan(1) to Dec(12)
const SPAIN_MONTH_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function buildMonthlyBreakdown(
  result: TaxResult,
  useUkOrder: boolean,
): MonthlyBreakdown[] {
  const order = useUkOrder ? UK_MONTH_ORDER : SPAIN_MONTH_ORDER;
  const grossMonthly = result.grossIncome / 12;
  const deductionsMonthly = result.totalDeductions / 12;
  const taxMonthly = result.incomeTax / 12;
  const socialMonthly = result.socialContributions / 12;
  const netMonthly = result.netMonthly;

  return order.map((calMonth, idx) => ({
    month: idx + 1,
    monthLabel: MONTH_LABELS[calMonth - 1],
    grossIncome: grossMonthly,
    deductions: deductionsMonthly,
    incomeTax: taxMonthly,
    socialContributions: socialMonthly,
    netIncome: netMonthly,
  }));
}

export function getTaxDocumentsData(
  result: TaxResult,
  inputs: TaxInputs,
  taxYearLabel: string,
): TaxDocumentsData {
  const isUK = result.regimeKey === 'uk';
  const monthlyBreakdown = buildMonthlyBreakdown(result, isUK);

  if (result.regimeKey === 'uk') {
    const totalIncomeTax = result.incomeTax + (result.foreignIncomeTax ?? 0);
    const totalTaxAndNi = totalIncomeTax + result.socialContributions;
    const isMtdYear = taxYearLabel.startsWith('2026') || taxYearLabel === '2026/27';
    const mtdQuarterlyUpdates = isMtdYear
      ? [
          { quarter: 1, periodLabel: '6 Apr – 5 Jul', deadline: '7 August' },
          { quarter: 2, periodLabel: '6 Apr – 5 Oct', deadline: '7 November' },
          { quarter: 3, periodLabel: '6 Apr – 5 Jan', deadline: '7 February' },
          { quarter: 4, periodLabel: '6 Apr – 5 Apr', deadline: '7 May' },
        ]
      : undefined;
    return {
      regimeKey: 'uk',
      currency: 'GBP',
      taxYearLabel,
      monthlyBreakdown,
      sa100: {
        totalIncome: result.grossIncome,
        taxableIncome: result.taxableIncome,
        incomeTax: totalIncomeTax,
        ni: result.socialContributions,
      },
      sa105: inputs.foreignPropertyEnabled && inputs.foreignPropertyCountry === 'UK'
        ? (() => {
            const rentalAnnual = (inputs.foreignPropertyRentalIncome ?? 0) * 12;
            const deductiblesAnnual = (inputs.foreignPropertyDeductibles ?? 0) * 12;
            const mortgageInterestAnnual = (inputs.foreignPropertyMortgageInterest ?? 0) * 12;
            const { currency } = computeForeignPropertyNetAnnual(inputs);
            const rentalGBP = convert(rentalAnnual, currency, 'GBP', inputs.exchangeRate);
            const deductiblesGBP = convert(deductiblesAnnual, currency, 'GBP', inputs.exchangeRate);
            const mortgageGBP = convert(mortgageInterestAnnual, currency, 'GBP', inputs.exchangeRate);
            const netProfit = Math.max(0, rentalGBP - deductiblesGBP); // UK: mortgage not deductible
            const s24Credit = mortgageGBP * 0.2;
            const taxDue = result.foreignIncomeTax ?? 0;
            return {
              rentalIncome: rentalGBP,
              allowableExpenses: deductiblesGBP,
              netProfit,
              mortgageInterest: mortgageGBP,
              s24Credit,
              taxDue,
            };
          })()
        : undefined,
      paymentsOnAccount: {
        balancingPayment: totalTaxAndNi,
        firstPOA: totalTaxAndNi / 2,
        secondPOA: totalTaxAndNi / 2,
      },
      mtdQuarterlyUpdates,
    };
  }

  if (result.regimeKey === 'spainBeckham') {
    const ukPropertyForms =
      inputs.foreignPropertyEnabled && inputs.foreignPropertyCountry === 'UK'
        ? buildUkPropertyForms(inputs, taxYearLabel)
        : undefined;
    return {
      regimeKey: 'spainBeckham',
      currency: 'EUR',
      taxYearLabel,
      monthlyBreakdown,
      modelo151: {
        spanishIncome: result.taxableIncome + (result.pensionContribution ?? 0),
        tax24: result.incomeTax,
        socialSecurity: result.socialContributions,
      },
      ukPropertyForms,
    };
  }

  if (result.regimeKey === 'spainAutonomo') {
    const netProfit = result.netTaxableProfit ?? result.grossIncome - (result.expenseDeduction ?? 0);
    const quarterlyNet = netProfit / 4;
    const modelo130Rate = 0.2;
    const quarterlyDue = Math.max(0, quarterlyNet * modelo130Rate);
    const modelo130 = [
      { quarter: 1, netProfit: quarterlyNet, rate: modelo130Rate, amountDue: quarterlyDue, deadline: '20 April' },
      { quarter: 2, netProfit: quarterlyNet, rate: modelo130Rate, amountDue: quarterlyDue, deadline: '20 July' },
      { quarter: 3, netProfit: quarterlyNet, rate: modelo130Rate, amountDue: quarterlyDue, deadline: '20 October' },
      { quarter: 4, netProfit: quarterlyNet, rate: modelo130Rate, amountDue: quarterlyDue, deadline: '30 January' },
    ];
    const modelo130ByMonth = [quarterlyDue, 0, 0, quarterlyDue, 0, 0, quarterlyDue, 0, 0, quarterlyDue, 0, 0];
    const breakdownWithModelo = monthlyBreakdown.map((row, idx) => ({
      ...row,
      modelo130Installment: modelo130ByMonth[idx],
    }));

    const ukPropertyForms =
      inputs.foreignPropertyEnabled && inputs.foreignPropertyCountry === 'UK'
        ? buildUkPropertyForms(inputs, taxYearLabel)
        : undefined;
    return {
      regimeKey: 'spainAutonomo',
      currency: 'EUR',
      taxYearLabel,
      monthlyBreakdown: breakdownWithModelo,
      modelo130,
      modelo100: {
        totalIncome: result.grossIncome,
        totalDeductions: result.totalDeductions,
        taxDue: result.incomeTax,
        modelo130Prepayments: quarterlyDue * 4,
      },
      ukPropertyForms,
    };
  }

  // Spain Normal
  const ukPropertyForms =
    inputs.foreignPropertyEnabled && inputs.foreignPropertyCountry === 'UK'
      ? buildUkPropertyForms(inputs, taxYearLabel)
      : undefined;
  return {
    regimeKey: 'spainNormal',
    currency: 'EUR',
    taxYearLabel,
    monthlyBreakdown,
    ukPropertyForms,
  };
}

/** UK property form data when Spain resident owns UK rental — HMRC still taxes UK property */
function buildUkPropertyForms(
  inputs: TaxInputs,
  spainTaxYearLabel: string,
): NonNullable<TaxDocumentsData['ukPropertyForms']> | null {
  const rentalAnnual = (inputs.foreignPropertyRentalIncome ?? 0) * 12;
  const deductiblesAnnual = (inputs.foreignPropertyDeductibles ?? 0) * 12;
  const mortgageInterestAnnual = (inputs.foreignPropertyMortgageInterest ?? 0) * 12;
  const { currency } = computeForeignPropertyNetAnnual(inputs);
  const rentalGBP = convert(rentalAnnual, currency, 'GBP', inputs.exchangeRate);
  const deductiblesGBP = convert(deductiblesAnnual, currency, 'GBP', inputs.exchangeRate);
  const mortgageGBP = convert(mortgageInterestAnnual, currency, 'GBP', inputs.exchangeRate);
  const netProfit = Math.max(0, rentalGBP - deductiblesGBP);
  const s24Credit = mortgageGBP * 0.2;
  const ukTaxYearLabel =
    spainTaxYearLabel.length <= 4
      ? `${spainTaxYearLabel}/${String(parseInt(spainTaxYearLabel) + 1).slice(-2)}`
      : spainTaxYearLabel;

  const breakdown = computeUKPropertyTaxBreakdownForNonResident(inputs, ukTaxYearLabel);
  if (!breakdown) return null;

  const { personalAllowance, taxableAfterPA, taxBeforeS24, netTaxDue } = breakdown;
  let explanation = `Net profit £${Math.round(netProfit).toLocaleString()} minus personal allowance £${Math.round(personalAllowance).toLocaleString()} = £${Math.round(taxableAfterPA).toLocaleString()} taxable. `;
  explanation += `Tax on that amount = £${Math.round(taxBeforeS24).toLocaleString()}. `;
  explanation += `Section 24 credit (20% of mortgage interest) = £${Math.round(s24Credit).toLocaleString()}. `;
  if (s24Credit >= taxBeforeS24) {
    explanation += `The S24 credit (£${Math.round(s24Credit).toLocaleString()}) exceeds the tax due (£${Math.round(taxBeforeS24).toLocaleString()}), so you owe £0. The excess credit cannot be refunded or carried forward.`;
  } else {
    explanation += `Net UK tax = £${Math.round(taxBeforeS24).toLocaleString()} − £${Math.round(s24Credit).toLocaleString()} = £${Math.round(netTaxDue).toLocaleString()}.`;
  }

  return {
    rentalIncome: rentalGBP,
    allowableExpenses: deductiblesGBP,
    netProfit,
    mortgageInterest: mortgageGBP,
    s24Credit,
    ukTaxDue: netTaxDue,
    ukTaxYearLabel,
    calculationBreakdown: {
      personalAllowance,
      taxableAfterPA,
      taxBeforeS24,
      s24Credit,
      netTaxDue,
      explanation,
    },
  };
}
