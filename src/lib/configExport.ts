import type { TaxInputs } from '@/types/tax';

const MAGIC_HEADER = 'PAYCOMPARE_CONFIG_v1';

export interface SavedConfig {
  inputs: TaxInputs;
  taxYear: string;
}

export function serializeConfig(config: SavedConfig): string {
  return `${MAGIC_HEADER}\n${JSON.stringify(config, null, 2)}`;
}

export function deserializeConfig(content: string): SavedConfig {
  const lines = content.trim().split('\n');
  const header = lines[0];
  const json = lines.slice(1).join('\n');

  if (header !== MAGIC_HEADER) {
    throw new Error('Invalid config file format. This does not appear to be a Pay Compare config.');
  }

  const parsed = JSON.parse(json) as SavedConfig;

  if (!parsed.inputs || !parsed.taxYear) {
    throw new Error('Invalid config data: missing inputs or tax year.');
  }

  return parsed;
}

export function downloadConfig(content: string, filename = 'pay-compare-config.txt'): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const INPUT_DEFAULTS: TaxInputs = {
  baseCurrency: 'EUR',
  exchangeRate: 1.15,
  grossSalary: 0,
  salaryCurrency: 'GBP',
  pensionContributionPercent: 0,
  freelanceRevenue: 0,
  freelanceCurrency: 'GBP',
  expenseDeductionRate: 0,
  freelancePensionContributionPercent: 0,
  includeUkNi: true,
  includeSpainNormal: true,
  includeSpainBeckham: true,
  includeSpainAutonomo: true,
  foreignPropertyRentalIncome: 0,
  foreignPropertyDeductibles: 0,
  foreignPropertyMortgageInterest: 0,
  foreignPropertyMortgagePayment: 0,
  foreignPropertyMortgageInterestDeductiblePercent: 100,
  foreignPropertyCurrency: 'GBP',
  foreignPropertyCountry: 'UK',
  foreignPropertyEnabled: false,
  treatAsForeignSource: true,
  autonomoYear: 3,
};

export function parseTaxInputs(data: unknown): TaxInputs | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const merged = { ...INPUT_DEFAULTS };
  for (const key of Object.keys(INPUT_DEFAULTS) as (keyof TaxInputs)[]) {
    if (key in obj && obj[key] !== undefined) {
      const val = obj[key];
      if (key === 'autonomoYear') {
        merged[key] = (val === 1 || val === 2 || val === 3) ? val : 3;
      } else if (key === 'baseCurrency' || key === 'salaryCurrency' || key === 'freelanceCurrency' || key === 'foreignPropertyCurrency') {
        merged[key] = (val === 'GBP' || val === 'EUR') ? val : 'GBP';
      } else if (typeof INPUT_DEFAULTS[key] === 'number') {
        merged[key] = typeof val === 'number' && !Number.isNaN(val) ? val : (INPUT_DEFAULTS[key] as number);
      } else if (typeof INPUT_DEFAULTS[key] === 'boolean') {
        merged[key] = Boolean(val);
      } else if (typeof INPUT_DEFAULTS[key] === 'string') {
        merged[key] = typeof val === 'string' ? val : (INPUT_DEFAULTS[key] as string);
      }
    }
  }
  return merged;
}
