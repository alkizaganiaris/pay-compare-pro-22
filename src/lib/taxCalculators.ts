import {
  TaxInputs, TaxResult, TaxYearConfig, BandBreakdown, CalculationStep, Currency,
} from '@/types/tax';
import {
  ukTaxConfig, spainNormalConfig, spainBeckhamConfig, spainAutonomoConfig, SMI_MONTHLY,
} from '@/data/taxConfig';

// Spain calendar year -> UK tax year (for UK property tax when Spain resident)
const UK_YEAR_FROM_SPAIN: Record<string, string> = { '2023': '2023/24', '2024': '2024/25', '2025': '2025/26', '2026': '2026/27' };

// Currency conversion helpers
export function convert(amount: number, from: Currency, to: Currency, rate: number): number {
  if (from === to) return amount;
  if (from === 'GBP' && to === 'EUR') return amount * rate;
  return amount / rate;
}

// Foreign property: compute net taxable income (annual) and net cash flow from monthly figures
// For UK (S24): mortgage interest is NOT deductible; 20% tax credit applies instead
export function computeForeignPropertyNetAnnual(inputs: TaxInputs): {
  netAnnual: number;
  mortgageInterestAnnual: number;
  netCashFlowAnnual: number;
  isUk: boolean;
  currency: Currency;
} {
  const rental = inputs.foreignPropertyRentalIncome ?? 0;
  const deductibles = inputs.foreignPropertyDeductibles ?? 0;
  const mortgageInterest = inputs.foreignPropertyMortgageInterest ?? 0;
  const mortgagePayment = inputs.foreignPropertyMortgagePayment ?? 0;
  const mortgageDeductiblePct = inputs.foreignPropertyMortgageInterestDeductiblePercent ?? 0;
  const isUk = inputs.foreignPropertyCountry === 'UK';

  // S24: UK allows 0% deduction; relief is via 20% tax credit
  const mortgageDeductibleAmount = isUk
    ? 0
    : mortgageInterest * (mortgageDeductiblePct / 100);

  const netMonthly = Math.max(0, rental - deductibles - mortgageDeductibleAmount);
  const netAnnual = netMonthly * 12;
  const mortgageInterestAnnual = mortgageInterest * 12;

  // Net cash flow: rental minus expenses and full mortgage payment (principal + interest)
  const netCashFlowMonthly = rental - deductibles - mortgagePayment;
  const netCashFlowAnnual = netCashFlowMonthly * 12;

  return { netAnnual, mortgageInterestAnnual, netCashFlowAnnual, isUk, currency: inputs.foreignPropertyCurrency };
}

// Spain: mortgage interest on rental property is fully deductible (Agencia Tributaria Art. 23 Law PIT).
// Limit: total deductions (interest + maintenance/repair) cannot exceed gross rental income; excess carries forward up to 4 years.
// Used when property income is taxed in Spain (Spain Normal, Beckham, Autónomo).
export function computePropertyNetForSpain(inputs: TaxInputs): {
  netAnnual: number;
  netCashFlowAnnual: number;
  currency: Currency;
} {
  const rentalMonthly = inputs.foreignPropertyRentalIncome ?? 0;
  const deductiblesMonthly = inputs.foreignPropertyDeductibles ?? 0;
  const mortgageInterestMonthly = inputs.foreignPropertyMortgageInterest ?? 0;
  const mortgagePaymentMonthly = inputs.foreignPropertyMortgagePayment ?? 0;

  const grossRentalAnnual = rentalMonthly * 12;
  const deductiblesAnnual = deductiblesMonthly * 12;
  const mortgageInterestAnnual = mortgageInterestMonthly * 12;

  // Spain: 100% mortgage interest deductible; total deductions capped at gross income
  const totalDeductions = deductiblesAnnual + mortgageInterestAnnual;
  const allowableDeductions = Math.min(totalDeductions, grossRentalAnnual);
  const netAnnual = Math.max(0, grossRentalAnnual - allowableDeductions);

  const netCashFlowMonthly = rentalMonthly - deductiblesMonthly - mortgagePaymentMonthly;
  const netCashFlowAnnual = netCashFlowMonthly * 12;

  return { netAnnual, netCashFlowAnnual, currency: inputs.foreignPropertyCurrency };
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

// UK tax on UK property for non-UK residents (e.g. Spain resident with UK property)
// Uses personal allowance, progressive bands, S24 mortgage interest credit
export function computeUKPropertyTaxForNonResident(inputs: TaxInputs, taxYear: string): number {
  const breakdown = computeUKPropertyTaxBreakdownForNonResident(inputs, taxYear);
  return breakdown?.netTaxDue ?? 0;
}

/** Full breakdown of UK property tax for non-residents (for display) */
export function computeUKPropertyTaxBreakdownForNonResident(
  inputs: TaxInputs,
  taxYear: string,
): {
  netProfit: number;
  personalAllowance: number;
  taxableAfterPA: number;
  taxBeforeS24: number;
  s24Credit: number;
  netTaxDue: number;
} | null {
  if (!inputs.foreignPropertyEnabled || inputs.foreignPropertyCountry !== 'UK') return null;
  const config = ukTaxConfig[taxYear];
  const { netAnnual: propNet, mortgageInterestAnnual, currency } = computeForeignPropertyNetAnnual(inputs);
  const propGBP = convert(propNet, currency, 'GBP', inputs.exchangeRate);
  const mortgageGBP = convert(mortgageInterestAnnual, currency, 'GBP', inputs.exchangeRate);
  if (propGBP <= 0) return null;

  let pa = config.personalAllowance!;
  if (propGBP > config.personalAllowanceTaperStart!) {
    const reduction = Math.floor((propGBP - config.personalAllowanceTaperStart!) / 2);
    pa = Math.max(0, pa - reduction);
  }
  const taxableProp = Math.max(0, propGBP - pa);
  const { tax: taxOnProp } = calcProgressiveTax(taxableProp, config.bands);
  const s24Credit = mortgageGBP * 0.20;
  const netTaxDue = Math.max(0, taxOnProp - s24Credit);
  return {
    netProfit: propGBP,
    personalAllowance: pa,
    taxableAfterPA: taxableProp,
    taxBeforeS24: taxOnProp,
    s24Credit,
    netTaxDue,
  };
}

// Portugal: non-resident rental tax. 28% flat on net income (mortgage interest NOT deductible for non-residents).
export function computePortugalPropertyTax(inputs: TaxInputs): number {
  if (!inputs.foreignPropertyEnabled || inputs.foreignPropertyCountry !== 'Portugal') return 0;
  const { netAnnual, currency } = computeForeignPropertyNetAnnual(inputs);
  // Portugal: mortgage NOT deductible for non-residents; deductibles (maintenance, IMI, etc.) are
  const rentalAnnual = (inputs.foreignPropertyRentalIncome ?? 0) * 12;
  const deductiblesAnnual = (inputs.foreignPropertyDeductibles ?? 0) * 12;
  const netForPortugal = Math.max(0, rentalAnnual - deductiblesAnnual);
  const netEUR = convert(netForPortugal, inputs.foreignPropertyCurrency, 'EUR', inputs.exchangeRate);
  if (netEUR <= 0) return 0;
  return netEUR * 0.28;
}

// Greece: non-resident rental tax. Progressive 15%/35%/45% on net (40% standard expense deduction optional).
export function computeGreecePropertyTax(inputs: TaxInputs): number {
  if (!inputs.foreignPropertyEnabled || inputs.foreignPropertyCountry !== 'Greece') return 0;
  const rentalAnnual = (inputs.foreignPropertyRentalIncome ?? 0) * 12;
  const deductiblesAnnual = (inputs.foreignPropertyDeductibles ?? 0) * 12;
  const netBeforeStandard = Math.max(0, rentalAnnual - deductiblesAnnual);
  const netEUR = convert(netBeforeStandard, inputs.foreignPropertyCurrency, 'EUR', inputs.exchangeRate);
  if (netEUR <= 0) return 0;
  // Progressive: 0–12k @15%, 12–35k @35%, 35k+ @45%
  let tax = 0;
  if (netEUR > 12000) {
    tax += 12000 * 0.15;
    if (netEUR > 35000) {
      tax += 23000 * 0.35;
      tax += (netEUR - 35000) * 0.45;
    } else {
      tax += (netEUR - 12000) * 0.35;
    }
  } else {
    tax = netEUR * 0.15;
  }
  return tax;
}

// Italy: cedolare secca. 21% flat on first residential property rental (non-residents).
export function computeItalyPropertyTax(inputs: TaxInputs): number {
  if (!inputs.foreignPropertyEnabled || inputs.foreignPropertyCountry !== 'Italy') return 0;
  const { netAnnual, currency } = computeForeignPropertyNetAnnual(inputs);
  const netEUR = convert(netAnnual, currency, 'EUR', inputs.exchangeRate);
  if (netEUR <= 0) return 0;
  return netEUR * 0.21;
}

// Compute property tax for the source country (Portugal, Greece, Italy) when owner is non-resident
function computePropertyCountryTax(inputs: TaxInputs): { country: string; amount: number; currency: Currency } | null {
  const country = inputs.foreignPropertyCountry;
  if (!inputs.foreignPropertyEnabled || !country) return null;
  if (country === 'UK' || country === 'Spain') return null; // UK and Spain handled separately
  let amount = 0;
  if (country === 'Portugal') amount = computePortugalPropertyTax(inputs);
  else if (country === 'Greece') amount = computeGreecePropertyTax(inputs);
  else if (country === 'Italy') amount = computeItalyPropertyTax(inputs);
  else return null;
  if (amount <= 0) return null;
  return { country, amount, currency: 'EUR' as Currency };
}

// UK Calculation
export function calculateUK(inputs: TaxInputs, taxYear: string): TaxResult {
  const config = ukTaxConfig[taxYear];
  const grossGBP = convert(inputs.grossSalary, inputs.salaryCurrency, 'GBP', inputs.exchangeRate);
  const pensionPct = inputs.pensionContributionPercent ?? 0;
  const pensionGBP = grossGBP * (pensionPct / 100);
  const taxableGrossGBP = grossGBP - pensionGBP;

  const steps: CalculationStep[] = [];
  const warnings: string[] = [];

  steps.push({ label: 'Gross salary (GBP)', amount: grossGBP, section: 'employment' });
  if (pensionGBP > 0) {
    steps.push({ label: 'Pension (salary sacrifice)', amount: -pensionGBP, detail: `${pensionPct}% of gross`, section: 'employment' });
    steps.push({ label: 'Taxable gross (GBP)', amount: taxableGrossGBP, section: 'employment' });
  }

  // Personal allowance with taper
  let pa = config.personalAllowance!;
  if (taxableGrossGBP > config.personalAllowanceTaperStart!) {
    const reduction = Math.floor((taxableGrossGBP - config.personalAllowanceTaperStart!) / 2);
    pa = Math.max(0, pa - reduction);
    steps.push({ label: 'Personal allowance (tapered)', amount: pa, detail: `Reduced from £${fmt(config.personalAllowance!)} due to income over £${fmt(config.personalAllowanceTaperStart!)}`, section: 'employment' });
  } else {
    steps.push({ label: 'Personal allowance', amount: pa, section: 'employment' });
  }

  const taxableIncome = Math.max(0, taxableGrossGBP - pa);
  steps.push({ label: 'Taxable income', amount: taxableIncome, section: 'employment' });

  let { tax: incomeTax, breakdown } = calcProgressiveTax(taxableIncome, config.bands);
  steps.push({ label: 'Income tax', amount: incomeTax, section: 'employment' });

  // NI (salary sacrifice reduces NI base - calculated on post-sacrifice pay)
  let ni = 0;
  if (inputs.includeUkNi && config.niThresholds) {
    const { primary, upper, primaryRate, upperRate } = config.niThresholds;
    if (taxableGrossGBP > primary) {
      const mainNi = Math.min(taxableGrossGBP, upper) - primary;
      ni += Math.max(0, mainNi) * primaryRate;
      if (taxableGrossGBP > upper) {
        ni += (taxableGrossGBP - upper) * upperRate;
      }
    }
    steps.push({ label: 'Employee National Insurance', amount: ni, section: 'employment' });
  }

  // Foreign property income in UK
  // UK scenario assumes UK resident: property added to main return (S24 for UK property)
  let foreignTax = 0;
  let foreignIncluded = false;
  let foreignPropertyNetAnnual: number | undefined;
  let foreignPropertyNetCashFlow: number | undefined;
  let ukPropertyTax: number | undefined;
  if (inputs.foreignPropertyEnabled) {
    const { netAnnual: propNet, mortgageInterestAnnual, netCashFlowAnnual, isUk, currency } = computeForeignPropertyNetAnnual(inputs);
    const propGBP = convert(propNet, currency, 'GBP', inputs.exchangeRate);
    foreignPropertyNetCashFlow = convert(netCashFlowAnnual, currency, 'GBP', inputs.exchangeRate);
    foreignPropertyNetAnnual = propGBP;
    const mortgageGBP = convert(mortgageInterestAnnual, currency, 'GBP', inputs.exchangeRate);
    if (isUk) {
      // Property income is added to employment income; tax at marginal rate based on total
      const totalIncomeBeforePA = taxableGrossGBP + propGBP;
      let paWithProperty = config.personalAllowance!;
      if (totalIncomeBeforePA > config.personalAllowanceTaperStart!) {
        const reduction = Math.floor((totalIncomeBeforePA - config.personalAllowanceTaperStart!) / 2);
        paWithProperty = Math.max(0, paWithProperty - reduction);
      }
      const totalTaxableWithProperty = Math.max(0, totalIncomeBeforePA - paWithProperty);
      const { tax: totalTaxWithProperty, breakdown: totalBreakdown } = calcProgressiveTax(totalTaxableWithProperty, config.bands);
      breakdown = totalBreakdown;
      const taxOnPropertyAtMarginalRate = Math.max(0, totalTaxWithProperty - incomeTax);
      const s24Credit = mortgageGBP * 0.20;
      foreignTax = Math.max(0, taxOnPropertyAtMarginalRate - s24Credit);
      steps.push({ label: 'UK property: tax at marginal rate', amount: taxOnPropertyAtMarginalRate, detail: 'Property income added to employment; tax based on total income', section: 'property' });
      steps.push({ label: 'S24 mortgage interest tax credit (20%)', amount: -s24Credit, detail: `20% of £${fmt(mortgageGBP)} mortgage interest`, section: 'property' });
      steps.push({ label: 'UK property tax (net)', amount: foreignTax, section: 'property' });
    } else {
      // Non-UK property: use marginal rate (add to total income)
      const totalIncomeBeforePA = taxableGrossGBP + propGBP;
      let paWithProperty = config.personalAllowance!;
      if (totalIncomeBeforePA > config.personalAllowanceTaperStart!) {
        const reduction = Math.floor((totalIncomeBeforePA - config.personalAllowanceTaperStart!) / 2);
        paWithProperty = Math.max(0, paWithProperty - reduction);
      }
      const totalTaxableWithProperty = Math.max(0, totalIncomeBeforePA - paWithProperty);
      const { tax: totalTaxWithProperty, breakdown: totalBreakdown } = calcProgressiveTax(totalTaxableWithProperty, config.bands);
      breakdown = totalBreakdown;
      foreignTax = Math.max(0, totalTaxWithProperty - incomeTax);
      steps.push({ label: 'Foreign property income tax (est.)', amount: foreignTax, detail: 'Tax at marginal rate based on total income', section: 'property' });
    }
    foreignIncluded = true;
    warnings.push('Foreign property income tax is a simplified estimate. Actual liability depends on total income and available reliefs.');
  }

  const totalDeductions = pensionGBP + incomeTax + ni + foreignTax;
  const netAnnual = grossGBP - totalDeductions;

  steps.push({ label: 'Total deductions', amount: totalDeductions, section: 'net' });
  steps.push({ label: 'Net annual (GBP)', amount: netAnnual, section: 'net' });

  // Tax by country: UK (always) + property country when Portugal/Greece/Italy
  const taxByCountry: Array<{ country: string; tax: number; socialSecurity: number; currency: Currency }> = [
    { country: 'UK', tax: incomeTax + foreignTax, socialSecurity: ni, currency: 'GBP' },
  ];
  const propCountryTax = computePropertyCountryTax(inputs);
  if (propCountryTax) taxByCountry.push({ country: propCountryTax.country, tax: propCountryTax.amount, socialSecurity: 0, currency: propCountryTax.currency });

  return {
    regime: 'UK Tax Resident',
    regimeKey: 'uk',
    grossIncome: grossGBP,
    pensionContribution: pensionGBP,
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
    foreignPropertyNetAnnual: foreignPropertyNetAnnual,
    foreignPropertyNetCashFlow,
    ukPropertyTax,
    taxByCountry,
    warnings,
  };
}

// Spain Normal Calculation
export function calculateSpainNormal(inputs: TaxInputs, taxYear: string): TaxResult {
  const config = spainNormalConfig[taxYear];
  const grossEUR = convert(inputs.grossSalary, inputs.salaryCurrency, 'EUR', inputs.exchangeRate);
  const pensionPct = inputs.pensionContributionPercent ?? 0;
  const pensionEUR = grossEUR * (pensionPct / 100);
  const taxableGrossEUR = grossEUR - pensionEUR;

  const steps: CalculationStep[] = [];
  const warnings: string[] = [];
  if ((inputs.pensionContributionPercent ?? 0) > 0) {
    warnings.push('UK workplace pension contributions may qualify for Spanish IRPF relief when your scheme meets EU Directive 2016/2341 (European Employment Pension Fund) criteria. Many UK occupational schemes qualify. Confirm with a tax advisor.');
  }

  steps.push({ label: 'Gross salary (EUR)', amount: grossEUR, section: 'employment', order: 1 });
  if (pensionEUR > 0) {
    steps.push({ label: 'Pension (salary sacrifice)', amount: -pensionEUR, detail: `${pensionPct}% of gross`, section: 'employment', order: 2 });
    steps.push({ label: 'Taxable gross (EUR)', amount: taxableGrossEUR, section: 'employment', order: 3 });
  }

  // Social security (on post-sacrifice pay)
  const ssBase = Math.min(taxableGrossEUR, config.socialSecurityCap!);
  const ss = ssBase * config.socialSecurityRate!;
  const generalDeduction = config.generalDeduction!;
  const afterSS = taxableGrossEUR - ss;
  const reducedBase = Math.max(0, afterSS - generalDeduction);

  steps.push({ label: 'Employee social security', amount: ss, detail: `${(config.socialSecurityRate! * 100).toFixed(2)}% on base up to €${fmt(config.socialSecurityCap!)}`, section: 'employment', order: 4 });
  steps.push({ label: 'General deduction (€2,000)', amount: -generalDeduction, section: 'employment', order: 5 });
  steps.push({ label: 'Taxable base', amount: reducedBase, detail: 'Base for IRPF calculation', section: 'employment', order: 6 });

  // IRPF on reduced base minus personal minimum
  const personalMin = config.personalMinimum!;
  let taxableIncome = Math.max(0, reducedBase);
  let { tax: grossTax, breakdown } = calcProgressiveTax(taxableIncome, config.bands);
  let { tax: minTax } = calcProgressiveTax(personalMin, config.bands);
  const incomeTaxEmployment = Math.max(0, grossTax - minTax);
  let incomeTax = incomeTaxEmployment;

  // Property: include when (foreign-source OR domestic Spain property) — Spain scenario assumes Spain resident
  const includeProperty = inputs.foreignPropertyEnabled &&
    (inputs.treatAsForeignSource || inputs.foreignPropertyCountry === 'Spain');
  let foreignTax = 0;
  let foreignIncluded = false;
  let foreignPropertyNetAnnual: number | undefined;
  let foreignPropertyNetCashFlow: number | undefined;
  let ukPropertyTax: number | undefined;

  if (includeProperty) {
    // Spain: mortgage interest 100% deductible on rental (Agencia Tributaria); deductions capped at gross income
    const { netAnnual: propNet, netCashFlowAnnual, currency } = computePropertyNetForSpain(inputs);
    const propEUR = convert(propNet, currency, 'EUR', inputs.exchangeRate);
    const cashFlowEUR = convert(netCashFlowAnnual, currency, 'EUR', inputs.exchangeRate);
    foreignPropertyNetAnnual = propEUR;
    foreignPropertyNetCashFlow = cashFlowEUR;

    // Add property to general base; tax at marginal rate (rental = capital inmobiliario → general base)
    const combinedBase = reducedBase + propEUR;
    const { tax: totalGrossTax, breakdown: totalBreakdown } = calcProgressiveTax(combinedBase, config.bands);
    breakdown = totalBreakdown;
    const { tax: minTaxCombined } = calcProgressiveTax(personalMin, config.bands);
    incomeTax = Math.max(0, totalGrossTax - minTaxCombined);
    foreignTax = Math.max(0, incomeTax - incomeTaxEmployment);
    taxableIncome = combinedBase;
    foreignIncluded = true;

    steps.push({ label: 'Property income (to general base)', amount: propEUR, section: 'property', order: 1 });
    steps.push({ label: 'Combined taxable base', amount: combinedBase, section: 'property', order: 2 });
    steps.push({ label: 'IRPF (gross)', amount: totalGrossTax, section: 'property', order: 3 });
    steps.push({ label: 'Personal allowance (credit)', amount: -minTaxCombined, detail: `Tax relief on €${fmt(personalMin)} (mínimo personal)`, section: 'property', order: 4 });
    steps.push({ label: 'Net IRPF', amount: incomeTax, section: 'property', order: 5 });
    steps.push({ label: 'Property tax (marginal rate)', amount: foreignTax, detail: 'Property taxed at general progressive rates (Spain: mortgage interest deductible)', section: 'property', order: 6 });
  } else {
    steps.push({ label: 'IRPF (gross)', amount: grossTax, section: 'employment', order: 7 });
    steps.push({ label: 'Personal allowance (credit)', amount: -minTax, detail: `Tax relief on €${fmt(personalMin)} (mínimo personal)`, section: 'employment', order: 8 });
    steps.push({ label: 'Net IRPF', amount: incomeTax, section: 'employment', order: 9 });
  }

  // UK tax on UK property + DTA credit (when Spain resident with UK property)
  let dtaCredit: number | undefined;
  if (inputs.foreignPropertyEnabled && inputs.foreignPropertyCountry === 'UK') {
    const ukYear = UK_YEAR_FROM_SPAIN[taxYear] ?? '2025/26';
    ukPropertyTax = computeUKPropertyTaxForNonResident(inputs, ukYear);
    if (ukPropertyTax > 0) {
      steps.push({ label: 'UK property tax (paid to HMRC)', amount: ukPropertyTax, detail: 'UK taxes UK rental; PA & S24 applied', section: 'property', order: 7 });
      // DTA credit: Spain allows credit for UK tax, capped at Spanish tax on that income
      const ukTaxEUR = convert(ukPropertyTax, 'GBP', 'EUR', inputs.exchangeRate);
      dtaCredit = Math.min(ukTaxEUR, foreignTax);
      if (dtaCredit > 0) {
        steps.push({ label: 'DTA credit (UK-Spain)', amount: -dtaCredit, detail: 'Credit for UK tax; reduces Spanish IRPF', section: 'property', order: 8 });
      }
    }
  }

  const spanishTaxAfterDta = incomeTax - (dtaCredit ?? 0);
  const totalDeductions = pensionEUR + spanishTaxAfterDta + ss;
  const netAnnual = grossEUR - totalDeductions;

  steps.push({ label: 'Total deductions', amount: totalDeductions, section: 'net', order: 10 });
  steps.push({ label: 'Net annual (EUR)', amount: netAnnual, section: 'net', order: 11 });

  const taxByCountry: Array<{ country: string; tax: number; socialSecurity: number; currency: Currency }> = [
    { country: 'Spain', tax: spanishTaxAfterDta, socialSecurity: ss, currency: 'EUR' },
  ];
  if ((ukPropertyTax ?? 0) > 0) taxByCountry.push({ country: 'UK', tax: ukPropertyTax!, socialSecurity: 0, currency: 'GBP' });
  const propCountryTax = computePropertyCountryTax(inputs);
  if (propCountryTax) taxByCountry.push({ country: propCountryTax.country, tax: propCountryTax.amount, socialSecurity: 0, currency: propCountryTax.currency });

  return {
    regime: 'Spanish Tax Resident - IRPF',
    regimeKey: 'spainNormal',
    pensionContribution: pensionEUR,
    foreignPropertyNetAnnual,
    foreignPropertyNetCashFlow,
    ukPropertyTax,
    dtaCredit,
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
    taxByCountry,
    warnings,
  };
}

// Spain Beckham Calculation
export function calculateSpainBeckham(inputs: TaxInputs, taxYear: string): TaxResult {
  const config = spainBeckhamConfig[taxYear];
  const normalConfig = spainNormalConfig[taxYear];
  const grossEUR = convert(inputs.grossSalary, inputs.salaryCurrency, 'EUR', inputs.exchangeRate);
  const pensionPct = inputs.pensionContributionPercent ?? 0;
  const pensionEUR = grossEUR * (pensionPct / 100);
  const taxableGrossEUR = grossEUR - pensionEUR;

  const steps: CalculationStep[] = [];
  const warnings: string[] = [];
  if ((inputs.pensionContributionPercent ?? 0) > 0) {
    warnings.push('UK workplace pension contributions may qualify for Spanish relief when your scheme meets EU Directive 2016/2341 (EPF) criteria. Many UK occupational schemes qualify. Confirm with a tax advisor.');
  }
  const breakdown: BandBreakdown[] = [];

  steps.push({ label: 'Gross salary (EUR)', amount: grossEUR, section: 'employment' });
  if (pensionEUR > 0) {
    steps.push({ label: 'Pension (salary sacrifice)', amount: -pensionEUR, detail: `${pensionPct}% of gross`, section: 'employment' });
    steps.push({ label: 'Taxable gross (EUR)', amount: taxableGrossEUR, section: 'employment' });
  }

  // Social security (on post-sacrifice pay)
  const ssBase = Math.min(taxableGrossEUR, normalConfig.socialSecurityCap!);
  const ss = ssBase * normalConfig.socialSecurityRate!;
  steps.push({ label: 'Employee social security', amount: ss, section: 'employment' });

  // Beckham flat rate
  const threshold = config.beckhamThreshold!;
  let incomeTax = 0;
  if (taxableGrossEUR <= threshold) {
    incomeTax = taxableGrossEUR * config.beckhamFlatRate!;
    breakdown.push({ band: `0 – ${fmt(threshold)}`, taxableInBand: taxableGrossEUR, rate: config.beckhamFlatRate!, tax: incomeTax });
  } else {
    const lowerTax = threshold * config.beckhamFlatRate!;
    const upperTax = (taxableGrossEUR - threshold) * config.beckhamUpperRate!;
    incomeTax = lowerTax + upperTax;
    breakdown.push({ band: `0 – ${fmt(threshold)}`, taxableInBand: threshold, rate: config.beckhamFlatRate!, tax: lowerTax });
    breakdown.push({ band: `${fmt(threshold)}+`, taxableInBand: taxableGrossEUR - threshold, rate: config.beckhamUpperRate!, tax: upperTax });
  }
  steps.push({ label: 'Beckham Law income tax', amount: incomeTax, detail: `Flat ${(config.beckhamFlatRate! * 100)}% up to €${fmt(threshold)}`, section: 'employment' });

  // Foreign property income — generally NOT included under Beckham when foreign-source.
  // UK property is always foreign-source and exempt regardless of treatAsForeignSource.
  let foreignTax = 0;
  let foreignIncluded = false;
  let foreignPropertyNetAnnual: number | undefined;
  let foreignPropertyNetCashFlow: number | undefined;
  let ukPropertyTax: number | undefined;
  if (inputs.foreignPropertyEnabled) {
    const isForeignSourceProperty = inputs.treatAsForeignSource || inputs.foreignPropertyCountry === 'UK';
    if (isForeignSourceProperty) {
      if (inputs.foreignPropertyCountry === 'UK') {
        warnings.push('Under Beckham Law, UK property income is always foreign-source and exempt from Spanish tax.');
      } else {
        warnings.push('Under Beckham Law, foreign-source income is generally exempt from Spanish tax. Foreign property income is excluded from this calculation.');
      }
      const { netAnnual: propNet, netCashFlowAnnual, currency } = computeForeignPropertyNetAnnual(inputs);
      foreignPropertyNetAnnual = convert(propNet, currency, 'EUR', inputs.exchangeRate);
      foreignPropertyNetCashFlow = convert(netCashFlowAnnual, currency, 'EUR', inputs.exchangeRate);
      // 15% foreign income cap: high foreign income can affect Beckham eligibility
      const propertyGrossAnnual = (inputs.foreignPropertyRentalIncome ?? 0) * 12;
      const propertyGrossEUR = convert(propertyGrossAnnual, inputs.foreignPropertyCurrency, 'EUR', inputs.exchangeRate);
      const totalIncome = grossEUR + propertyGrossEUR;
      if (totalIncome > 0 && propertyGrossEUR / totalIncome > 0.15) {
        warnings.push('Foreign income exceeds 15% of total income — this may affect Beckham Law eligibility. Consult a tax advisor.');
      }
    } else {
      // Spain: mortgage interest 100% deductible on rental (July 2025 ruling)
      const { netAnnual: propNet, netCashFlowAnnual, currency } = computePropertyNetForSpain(inputs);
      const propEUR = convert(propNet, currency, 'EUR', inputs.exchangeRate);
      const cashFlowEUR = convert(netCashFlowAnnual, currency, 'EUR', inputs.exchangeRate);
      foreignTax = propEUR * config.beckhamFlatRate!;
      foreignPropertyNetAnnual = propEUR;
      foreignPropertyNetCashFlow = cashFlowEUR;
      foreignIncluded = true;
      steps.push({ label: 'Property income tax (treated as Spanish-source)', amount: foreignTax, detail: 'Spain: mortgage interest deductible', section: 'property' });
    }
  }

  // UK tax on UK property (when Spain resident with UK property)
  if (inputs.foreignPropertyEnabled && inputs.foreignPropertyCountry === 'UK') {
    const ukYear = UK_YEAR_FROM_SPAIN[taxYear] ?? '2025/26';
    ukPropertyTax = computeUKPropertyTaxForNonResident(inputs, ukYear);
    if (ukPropertyTax > 0) {
      steps.push({ label: 'UK property tax (paid to HMRC)', amount: ukPropertyTax, detail: 'UK taxes UK rental; PA & S24 applied', section: 'property' });
    }
  }

  const totalDeductions = pensionEUR + incomeTax + ss + foreignTax;
  const netAnnual = grossEUR - totalDeductions;

  steps.push({ label: 'Total deductions', amount: totalDeductions, section: 'net' });
  steps.push({ label: 'Net annual (EUR)', amount: netAnnual, section: 'net' });

  const taxByCountry: Array<{ country: string; tax: number; socialSecurity: number; currency: Currency }> = [
    { country: 'Spain', tax: incomeTax + foreignTax, socialSecurity: ss, currency: 'EUR' },
  ];
  if ((ukPropertyTax ?? 0) > 0) taxByCountry.push({ country: 'UK', tax: ukPropertyTax!, socialSecurity: 0, currency: 'GBP' });
  const propCountryTax = computePropertyCountryTax(inputs);
  if (propCountryTax) taxByCountry.push({ country: propCountryTax.country, tax: propCountryTax.amount, socialSecurity: 0, currency: propCountryTax.currency });

  return {
    regime: 'Spanish Tax Resident - Beckham',
    regimeKey: 'spainBeckham',
    grossIncome: grossEUR,
    pensionContribution: pensionEUR,
    grossCurrency: 'EUR',
    taxableIncome: taxableGrossEUR,
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
    foreignPropertyNetAnnual,
    foreignPropertyNetCashFlow,
    ukPropertyTax,
    taxByCountry,
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
      regime: 'Spanish Tax Resident - Autónomo',
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

  steps.push({ label: 'Gross freelance revenue (EUR)', amount: grossEUR, section: 'employment' });

  // Expense deduction
  const expenseDeduction = grossEUR * (inputs.expenseDeductionRate / 100);
  const netProfitBeforePension = grossEUR - expenseDeduction;

  // Pension sacrifice (reduces taxable base for IRPF)
  const pensionPct = inputs.freelancePensionContributionPercent ?? 0;
  const pensionEUR = grossEUR * (pensionPct / 100);
  const netProfit = Math.max(0, netProfitBeforePension - pensionEUR);

  steps.push({ label: `Flat expense deduction (${inputs.expenseDeductionRate}%)`, amount: expenseDeduction, section: 'employment' });
  if (pensionEUR > 0) {
    steps.push({ label: 'Net profit (before pension)', amount: netProfitBeforePension, section: 'employment' });
    steps.push({ label: 'Pension (sacrifice)', amount: -pensionEUR, detail: `${pensionPct}% of gross`, section: 'employment' });
  }
  steps.push({ label: 'Net taxable profit', amount: netProfit, section: 'employment' });

  // Cuota de autónomo — Year 1 (tarifa plana), Year 2 (extended if below SMI), Year 3+ (full tramos)
  const monthlyProfit = netProfit / 12;
  const autonomoYear = inputs.autonomoYear ?? 3;
  const smiMonthly = SMI_MONTHLY[taxYear] ?? 1184;
  let cuotaMonthly = 200; // default minimum
  if (autonomoYear === 1) {
    cuotaMonthly = 80; // Tarifa plana first 12 months
  } else if (autonomoYear === 2 && monthlyProfit < smiMonthly) {
    cuotaMonthly = 80; // Year 2: €80 if net below SMI
  } else if (config.autonomoTramos) {
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
  const cuotaDetail = autonomoYear === 1
    ? 'Tarifa plana (Year 1)'
    : autonomoYear === 2 && monthlyProfit < smiMonthly
      ? 'Year 2 extended (net below SMI €' + fmt(smiMonthly) + '/mo)'
      : `Based on monthly net profit of €${fmt(Math.round(monthlyProfit))}`;
  steps.push({ label: 'Cuota de autónomo (monthly)', amount: cuotaMonthly, detail: cuotaDetail, section: 'employment' });
  steps.push({ label: 'Cuota de autónomo (annual)', amount: cuotaAnnual, section: 'employment' });

  // IRPF on net profit minus general deduction
  const generalDeduction = config.generalDeduction!;
  const reducedBase = Math.max(0, netProfit - generalDeduction - cuotaAnnual);
  steps.push({ label: 'Taxable base (after deductions & cuota)', amount: reducedBase, section: 'employment' });

  const personalMin = config.personalMinimum!;
  let taxableBase = reducedBase;
  let { tax: grossTax, breakdown } = calcProgressiveTax(taxableBase, config.bands);
  let { tax: minTax } = calcProgressiveTax(personalMin, config.bands);
  const incomeTaxEmployment = Math.max(0, grossTax - minTax);
  let incomeTax = incomeTaxEmployment;

  // Property: include when (foreign-source OR domestic Spain property) — Spain scenario assumes Spain resident
  const includeProperty = inputs.foreignPropertyEnabled &&
    (inputs.treatAsForeignSource || inputs.foreignPropertyCountry === 'Spain');
  let foreignTax = 0;
  let foreignIncluded = false;
  let foreignPropertyNetAnnual: number | undefined;
  let foreignPropertyNetCashFlow: number | undefined;
  let ukPropertyTax: number | undefined;

  if (includeProperty) {
    // Spain: mortgage interest 100% deductible on rental
    const { netAnnual: propNet, netCashFlowAnnual, currency } = computePropertyNetForSpain(inputs);
    const propEUR = convert(propNet, currency, 'EUR', inputs.exchangeRate);
    const cashFlowEUR = convert(netCashFlowAnnual, currency, 'EUR', inputs.exchangeRate);
    foreignPropertyNetAnnual = propEUR;
    foreignPropertyNetCashFlow = cashFlowEUR;
    const combinedBase = taxableBase + propEUR;
    const { tax: totalGrossTax, breakdown: totalBreakdown } = calcProgressiveTax(combinedBase, config.bands);
    breakdown = totalBreakdown;
    const { tax: minTaxCombined } = calcProgressiveTax(personalMin, config.bands);
    incomeTax = Math.max(0, totalGrossTax - minTaxCombined);
    foreignTax = Math.max(0, incomeTax - incomeTaxEmployment);
    taxableBase = combinedBase;
    foreignIncluded = true;
    steps.push({ label: 'Property income (to general base)', amount: propEUR, section: 'property' });
    steps.push({ label: 'Combined taxable base', amount: combinedBase, section: 'property' });
    steps.push({ label: 'IRPF (gross)', amount: totalGrossTax, section: 'property' });
    steps.push({ label: 'Personal allowance (credit)', amount: -minTaxCombined, detail: `Tax relief on €${fmt(personalMin)} (mínimo personal)`, section: 'property' });
    steps.push({ label: 'Net IRPF', amount: incomeTax, section: 'property' });
    steps.push({ label: 'Property tax (marginal rate)', amount: foreignTax, detail: 'Spain: mortgage interest deductible', section: 'property' });
  } else {
    steps.push({ label: 'IRPF (gross)', amount: grossTax, section: 'employment' });
    steps.push({ label: 'Personal allowance (credit)', amount: -minTax, detail: `Tax relief on €${fmt(personalMin)} (mínimo personal)`, section: 'employment' });
    steps.push({ label: 'Net IRPF', amount: incomeTax, section: 'employment' });
  }

  // UK tax on UK property (when Spain resident with UK property)
  if (inputs.foreignPropertyEnabled && inputs.foreignPropertyCountry === 'UK') {
    const ukYear = UK_YEAR_FROM_SPAIN[taxYear] ?? '2025/26';
    ukPropertyTax = computeUKPropertyTaxForNonResident(inputs, ukYear);
    if (ukPropertyTax > 0) {
      steps.push({ label: 'UK property tax (paid to HMRC)', amount: ukPropertyTax, detail: 'UK taxes UK rental; PA & S24 applied', section: 'property' });
    }
  }

  const totalDeductions = pensionEUR + incomeTax + cuotaAnnual + foreignTax;
  const netAnnual = grossEUR - totalDeductions;

  steps.push({ label: 'Total deductions (pension + tax + cuota)', amount: totalDeductions, section: 'net' });
  steps.push({ label: 'Net annual (EUR)', amount: netAnnual, section: 'net' });

  const taxByCountry: Array<{ country: string; tax: number; socialSecurity: number; currency: Currency }> = [
    { country: 'Spain', tax: incomeTax + foreignTax, socialSecurity: cuotaAnnual, currency: 'EUR' },
  ];
  if ((ukPropertyTax ?? 0) > 0) taxByCountry.push({ country: 'UK', tax: ukPropertyTax!, socialSecurity: 0, currency: 'GBP' });
  const propCountryTax = computePropertyCountryTax(inputs);
  if (propCountryTax) taxByCountry.push({ country: propCountryTax.country, tax: propCountryTax.amount, socialSecurity: 0, currency: propCountryTax.currency });

  return {
    regime: 'Spanish Tax Resident - Autónomo',
    regimeKey: 'spainAutonomo',
    grossIncome: grossEUR,
    grossCurrency: 'EUR',
    expenseDeduction,
    pensionContribution: pensionEUR > 0 ? pensionEUR : undefined,
    taxableIncome: taxableBase,
    incomeTax,
    socialContributions: cuotaAnnual,
    totalDeductions,
    netAnnual,
    netMonthly: netAnnual / 12,
    effectiveRate: grossEUR > 0 ? (totalDeductions / grossEUR) * 100 : 0,
    takeHomePercent: grossEUR > 0 ? (netAnnual / grossEUR) * 100 : 0,
    steps,
    bandBreakdown: breakdown,
    foreignIncomeIncluded: foreignIncluded,
    foreignIncomeTax: foreignTax,
    foreignPropertyNetAnnual,
    foreignPropertyNetCashFlow,
    ukPropertyTax,
    taxByCountry,
    warnings,
    netTaxableProfit: netProfit,
    cuotaAutonomoMonthly: cuotaMonthly,
    cuotaAutonomoAnnual: cuotaAnnual,
  };
}
