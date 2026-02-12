import { useState, useMemo } from 'react';
import { TaxInputs, TaxResult } from '@/types/tax';
import { defaultTaxYear, taxYearForRegime } from '@/data/taxConfig';
import { calculateUK, calculateSpainNormal, calculateSpainBeckham, calculateSpainAutonomo } from '@/lib/taxCalculators';
import InputPanel from '@/components/tax/InputPanel';
import ResultsPanel from '@/components/tax/ResultsPanel';
import ComparisonTable from '@/components/tax/ComparisonTable';
import AssumptionsPanel from '@/components/tax/AssumptionsPanel';
import TaxDocumentsPanel from '@/components/tax/TaxDocumentsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const defaultInputs: TaxInputs = {
  baseCurrency: 'GBP',
  exchangeRate: 1.15,
  grossSalary: 65000,
  salaryCurrency: 'GBP',
  pensionContributionPercent: 3.39,
  freelanceRevenue: 73650,
  freelanceCurrency: 'GBP',
  expenseDeductionRate: 7,
  includeUkNi: true,
  includeSpainNormal: true,
  includeSpainBeckham: true,
  includeSpainAutonomo: true,
  foreignPropertyRentalIncome: 2000,
  foreignPropertyDeductibles: 380,
  foreignPropertyMortgageInterest: 650,
  foreignPropertyMortgagePayment: 1200,
  foreignPropertyMortgageInterestDeductiblePercent: 100,
  foreignPropertyCurrency: 'GBP',
  foreignPropertyCountry: 'UK',
  foreignPropertyEnabled: false,
  treatAsForeignSource: true,
  autonomoYear: 3,
};

export default function Index() {
  const [inputs, setInputs] = useState<TaxInputs>(defaultInputs);
  const [taxYear, setTaxYear] = useState(defaultTaxYear);
  const taxYears = taxYearForRegime(taxYear);

  const results = useMemo<TaxResult[]>(() => {
    const r: TaxResult[] = [];
    if (inputs.includeUkNi) {
      r.push(calculateUK(inputs, taxYears.uk));
    }
    if (inputs.includeSpainNormal) {
      r.push(calculateSpainNormal(inputs, taxYears.spainNormal));
    }
    if (inputs.includeSpainBeckham) {
      r.push(calculateSpainBeckham(inputs, taxYears.spainBeckham));
    }
    if (inputs.includeSpainAutonomo) {
      r.push(calculateSpainAutonomo(inputs, taxYears.spainAutonomo));
    }
    return r;
  }, [inputs, taxYears]);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">Tax Comparison Calculator</h1>
          <p className="text-sm text-muted-foreground">UK vs Spain — Normal, Beckham Law & Autónomo</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="results">Inputs & Results</TabsTrigger>
            <TabsTrigger value="comparison">Comparison Table</TabsTrigger>
            <TabsTrigger value="tax-documents">Tax Documents</TabsTrigger>
            <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 xl:col-span-3">
                <InputPanel inputs={inputs} onChange={setInputs} onReset={() => { setInputs(defaultInputs); setTaxYear(defaultTaxYear); }} taxYear={taxYear} onTaxYearChange={setTaxYear} />
              </div>
              <div className="lg:col-span-8 xl:col-span-9">
                <ResultsPanel results={results} baseCurrency={inputs.baseCurrency} exchangeRate={inputs.exchangeRate} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <ComparisonTable results={results} baseCurrency={inputs.baseCurrency} exchangeRate={inputs.exchangeRate} />
          </TabsContent>

          <TabsContent value="tax-documents">
            <TaxDocumentsPanel
              results={results}
              inputs={inputs}
              taxYear={taxYear}
              onTaxYearChange={setTaxYear}
              ukTaxYearLabel={taxYears.uk}
              spainTaxYearLabel={taxYears.spainNormal}
            />
          </TabsContent>

          <TabsContent value="assumptions">
            <AssumptionsPanel inputs={inputs} taxYear={taxYear} taxYears={taxYears} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
