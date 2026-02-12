export type Currency = 'GBP' | 'EUR';

export interface TaxInputs {
  baseCurrency: Currency;
  exchangeRate: number; // 1 GBP = X EUR
  grossSalary: number;
  salaryCurrency: Currency;
  pensionContributionPercent: number; // salary sacrifice % of gross
  freelanceRevenue: number;
  freelanceCurrency: Currency;
  expenseDeductionRate: number; // percentage, e.g. 7
  includeUkNi: boolean;
  includeSpainNormal: boolean;
  includeSpainBeckham: boolean;
  includeSpainAutonomo: boolean;
  // Foreign property (all monthly figures)
  foreignPropertyRentalIncome: number;
  foreignPropertyDeductibles: number;
  foreignPropertyMortgageInterest: number;
  foreignPropertyMortgagePayment: number; // total monthly payment (principal + interest)
  foreignPropertyMortgageInterestDeductiblePercent: number;
  foreignPropertyCurrency: Currency;
  foreignPropertyCountry: string;
  foreignPropertyEnabled: boolean;
  treatAsForeignSource: boolean;
  autonomoYear: 1 | 2 | 3; // 1 = Year 1 (tarifa plana), 2 = Year 2, 3 = Year 3+
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

export type CalculationStepSection = 'employment' | 'property' | 'net';

export interface CalculationStep {
  label: string;
  amount: number;
  detail?: string;
  section?: CalculationStepSection;
  order?: number;
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
  foreignPropertyNetAnnual?: number; // net taxable property income (annual, in result currency)
  foreignPropertyNetCashFlow?: number; // net cash flow: rental - deductibles - mortgage payment (annual)
  ukPropertyTax?: number; // UK tax on UK property when Spain resident (annual, GBP)
  dtaCredit?: number; // Spain DTA credit for UK tax paid (annual, EUR) – reduces Spanish IRPF
  /** Tax paid per country for display in Tax by country section */
  taxByCountry?: Array<{ country: string; amount: number; currency: Currency }>;
  warnings: string[];
  pensionContribution?: number; // annual salary sacrifice amount
  // Autónomo specific
  cuotaAutonomoMonthly?: number;
  cuotaAutonomoAnnual?: number;
  netTaxableProfit?: number;
}

// Tax Documents: month-by-month breakdown and form summaries
export interface MonthlyBreakdown {
  month: number;
  monthLabel: string;
  grossIncome: number;
  deductions: number;
  incomeTax: number;
  socialContributions: number;
  netIncome: number;
  modelo130Installment?: number;
}

export interface TaxDocumentsData {
  regimeKey: 'uk' | 'spainNormal' | 'spainBeckham' | 'spainAutonomo';
  currency: Currency;
  taxYearLabel: string;
  monthlyBreakdown: MonthlyBreakdown[];
  sa100?: { totalIncome: number; taxableIncome: number; incomeTax: number; ni: number };
  sa105?: { rentalIncome: number; allowableExpenses: number; netProfit: number; mortgageInterest: number; s24Credit: number; taxDue: number };
  paymentsOnAccount?: { balancingPayment: number; firstPOA: number; secondPOA: number };
  /** UK MTD quarterly updates (tax year 2026/27+) */
  mtdQuarterlyUpdates?: Array<{ quarter: number; periodLabel: string; deadline: string }>;
  modelo130?: Array<{ quarter: number; netProfit: number; rate: number; amountDue: number; deadline: string }>;
  modelo100?: { totalIncome: number; totalDeductions: number; taxDue: number; modelo130Prepayments: number };
  modelo151?: { spanishIncome: number; tax24: number; socialSecurity: number };
  /** UK property forms required when Spain resident with UK rental (HMRC still taxes UK property) */
  ukPropertyForms?: {
    rentalIncome: number;
    allowableExpenses: number;
    netProfit: number;
    mortgageInterest: number;
    s24Credit: number;
    ukTaxDue: number;
    ukTaxYearLabel: string;
    /** Step-by-step breakdown of the UK property tax calculation */
    calculationBreakdown: {
      personalAllowance: number;
      taxableAfterPA: number;
      taxBeforeS24: number;
      s24Credit: number;
      netTaxDue: number;
      explanation: string;
    };
  };
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
