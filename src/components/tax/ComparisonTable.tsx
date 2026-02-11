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
}

export default function ComparisonTable({ results, baseCurrency, exchangeRate }: ComparisonTableProps) {
  if (results.length === 0) return null;

  const c = (amount: number, from: Currency) => convert(amount, from, baseCurrency, exchangeRate);

  const rows: Row[] = [
    {
      label: 'Gross Income',
      values: results.map((r) => fmt(c(r.grossIncome, r.grossCurrency), baseCurrency)),
      bold: true,
    },
  ];

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
      label: 'Foreign Property Tax',
      values: results.map((r) =>
        r.foreignIncomeTax > 0 ? fmt(c(r.foreignIncomeTax, r.grossCurrency), baseCurrency) : '—'
      ),
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

  // Dual currency row if needed
  if (results.some((r) => r.grossCurrency !== baseCurrency)) {
    rows.push(
      { label: '', values: results.map(() => ''), separator: true },
      {
        label: `Net Annual (original currency)`,
        values: results.map((r) => fmt(r.netAnnual, r.grossCurrency)),
      },
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48"></TableHead>
            {results.map((r) => (
              <TableHead key={r.regimeKey} className="text-center min-w-32">
                {r.regime}
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
            return (
              <TableRow key={i}>
                <TableCell className={`text-sm ${row.bold ? 'font-semibold' : 'text-muted-foreground'}`}>
                  {row.label}
                </TableCell>
                {row.values.map((v, j) => (
                  <TableCell key={j} className={`text-center font-mono text-sm ${row.bold ? 'font-semibold' : ''}`}>
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
