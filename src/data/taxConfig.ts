import { TaxYearConfig } from '@/types/tax';

export const ukTaxConfig: Record<string, TaxYearConfig> = {
  '2024/25': {
    year: '2024/25',
    personalAllowance: 12570,
    personalAllowanceTaperStart: 100000,
    bands: [
      { from: 0, to: 37700, rate: 0.20 },
      { from: 37700, to: 125140, rate: 0.40 },
      { from: 125140, to: null, rate: 0.45 },
    ],
    niThresholds: {
      primary: 12570,
      upper: 50270,
      primaryRate: 0.08,
      upperRate: 0.02,
    },
  },
};

export const spainNormalConfig: Record<string, TaxYearConfig> = {
  '2024': {
    year: '2024',
    personalMinimum: 5550,
    generalDeduction: 2000,
    bands: [
      { from: 0, to: 12450, rate: 0.19 },
      { from: 12450, to: 20200, rate: 0.24 },
      { from: 20200, to: 35200, rate: 0.30 },
      { from: 35200, to: 60000, rate: 0.37 },
      { from: 60000, to: 300000, rate: 0.45 },
      { from: 300000, to: null, rate: 0.47 },
    ],
    socialSecurityRate: 0.0635,
    socialSecurityCap: 56646,
  },
};

export const spainBeckhamConfig: Record<string, TaxYearConfig> = {
  '2024': {
    year: '2024',
    beckhamFlatRate: 0.24,
    beckhamThreshold: 600000,
    beckhamUpperRate: 0.47,
    bands: [],
  },
};

export const spainAutonomoConfig: Record<string, TaxYearConfig> = {
  '2025': {
    year: '2025',
    personalMinimum: 5550,
    generalDeduction: 2000,
    bands: [
      { from: 0, to: 12450, rate: 0.19 },
      { from: 12450, to: 20200, rate: 0.24 },
      { from: 20200, to: 35200, rate: 0.30 },
      { from: 35200, to: 60000, rate: 0.37 },
      { from: 60000, to: 300000, rate: 0.45 },
      { from: 300000, to: null, rate: 0.47 },
    ],
    autonomoTramos: [
      { minMonthly: 0, maxMonthly: 670, cuota: 200 },
      { minMonthly: 670, maxMonthly: 900, cuota: 220 },
      { minMonthly: 900, maxMonthly: 1166.70, cuota: 260 },
      { minMonthly: 1166.70, maxMonthly: 1300, cuota: 291 },
      { minMonthly: 1300, maxMonthly: 1500, cuota: 294 },
      { minMonthly: 1500, maxMonthly: 1700, cuota: 294 },
      { minMonthly: 1700, maxMonthly: 1850, cuota: 310 },
      { minMonthly: 1850, maxMonthly: 2030, cuota: 315 },
      { minMonthly: 2030, maxMonthly: 2330, cuota: 320 },
      { minMonthly: 2330, maxMonthly: 2760, cuota: 330 },
      { minMonthly: 2760, maxMonthly: 3190, cuota: 350 },
      { minMonthly: 3190, maxMonthly: 3620, cuota: 370 },
      { minMonthly: 3620, maxMonthly: 4050, cuota: 390 },
      { minMonthly: 4050, maxMonthly: 6000, cuota: 400 },
      { minMonthly: 6000, maxMonthly: null, cuota: 590 },
    ],
  },
};

export const defaultTaxYears = {
  uk: '2024/25',
  spainNormal: '2024',
  spainBeckham: '2024',
  spainAutonomo: '2025',
};

export const propertyCountries = [
  'Portugal', 'Spain', 'France', 'Italy', 'Germany', 'Greece',
  'Ireland', 'Netherlands', 'Belgium', 'USA', 'Other',
];
