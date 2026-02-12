import { useState, useMemo } from 'react';
import type { TaxResult, TaxInputs } from '@/types/tax';
import { availableTaxYears } from '@/data/taxConfig';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getTaxDocumentsData } from '@/lib/taxDocuments';
import MonthByMonthTable from './MonthByMonthTable';
import UKFormSummary from './UKFormSummary';
import SpainAutonomoFormSummary from './SpainAutonomoFormSummary';
import SpainBeckhamFormSummary from './SpainBeckhamFormSummary';
import UKPropertyFormsCard from './UKPropertyFormsCard';

type SpainRegime = 'spainNormal' | 'spainBeckham' | 'spainAutonomo';

interface TaxDocumentsPanelProps {
  results: TaxResult[];
  inputs: TaxInputs;
  taxYear: string;
  onTaxYearChange: (year: string) => void;
  ukTaxYearLabel: string;
  spainTaxYearLabel: string;
}

export default function TaxDocumentsPanel({
  results,
  inputs,
  taxYear,
  onTaxYearChange,
  ukTaxYearLabel,
  spainTaxYearLabel,
}: TaxDocumentsPanelProps) {
  const [country, setCountry] = useState<'UK' | 'Spain'>('UK');
  const [spainRegime, setSpainRegime] = useState<SpainRegime>('spainNormal');

  const ukResult = results.find((r) => r.regimeKey === 'uk');
  const spainNormalResult = results.find((r) => r.regimeKey === 'spainNormal');
  const spainBeckhamResult = results.find((r) => r.regimeKey === 'spainBeckham');
  const spainAutonomoResult = results.find((r) => r.regimeKey === 'spainAutonomo');

  const ukData = useMemo(
    () => (ukResult ? getTaxDocumentsData(ukResult, inputs, ukTaxYearLabel) : null),
    [ukResult, inputs, ukTaxYearLabel],
  );

  const spainRegimeResults: { regime: SpainRegime; result: TaxResult }[] = [];
  if (spainNormalResult) spainRegimeResults.push({ regime: 'spainNormal', result: spainNormalResult });
  if (spainBeckhamResult) spainRegimeResults.push({ regime: 'spainBeckham', result: spainBeckhamResult });
  if (spainAutonomoResult) spainRegimeResults.push({ regime: 'spainAutonomo', result: spainAutonomoResult });

  const currentSpain = spainRegimeResults.find((r) => r.regime === spainRegime) ?? spainRegimeResults[0];

  const spainData = useMemo(
    () =>
      currentSpain
        ? getTaxDocumentsData(currentSpain.result, inputs, spainTaxYearLabel)
        : null,
    [currentSpain, inputs, spainTaxYearLabel],
  );

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Month-by-month breakdown and data for tax forms. UK tax year: Apr–Mar. Spain: Jan–Dec.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="tax-year-docs">Tax year</Label>
          <Select value={taxYear} onValueChange={onTaxYearChange}>
            <SelectTrigger id="tax-year-docs" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableTaxYears.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Tabs value={country} onValueChange={(v) => setCountry(v as 'UK' | 'Spain')}>
          <TabsList>
            <TabsTrigger value="UK">UK</TabsTrigger>
            <TabsTrigger value="Spain">Spain</TabsTrigger>
          </TabsList>
        </Tabs>

        {country === 'Spain' && spainRegimeResults.length > 1 && (
          <div className="flex items-center gap-2">
            <Label htmlFor="spain-regime">Scenario</Label>
            <Select value={spainRegime} onValueChange={(v) => setSpainRegime(v as SpainRegime)}>
              <SelectTrigger id="spain-regime" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spainRegimeResults.map(({ regime }) => (
                  <SelectItem key={regime} value={regime}>
                    {regime === 'spainNormal' && 'Normal (IRPF)'}
                    {regime === 'spainBeckham' && 'Beckham Law'}
                    {regime === 'spainAutonomo' && 'Autónomo'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {country === 'UK' && ukData && (
        <div className="space-y-6">
          <MonthByMonthTable data={ukData} />
          <UKFormSummary data={ukData} />
        </div>
      )}

      {country === 'Spain' && spainData && (
        <div className="space-y-6">
          <MonthByMonthTable data={spainData} />
          {spainData.regimeKey === 'spainAutonomo' && (
            <SpainAutonomoFormSummary data={spainData} inputs={inputs} />
          )}
          {spainData.regimeKey === 'spainBeckham' && (
            <SpainBeckhamFormSummary data={spainData} />
          )}
          {spainData.regimeKey === 'spainNormal' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Spain Normal – Modelo 100</h3>
              <p className="text-sm text-muted-foreground">
                File Apr–30 Jun. Employment income, deductions, and tax withheld are reported. Use
                Agencia Tributaria Renta Web.
              </p>
            </div>
          )}
          {spainData.ukPropertyForms && (
            <UKPropertyFormsCard data={spainData.ukPropertyForms} />
          )}
        </div>
      )}

      {country === 'UK' && !ukResult && (
        <p className="text-muted-foreground">Enable UK scenario in inputs to see tax documents.</p>
      )}

      {country === 'Spain' && !spainData && (
        <p className="text-muted-foreground">
          Enable Spain scenarios in inputs to see tax documents.
        </p>
      )}
    </div>
  );
}
