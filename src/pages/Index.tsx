import { useState, useMemo } from 'react';
import { TaxInputs, TaxResult } from '@/types/tax';
import { defaultTaxYears } from '@/data/taxConfig';
import { calculateUK, calculateSpainNormal, calculateSpainBeckham, calculateSpainAutonomo } from '@/lib/taxCalculators';
import InputPanel from '@/components/tax/InputPanel';
import ResultsPanel from '@/components/tax/ResultsPanel';
import ComparisonTable from '@/components/tax/ComparisonTable';
import AssumptionsPanel from '@/components/tax/AssumptionsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const defaultInputs: TaxInputs = {
  baseCurrency: 'EUR',
  exchangeRate: 1.15,
  grossSalary: 126500,
  salaryCurrency: 'EUR',
  freelanceRevenue: 126500,
  freelanceCurrency: 'EUR',
  expenseDeductionRate: 7,
  includeUkNi: true,
  includeSpainNormal: true,
  includeSpainBeckham: true,
  includeSpainAutonomo: true,
  foreignPropertyIncome: 12000,
  foreignPropertyCurrency: 'EUR',
  foreignPropertyCountry: 'Portugal',
  foreignPropertyEnabled: false,
  treatAsForeignSource: true,
  expensesAlreadyNetted: true,
  ukResident: true,
  spainResident: true,
  beckhamEligible: true,
};

export default function Index() {
  const [inputs, setInputs] = useState<TaxInputs>(defaultInputs);
  const [taxYears, setTaxYears] = useState(defaultTaxYears);

  const results = useMemo<TaxResult[]>(() => {
    const r: TaxResult[] = [];
    if (inputs.includeUkNi || inputs.ukResident) {
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
            <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 xl:col-span-3">
                <InputPanel inputs={inputs} onChange={setInputs} onReset={() => setInputs(defaultInputs)} />
              </div>
              <div className="lg:col-span-8 xl:col-span-9">
                <ResultsPanel results={results} baseCurrency={inputs.baseCurrency} exchangeRate={inputs.exchangeRate} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <ComparisonTable results={results} baseCurrency={inputs.baseCurrency} exchangeRate={inputs.exchangeRate} />
          </TabsContent>

          <TabsContent value="assumptions">
            <AssumptionsPanel inputs={inputs} taxYears={taxYears} onTaxYearsChange={setTaxYears} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
