import type { TaxDocumentsData, Currency } from '@/types/tax';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatAmount(amount: number, currency: Currency): string {
  const symbol = currency === 'GBP' ? '£' : '€';
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

interface MonthByMonthTableProps {
  data: TaxDocumentsData;
}

export default function MonthByMonthTable({ data }: MonthByMonthTableProps) {
  const { monthlyBreakdown, currency } = data;
  const annualTotals = monthlyBreakdown.reduce(
    (acc, row) => ({
      grossIncome: acc.grossIncome + row.grossIncome,
      deductions: acc.deductions + row.deductions,
      incomeTax: acc.incomeTax + row.incomeTax,
      socialContributions: acc.socialContributions + row.socialContributions,
      netIncome: acc.netIncome + row.netIncome,
    }),
    { grossIncome: 0, deductions: 0, incomeTax: 0, socialContributions: 0, netIncome: 0 },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Month-by-Month Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tax year {data.taxYearLabel} · {currency === 'GBP' ? 'UK (Apr–Mar)' : 'Spain (Jan–Dec)'}
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Gross Income</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Income Tax</TableHead>
              <TableHead className="text-right">{currency === 'GBP' ? 'NI' : 'Social'}</TableHead>
              {data.modelo130 ? (
                <TableHead className="text-right">Modelo 130</TableHead>
              ) : null}
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyBreakdown.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="font-medium">{row.monthLabel}</TableCell>
                <TableCell className="text-right">{formatAmount(row.grossIncome, currency)}</TableCell>
                <TableCell className="text-right">{formatAmount(row.deductions, currency)}</TableCell>
                <TableCell className="text-right">{formatAmount(row.incomeTax, currency)}</TableCell>
                <TableCell className="text-right">{formatAmount(row.socialContributions, currency)}</TableCell>
                {data.modelo130 ? (
                  <TableCell className="text-right">
                    {(row.modelo130Installment ?? 0) > 0
                      ? formatAmount(row.modelo130Installment!, currency)
                      : '—'}
                  </TableCell>
                ) : null}
                <TableCell className="text-right font-medium">{formatAmount(row.netIncome, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Total</TableCell>
              <TableCell className="text-right font-medium">
                {formatAmount(annualTotals.grossIncome, currency)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatAmount(annualTotals.deductions, currency)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatAmount(annualTotals.incomeTax, currency)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatAmount(annualTotals.socialContributions, currency)}
              </TableCell>
              {data.modelo130 ? <TableCell className="text-right font-medium">—</TableCell> : null}
              <TableCell className="text-right font-medium">
                {formatAmount(annualTotals.netIncome, currency)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
