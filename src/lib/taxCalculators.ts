import {
  TaxInputs, TaxResult, TaxYearConfig, BandBreakdown, CalculationStep, Currency,
} from '@/types/tax';
import {
  ukTaxConfig, spainNormalConfig, spainBeckhamConfig, spainAutonomoConfig,
} from '@/data/taxConfig';

// Currency conversion helpers
export function convert(amount: number, from: Currency, to: Currency, rate: number): number {
  if (from === to) return amount;
  if (from === 'GBP' && to === 'EUR') return amount * rate;
  return amount / rate;
}

function fmt(n: number): string {
  return n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Progressive tax calculation
function calcProgressiveTax(
  taxableIncome: number,
  bands: TaxYearConfig['bands'],
): { tax: number; breakdown: BandBreakdown[] } {
  let remaining = taxableIncome;
  let tax = 0;
  const breakdown: BandBreakdown[] = [];

  for (const band of bands) {
    if (remaining <= 0) break;
    const bandWidth = band.to !== null ? band.to - band.from : Infinity;
    const taxableInBand = Math.min(remaining, bandWidth);
    const bandTax = taxableInBand * band.rate;
    tax += bandTax;
    breakdown.push({
      band: band.to !== null
        ? `${fmt(band.from)} – ${fmt(band.to)}`
        : `${fmt(band.from)}+`,
      taxableInBand,
      rate: band.rate,
      tax: bandTax,
    });
    remaining -= taxableInBand;
  }

  return { tax, breakdown };
}

// UK Calculation
export function calculateUK(inputs: TaxInputs, taxYear: string): TaxResult {
  const config = ukTaxConfig[taxYear];
  const grossGBP = convert(inputs.grossSalary, inputs.salaryCurrency, 'GBP', inputs.exchangeRate);
  const steps: CalculationStep[] = [];
  const warnings: string[] = [];

  steps.push({ label: 'Gross salary (GBP)', amount: grossGBP });

  // Personal allowance with taper
  let pa = config.personalAllowance!;
  if (grossGBP > config.personalAllowanceTaperStart!) {
    const reduction = Math.floor((grossGBP - config.personalAllowanceTaperStart!) / 2);
    pa = Math.max(0, pa - reduction);
    steps.push({ label: 'Personal allowance (tapered)', amount: pa, detail: `Reduced from £${fmt(config.personalAllowance!)} due to income over £${fmt(config.personalAllowanceTaperStart!)}` });
  } else {
    steps.push({ label: 'Personal allowance', amount: pa });
  }

  const taxableIncome = Math.max(0, grossGBP - pa);
  steps.push({ label: 'Taxable income', amount: taxableIncome });

  const { tax: incomeTax, breakdown } = calcProgressiveTax(taxableIncome, config.bands);
  steps.push({ label: 'Income tax', amount: incomeTax });

  // NI
  let ni = 0;
  if (inputs.includeUkNi && config.niThresholds) {
    const { primary, upper, primaryRate, upperRate } = config.niThresholds;
    if (grossGBP > primary) {
      const mainNi = Math.min(grossGBP, upper) - primary;
      ni += Math.max(0, mainNi) * primaryRate;
      if (grossGBP > upper) {
        ni += (grossGBP - upper) * upperRate;
      }
    }
    steps.push({ label: 'Employee National Insurance', amount: ni });
  }

  // Foreign property income in UK
  let foreignTax = 0;
  let foreignIncluded = false;
  if (inputs.foreignPropertyEnabled && inputs.ukResident) {
    const propGBP = convert(inputs.foreignPropertyIncome, inputs.foreignPropertyCurrency, 'GBP', inputs.exchangeRate);
    foreignTax = propGBP * 0.20; // simplified: basic rate on rental
    foreignIncluded = true;
    steps.push({ label: 'Foreign property income tax (est.)', amount: foreignTax, detail: 'Simplified estimate at basic rate on net rental income' });
    warnings.push('Foreign property income tax is a simplified estimate. Actual liability depends on total income and available reliefs.');
  }

  const totalDeductions = incomeTax + ni + foreignTax;
  const netAnnual = grossGBP - totalDeductions;

  steps.push({ label: 'Total deductions', amount: totalDeductions });
  steps.push({ label: 'Net annual (GBP)', amount: netAnnual });

  return {
    regime: 'UK Employed',
    regimeKey: 'uk',
    grossIncome: grossGBP,
    grossCurrency: 'GBP',
    taxableIncome,
    incomeTax,
    socialContributions: ni,
    totalDeductions,
    netAnnual,
    netMonthly: netAnnual / 12,
    effectiveRate: grossGBP > 0 ? (totalDeductions / grossGBP) * 100 : 0,
    takeHomePercent: grossGBP > 0 ? (netAnnual / grossGBP) * 100 : 0,
    steps,
    bandBreakdown: breakdown,
    foreignIncomeIncluded: foreignIncluded,
    foreignIncomeTax: foreignTax,
    warnings,
  };
}

// Spain Normal Calculation
export function calculateSpainNormal(inputs: TaxInputs, taxYear: string): TaxResult {
  const config = spainNormalConfig[taxYear];
  const grossEUR = convert(inputs.grossSalary, inputs.salaryCurrency, 'EUR', inputs.exchangeRate);
  const steps: CalculationStep[] = [];
  const warnings: string[] = [];

  steps.push({ label: 'Gross salary (EUR)', amount: grossEUR });

  // Social security
  const ssBase = Math.min(grossEUR, config.socialSecurityCap!);
  const ss = ssBase * config.socialSecurityRate!;
  steps.push({ label: 'Employee social security', amount: ss, detail: `${(config.socialSecurityRate! * 100).toFixed(2)}% on base up to €${fmt(config.socialSecurityCap!)}` });

  // Taxable income
  const afterSS = grossEUR - ss;
  const generalDeduction = config.generalDeduction!;
  const reducedBase = Math.max(0, afterSS - generalDeduction);
  steps.push({ label: 'After SS & general deduction (€2,000)', amount: reducedBase });

  // IRPF on reduced base minus personal minimum
  const personalMin = config.personalMinimum!;
  const taxableIncome = Math.max(0, reducedBase);
  const { tax: grossTax, breakdown } = calcProgressiveTax(taxableIncome, config.bands);
  const { tax: minTax } = calcProgressiveTax(personalMin, config.bands);
  const incomeTax = Math.max(0, grossTax - minTax);

  steps.push({ label: 'IRPF (gross)', amount: grossTax });
  steps.push({ label: 'Personal minimum tax credit', amount: -minTax, detail: `Tax on €${fmt(personalMin)} personal minimum` });
  steps.push({ label: 'Net IRPF', amount: incomeTax });

  // Foreign property
  let foreignTax = 0;
  let foreignIncluded = false;
  if (inputs.foreignPropertyEnabled && inputs.spainResident && inputs.treatAsForeignSource) {
    const propEUR = convert(inputs.foreignPropertyIncome, inputs.foreignPropertyCurrency, 'EUR', inputs.exchangeRate);
    foreignTax = propEUR * 0.19;
    foreignIncluded = true;
    steps.push({ label: 'Foreign property income tax (est.)', amount: foreignTax, detail: 'Included in worldwide income; simplified at savings base rate' });
  }

  const totalDeductions = incomeTax + ss + foreignTax;
  const netAnnual = grossEUR - totalDeductions;

  steps.push({ label: 'Total deductions', amount: totalDeductions });
  steps.push({ label: 'Net annual (EUR)', amount: netAnnual });

  return {
    regime: 'Spain Normal',
    regimeKey: 'spainNormal',
    grossIncome: grossEUR,
    grossCurrency: 'EUR',
    taxableIncome,
    incomeTax,
    socialContributions: ss,
    totalDeductions,
    netAnnual,
    netMonthly: netAnnual / 12,
    effectiveRate: grossEUR > 0 ? (totalDeductions / grossEUR) * 100 : 0,
    takeHomePercent: grossEUR > 0 ? (netAnnual / grossEUR) * 100 : 0,
    steps,
    bandBreakdown: breakdown,
    foreignIncomeIncluded: foreignIncluded,
    foreignIncomeTax: foreignTax,
    warnings,
  };
}

// Spain Beckham Calculation
export function calculateSpainBeckham(inputs: TaxInputs, taxYear: string): TaxResult {
  const config = spainBeckhamConfig[taxYear];
  const normalConfig = spainNormalConfig[taxYear];
  const grossEUR = convert(inputs.grossSalary, inputs.salaryCurrency, 'EUR', inputs.exchangeRate);
  const steps: CalculationStep[] = [];
  const warnings: string[] = [];
  const breakdown: BandBreakdown[] = [];

  steps.push({ label: 'Gross salary (EUR)', amount: grossEUR });

  // Social security (same as normal employee)
  const ssBase = Math.min(grossEUR, normalConfig.socialSecurityCap!);
  const ss = ssBase * normalConfig.socialSecurityRate!;
  steps.push({ label: 'Employee social security', amount: ss });

  // Beckham flat rate
  const threshold = config.beckhamThreshold!;
  let incomeTax = 0;
  if (grossEUR <= threshold) {
    incomeTax = grossEUR * config.beckhamFlatRate!;
    breakdown.push({ band: `0 – ${fmt(threshold)}`, taxableInBand: grossEUR, rate: config.beckhamFlatRate!, tax: incomeTax });
  } else {
    const lowerTax = threshold * config.beckhamFlatRate!;
    const upperTax = (grossEUR - threshold) * config.beckhamUpperRate!;
    incomeTax = lowerTax + upperTax;
    breakdown.push({ band: `0 – ${fmt(threshold)}`, taxableInBand: threshold, rate: config.beckhamFlatRate!, tax: lowerTax });
    breakdown.push({ band: `${fmt(threshold)}+`, taxableInBand: grossEUR - threshold, rate: config.beckhamUpperRate!, tax: upperTax });
  }
  steps.push({ label: 'Beckham Law income tax', amount: incomeTax, detail: `Flat ${(config.beckhamFlatRate! * 100)}% up to €${fmt(threshold)}` });

  // Foreign property income — generally NOT included under Beckham
  let foreignTax = 0;
  let foreignIncluded = false;
  if (inputs.foreignPropertyEnabled) {
    if (inputs.treatAsForeignSource) {
      warnings.push('Under Beckham Law, foreign-source income is generally exempt from Spanish tax. Foreign property income is excluded from this calculation.');
    } else {
      const propEUR = convert(inputs.foreignPropertyIncome, inputs.foreignPropertyCurrency, 'EUR', inputs.exchangeRate);
      foreignTax = propEUR * config.beckhamFlatRate!;
      foreignIncluded = true;
      steps.push({ label: 'Property income tax (treated as Spanish-source)', amount: foreignTax });
    }
  }

  const totalDeductions = incomeTax + ss + foreignTax;
  const netAnnual = grossEUR - totalDeductions;

  steps.push({ label: 'Total deductions', amount: totalDeductions });
  steps.push({ label: 'Net annual (EUR)', amount: netAnnual });

  return {
    regime: 'Spain Beckham',
    regimeKey: 'spainBeckham',
    grossIncome: grossEUR,
    grossCurrency: 'EUR',
    taxableIncome: grossEUR,
    incomeTax,
    socialContributions: ss,
    totalDeductions,
    netAnnual,
    netMonthly: netAnnual / 12,
    effectiveRate: grossEUR > 0 ? (totalDeductions / grossEUR) * 100 : 0,
    takeHomePercent: grossEUR > 0 ? (netAnnual / grossEUR) * 100 : 0,
    steps,
    bandBreakdown: breakdown,
    foreignIncomeIncluded: foreignIncluded,
    foreignIncomeTax: foreignTax,
    warnings,
  };
}

// Spain Autónomo Calculation
export function calculateSpainAutonomo(inputs: TaxInputs, taxYear: string): TaxResult {
  const config = spainAutonomoConfig[taxYear];
  const grossEUR = convert(inputs.freelanceRevenue, inputs.freelanceCurrency, 'EUR', inputs.exchangeRate);
  const steps: CalculationStep[] = [];
  const warnings: string[] = [];

  if (grossEUR <= 0) {
    return {
      regime: 'Spain Autónomo',
      regimeKey: 'spainAutonomo',
      grossIncome: 0,
      grossCurrency: 'EUR',
      expenseDeduction: 0,
      taxableIncome: 0,
      incomeTax: 0,
      socialContributions: 0,
      totalDeductions: 0,
      netAnnual: 0,
      netMonthly: 0,
      effectiveRate: 0,
      takeHomePercent: 0,
      steps: [{ label: 'Enter freelance revenue to calculate', amount: 0 }],
      bandBreakdown: [],
      foreignIncomeIncluded: false,
      foreignIncomeTax: 0,
      warnings: ['Please enter freelance revenue to see autónomo calculations.'],
      netTaxableProfit: 0,
      cuotaAutonomoMonthly: 0,
      cuotaAutonomoAnnual: 0,
    };
  }

  steps.push({ label: 'Gross freelance revenue (EUR)', amount: grossEUR });

  // Expense deduction
  const expenseDeduction = grossEUR * (inputs.expenseDeductionRate / 100);
  const netProfit = grossEUR - expenseDeduction;
  steps.push({ label: `Flat expense deduction (${inputs.expenseDeductionRate}%)`, amount: expenseDeduction });
  steps.push({ label: 'Net taxable profit', amount: netProfit });

  // Cuota de autónomo (progressive, 2025)
  const monthlyProfit = netProfit / 12;
  let cuotaMonthly = 200; // default minimum
  if (config.autonomoTramos) {
    for (const tramo of config.autonomoTramos) {
      if (tramo.maxMonthly === null) {
        if (monthlyProfit >= tramo.minMonthly) cuotaMonthly = tramo.cuota;
      } else {
        if (monthlyProfit >= tramo.minMonthly && monthlyProfit < tramo.maxMonthly) {
          cuotaMonthly = tramo.cuota;
          break;
        }
      }
    }
  }
  const cuotaAnnual = cuotaMonthly * 12;
  steps.push({ label: 'Cuota de autónomo (monthly)', amount: cuotaMonthly, detail: `Based on monthly net profit of €${fmt(Math.round(monthlyProfit))}` });
  steps.push({ label: 'Cuota de autónomo (annual)', amount: cuotaAnnual });

  // IRPF on net profit minus general deduction
  const generalDeduction = config.generalDeduction!;
  const reducedBase = Math.max(0, netProfit - generalDeduction - cuotaAnnual);
  steps.push({ label: 'Taxable base (after deductions & cuota)', amount: reducedBase });

  const personalMin = config.personalMinimum!;
  const { tax: grossTax, breakdown } = calcProgressiveTax(reducedBase, config.bands);
  const { tax: minTax } = calcProgressiveTax(personalMin, config.bands);
  const incomeTax = Math.max(0, grossTax - minTax);

  steps.push({ label: 'IRPF (gross)', amount: grossTax });
  steps.push({ label: 'Personal minimum tax credit', amount: -minTax });
  steps.push({ label: 'Net IRPF', amount: incomeTax });

  // Foreign property
  let foreignTax = 0;
  let foreignIncluded = false;
  if (inputs.foreignPropertyEnabled && inputs.spainResident && inputs.treatAsForeignSource) {
    const propEUR = convert(inputs.foreignPropertyIncome, inputs.foreignPropertyCurrency, 'EUR', inputs.exchangeRate);
    foreignTax = propEUR * 0.19;
    foreignIncluded = true;
    steps.push({ label: 'Foreign property income tax (est.)', amount: foreignTax });
  }

  const totalDeductions = incomeTax + cuotaAnnual + foreignTax;
  const netAnnual = grossEUR - expenseDeduction - totalDeductions;

  steps.push({ label: 'Total deductions (tax + cuota)', amount: totalDeductions });
  steps.push({ label: 'Net annual (EUR)', amount: netAnnual });

  return {
    regime: 'Spain Autónomo',
    regimeKey: 'spainAutonomo',
    grossIncome: grossEUR,
    grossCurrency: 'EUR',
    expenseDeduction,
    taxableIncome: reducedBase,
    incomeTax,
    socialContributions: cuotaAnnual,
    totalDeductions,
    netAnnual,
    netMonthly: netAnnual / 12,
    effectiveRate: grossEUR > 0 ? ((totalDeductions + expenseDeduction) / grossEUR) * 100 : 0,
    takeHomePercent: grossEUR > 0 ? (netAnnual / grossEUR) * 100 : 0,
    steps,
    bandBreakdown: breakdown,
    foreignIncomeIncluded: foreignIncluded,
    foreignIncomeTax: foreignTax,
    warnings,
    netTaxableProfit: netProfit,
    cuotaAutonomoMonthly: cuotaMonthly,
    cuotaAutonomoAnnual: cuotaAnnual,
  };
}
