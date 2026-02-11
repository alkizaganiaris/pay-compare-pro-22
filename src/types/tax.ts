export type Currency = 'GBP' | 'EUR';

export interface TaxInputs {
  baseCurrency: Currency;
  exchangeRate: number; // 1 GBP = X EUR
  grossSalary: number;
  salaryCurrency: Currency;
  freelanceRevenue: number;
  freelanceCurrency: Currency;
  expenseDeductionRate: number; // percentage, e.g. 7
  includeUkNi: boolean;
  includeSpainNormal: boolean;
  includeSpainBeckham: boolean;
  includeSpainAutonomo: boolean;
  foreignPropertyIncome: number;
  foreignPropertyCurrency: Currency;
  foreignPropertyCountry: string;
  foreignPropertyEnabled: boolean;
  treatAsForeignSource: boolean;
  expensesAlreadyNetted: boolean;
  ukResident: boolean;
  spainResident: boolean;
  beckhamEligible: boolean;
}

export interface TaxBand {
  from: number;
  to: number | null;
  rate: number;
}

export interface BandBreakdown {
  band: string;
  taxableInBand: number;
  rate: number;
  tax: number;
}

export interface CalculationStep {
  label: string;
  amount: number;
  detail?: string;
}

export interface TaxResult {
  regime: string;
  regimeKey: 'uk' | 'spainNormal' | 'spainBeckham' | 'spainAutonomo';
  grossIncome: number;
  grossCurrency: Currency;
  expenseDeduction?: number;
  taxableIncome: number;
  incomeTax: number;
  socialContributions: number;
  totalDeductions: number;
  netAnnual: number;
  netMonthly: number;
  effectiveRate: number;
  takeHomePercent: number;
  steps: CalculationStep[];
  bandBreakdown: BandBreakdown[];
  foreignIncomeIncluded: boolean;
  foreignIncomeTax: number;
  warnings: string[];
  // Autónomo specific
  cuotaAutonomoMonthly?: number;
  cuotaAutonomoAnnual?: number;
  netTaxableProfit?: number;
}

export interface AutonomoTramo {
  minMonthly: number;
  maxMonthly: number | null;
  cuota: number;
}

export interface TaxYearConfig {
  year: string;
  bands: TaxBand[];
  personalAllowance?: number;
  personalAllowanceTaperStart?: number;
  niThresholds?: { primary: number; upper: number; primaryRate: number; upperRate: number };
  socialSecurityRate?: number;
  socialSecurityCap?: number;
  generalDeduction?: number;
  personalMinimum?: number;
  beckhamFlatRate?: number;
  beckhamThreshold?: number;
  beckhamUpperRate?: number;
  autonomoTramos?: AutonomoTramo[];
}
