import { TaxResult, Currency } from '@/types/tax';
import { convert } from '@/lib/taxCalculators';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ComparisonTableProps {
  results: TaxResult[];
  baseCurrency: Currency;
  exchangeRate: number;
}

function fmt(amount: number, currency: Currency): string {
  const sym = currency === 'GBP' ? '£' : '€';
  return `${sym}${Math.round(amount).toLocaleString()}`;
}

interface Row {
  label: string;
  values: (string | null)[];
  bold?: boolean;
  separator?: boolean;
  highlightRow?: boolean;
}

const SPANISH_REGIMES = ['spainNormal', 'spainBeckham', 'spainAutonomo'];

export default function ComparisonTable({ results, baseCurrency, exchangeRate }: ComparisonTableProps) {
  if (results.length === 0) return null;

  const c = (amount: number, from: Currency) => convert(amount, from, baseCurrency, exchangeRate);

  const bestSpanishIndex = (() => {
    let bestIdx = -1;
    let bestNet = -Infinity;
    results.forEach((r, i) => {
      if (SPANISH_REGIMES.includes(r.regimeKey)) {
        const netInBase = c(r.netAnnual, r.grossCurrency);
        if (netInBase > bestNet) {
          bestNet = netInBase;
          bestIdx = i;
        }
      }
    });
    return bestIdx;
  })();

  const rows: Row[] = [
    {
      label: 'Gross Income',
      values: results.map((r) => fmt(c(r.grossIncome, r.grossCurrency), baseCurrency)),
      bold: true,
    },
  ];

  // Pension contribution row
  if (results.some((r) => (r.pensionContribution ?? 0) > 0)) {
    rows.push({
      label: 'Pension (salary sacrifice)',
      values: results.map((r) =>
        (r.pensionContribution ?? 0) > 0 ? `-${fmt(c(r.pensionContribution!, r.grossCurrency), baseCurrency)}` : '—'
      ),
    });
  }

  // Expense deduction row (autónomo only)
  if (results.some((r) => r.expenseDeduction)) {
    rows.push({
      label: 'Expense Deduction',
      values: results.map((r) =>
        r.expenseDeduction ? `-${fmt(c(r.expenseDeduction, r.grossCurrency), baseCurrency)}` : '—'
      ),
    });
  }

  rows.push(
    {
      label: 'Taxable Income',
      values: results.map((r) => fmt(c(r.taxableIncome, r.grossCurrency), baseCurrency)),
    },
    { label: '', values: results.map(() => ''), separator: true },
    {
      label: 'Income Tax',
      values: results.map((r) => fmt(c(r.incomeTax, r.grossCurrency), baseCurrency)),
    },
    {
      label: 'Social Contributions',
      values: results.map((r) => fmt(c(r.socialContributions, r.grossCurrency), baseCurrency)),
    },
  );

  if (results.some((r) => r.foreignIncomeTax > 0)) {
    rows.push({
      label: 'Foreign Property Tax (Spain)',
      values: results.map((r) =>
        r.foreignIncomeTax > 0 ? fmt(c(r.foreignIncomeTax, r.grossCurrency), baseCurrency) : '—'
      ),
    });
  }

  if (results.some((r) => (r.ukPropertyTax ?? 0) > 0)) {
    rows.push({
      label: 'UK Property Tax (HMRC)',
      values: results.map((r) =>
        (r.ukPropertyTax ?? 0) > 0 ? fmt(c(r.ukPropertyTax!, 'GBP'), baseCurrency) : '—'
      ),
    });
  }

  if (results.some((r) => (r.foreignPropertyNetCashFlow ?? 0) !== 0)) {
    rows.push({
      label: 'Property Net Cash Flow',
      values: results.map((r) =>
        (r.foreignPropertyNetCashFlow ?? 0) !== 0 ? fmt(c(r.foreignPropertyNetCashFlow!, r.grossCurrency), baseCurrency) : '—'
      ),
    });
  }

  // Tax by country summary — dynamic based on taxByCountry
  const countryOrder = ['UK', 'Spain', 'Portugal', 'Greece', 'Italy'];
  const countriesInResults = new Set<string>();
  results.forEach((r) => r.taxByCountry?.forEach(({ country }) => countriesInResults.add(country)));
  const orderedCountries = countryOrder.filter((c) => countriesInResults.has(c));
  if (orderedCountries.length > 0) {
    rows.push({ label: '', values: results.map(() => ''), separator: true });
    orderedCountries.forEach((country) => {
      rows.push({
        label: `Tax paid in ${country}`,
        values: results.map((r) => {
          const entry = r.taxByCountry?.find((t) => t.country === country);
          return entry && entry.amount > 0 ? fmt(c(entry.amount, entry.currency), baseCurrency) : '—';
        }),
        bold: true,
      });
    });
  }

  rows.push(
    { label: '', values: results.map(() => ''), separator: true },
    {
      label: 'Total Deductions',
      values: results.map((r) => fmt(c(r.totalDeductions, r.grossCurrency), baseCurrency)),
      bold: true,
    },
    {
      label: 'Net Annual',
      values: results.map((r) => fmt(c(r.netAnnual, r.grossCurrency), baseCurrency)),
      bold: true,
    },
    {
      label: 'Net Monthly',
      values: results.map((r) => fmt(c(r.netMonthly, r.grossCurrency), baseCurrency)),
      bold: true,
      highlightRow: true,
    },
    { label: '', values: results.map(() => ''), separator: true },
    {
      label: 'Effective Tax Rate',
      values: results.map((r) => `${r.effectiveRate.toFixed(1)}%`),
    },
    {
      label: 'Take-Home %',
      values: results.map((r) => `${r.takeHomePercent.toFixed(1)}%`),
      bold: true,
    },
  );


  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48"></TableHead>
            {results.map((r, i) => (
              <TableHead
                key={r.regimeKey}
                className={`text-center min-w-32 ${i === bestSpanishIndex ? 'bg-emerald-500/10 ring-1 ring-emerald-500/40 font-semibold' : ''}`}
              >
                {r.regime}
                {i === bestSpanishIndex && (
                  <span className="block text-xs font-normal text-emerald-600 dark:text-emerald-400 mt-0.5">Best Spain</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            if (row.separator) {
              return (
                <TableRow key={i}>
                  <TableCell colSpan={results.length + 1} className="h-1 p-0">
                    <div className="border-t border-border" />
                  </TableCell>
                </TableRow>
              );
            }
            const rowHighlight = row.highlightRow ? 'bg-emerald-500/10' : '';
            return (
              <TableRow key={i} className={rowHighlight}>
                <TableCell className={`text-sm ${row.bold ? 'font-semibold' : 'text-muted-foreground'} ${rowHighlight}`}>
                  {row.label}
                </TableCell>
                {row.values.map((v, j) => (
                  <TableCell
                    key={j}
                    className={`text-center font-mono text-sm ${row.bold ? 'font-semibold' : ''} ${j === bestSpanishIndex ? 'bg-emerald-500/10 ring-1 ring-emerald-500/40' : ''} ${rowHighlight}`}
                  >
                    {v}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
