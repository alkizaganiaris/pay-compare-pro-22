import { TaxResult, Currency } from '@/types/tax';
import { convert } from '@/lib/taxCalculators';
import ResultCard from './ResultCard';

interface ResultsPanelProps {
  results: TaxResult[];
  baseCurrency: Currency;
  exchangeRate: number;
}

const accentColors: Record<string, string> = {
  uk: 'border-t-blue-500',
  spainNormal: 'border-t-orange-500',
  spainBeckham: 'border-t-purple-500',
  spainAutonomo: 'border-t-teal-500',
};

function totalNetInBase(r: TaxResult, baseCurrency: Currency, exchangeRate: number): number {
  const propertyNetAnnual = r.foreignPropertyNetCashFlow ?? r.foreignPropertyNetAnnual ?? 0;
  const ukPropertyTaxInResult = r.ukPropertyTax ?? 0;
  const ukPropertyTaxInResultCurrency =
    r.grossCurrency === 'GBP'
      ? ukPropertyTaxInResult
      : convert(ukPropertyTaxInResult, 'GBP', r.grossCurrency, exchangeRate);
  const totalNetAnnual = r.netAnnual + propertyNetAnnual - ukPropertyTaxInResultCurrency;
  return convert(totalNetAnnual, r.grossCurrency, baseCurrency, exchangeRate);
}

export default function ResultsPanel({ results, baseCurrency, exchangeRate }: ResultsPanelProps) {
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Enable at least one scenario and enter an income to see results.
      </div>
    );
  }

  let bestIdx = 0;
  let bestNet = -Infinity;
  results.forEach((r, i) => {
    const net = totalNetInBase(r, baseCurrency, exchangeRate);
    if (net > bestNet) {
      bestNet = net;
      bestIdx = i;
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {results.map((r, i) => (
        <ResultCard
          key={r.regimeKey}
          result={r}
          baseCurrency={baseCurrency}
          exchangeRate={exchangeRate}
          accentClass={accentColors[r.regimeKey] || 'border-t-primary'}
          isBest={i === bestIdx}
        />
      ))}
    </div>
  );
}
