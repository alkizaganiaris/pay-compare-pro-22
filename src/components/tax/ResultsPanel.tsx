import { TaxResult, Currency } from '@/types/tax';
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

export default function ResultsPanel({ results, baseCurrency, exchangeRate }: ResultsPanelProps) {
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Enable at least one scenario and enter an income to see results.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {results.map((r) => (
        <ResultCard
          key={r.regimeKey}
          result={r}
          baseCurrency={baseCurrency}
          exchangeRate={exchangeRate}
          accentClass={accentColors[r.regimeKey] || 'border-t-primary'}
        />
      ))}
    </div>
  );
}
