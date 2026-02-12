import type { TaxDocumentsData } from '@/types/tax';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatGBP(amount: number): string {
  return `£${Math.round(amount).toLocaleString()}`;
}

interface UKFormSummaryProps {
  data: TaxDocumentsData;
}

export default function UKFormSummary({ data }: UKFormSummaryProps) {
  const { sa100, sa105, paymentsOnAccount, mtdQuarterlyUpdates } = data;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">UK Self-Assessment Forms</h3>

      {sa100 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SA100 – Main Tax Return</CardTitle>
            <p className="text-sm text-muted-foreground">Employment and total income</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total income</span>
              <span className="font-mono">{formatGBP(sa100.totalIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxable income</span>
              <span className="font-mono">{formatGBP(sa100.taxableIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>Income tax</span>
              <span className="font-mono">{formatGBP(sa100.incomeTax)}</span>
            </div>
            <div className="flex justify-between">
              <span>National Insurance</span>
              <span className="font-mono">{formatGBP(sa100.ni)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {sa105 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SA105 – Property</CardTitle>
            <p className="text-sm text-muted-foreground">UK rental income</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Rental income</span>
              <span className="font-mono">{formatGBP(sa105.rentalIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>Allowable expenses</span>
              <span className="font-mono">{formatGBP(sa105.allowableExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span>Net profit</span>
              <span className="font-mono">{formatGBP(sa105.netProfit)}</span>
            </div>
            <div className="flex justify-between">
              <span>Mortgage interest (S24)</span>
              <span className="font-mono">{formatGBP(sa105.mortgageInterest)}</span>
            </div>
            <div className="flex justify-between">
              <span>S24 tax credit (20%)</span>
              <span className="font-mono text-emerald-600">−{formatGBP(sa105.s24Credit)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Tax due</span>
              <span className="font-mono">{formatGBP(sa105.taxDue)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {mtdQuarterlyUpdates && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Making Tax Digital (MTD) – Quarterly Updates</CardTitle>
            <p className="text-sm text-muted-foreground">
              Mandatory from April 2026 for self-employed and landlords with qualifying income over £50,000.
              Digital reporting via compatible software. Applies if combined self-employment and property income
              exceeds £50,000. Employment (PAYE) income is not part of this threshold.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {mtdQuarterlyUpdates.map((q) => (
              <div key={q.quarter} className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <span className="font-medium">Q{q.quarter}</span>
                  <span className="ml-2 text-muted-foreground">{q.periodLabel}</span>
                </div>
                <span className="text-muted-foreground">Deadline {q.deadline}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              These are reporting deadlines, not tax payments. Final Declaration by 31 Jan; Payments on
              Account (31 Jan, 31 Jul) unchanged.
            </p>
          </CardContent>
        </Card>
      )}

      {paymentsOnAccount && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payments on Account</CardTitle>
            <p className="text-sm text-muted-foreground">
              {mtdQuarterlyUpdates
                ? 'Mid-year deadlines. Under MTD, submit a Final Declaration (replacing SA100) by 31 January. Payment dates unchanged.'
                : 'Mid-year deadlines'}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>31 January – Balancing payment + 1st POA</span>
              <span className="font-mono">
                {formatGBP(paymentsOnAccount.balancingPayment + paymentsOnAccount.firstPOA)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>31 July – 2nd payment on account</span>
              <span className="font-mono">{formatGBP(paymentsOnAccount.secondPOA)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
