import { TaxResult, Currency } from '@/types/tax';
import { convert } from '@/lib/taxCalculators';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface ResultCardProps {
  result: TaxResult;
  baseCurrency: Currency;
  exchangeRate: number;
  accentClass: string;
}

function fmtCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'GBP' ? '£' : '€';
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

export default function ResultCard({ result, baseCurrency, exchangeRate, accentClass }: ResultCardProps) {
  const [open, setOpen] = useState(false);

  const netInBase = convert(result.netAnnual, result.grossCurrency, baseCurrency, exchangeRate);
  const netMonthlyBase = netInBase / 12;
  const grossInBase = convert(result.grossIncome, result.grossCurrency, baseCurrency, exchangeRate);

  return (
    <Card className={`border-t-4 ${accentClass}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{result.regime}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Net Annual</p>
            <p className="text-lg font-bold">{fmtCurrency(netInBase, baseCurrency)}</p>
            {baseCurrency !== result.grossCurrency && (
              <p className="text-xs text-muted-foreground">{fmtCurrency(result.netAnnual, result.grossCurrency)}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net Monthly</p>
            <p className="text-lg font-bold">{fmtCurrency(netMonthlyBase, baseCurrency)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Income Tax</p>
            <p className="font-medium">{fmtCurrency(convert(result.incomeTax, result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Social Contributions</p>
            <p className="font-medium">{fmtCurrency(convert(result.socialContributions, result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Effective Rate</p>
            <p className="font-medium">{result.effectiveRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Take-Home</p>
            <p className="font-medium text-emerald-600">{result.takeHomePercent.toFixed(1)}%</p>
          </div>
        </div>

        {/* Autónomo extras */}
        {result.regimeKey === 'spainAutonomo' && result.cuotaAutonomoMonthly !== undefined && result.cuotaAutonomoMonthly > 0 && (
          <div className="rounded-md bg-muted/50 p-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Cuota autónomo</span>
              <span className="font-medium text-xs">€{result.cuotaAutonomoMonthly}/mo · €{result.cuotaAutonomoAnnual?.toLocaleString()}/yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Expenses deducted</span>
              <span className="font-medium text-xs">€{Math.round(result.expenseDeduction || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Net taxable profit</span>
              <span className="font-medium text-xs">€{Math.round(result.netTaxableProfit || 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="space-y-1">
            {result.warnings.map((w, i) => (
              <div key={i} className="flex gap-1.5 items-start text-xs text-amber-600 bg-amber-50 rounded p-2">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Breakdown */}
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            How is this calculated?
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1 text-xs">
              {result.steps.map((step, i) => (
                <div key={i} className="flex justify-between py-0.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{step.label}</span>
                  <span className="font-mono font-medium">
                    {step.amount < 0 ? '-' : ''}{fmtCurrency(Math.abs(step.amount), result.grossCurrency)}
                  </span>
                </div>
              ))}
              {result.bandBreakdown.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="font-medium mb-1">Tax bands</p>
                  {result.bandBreakdown.map((b, i) => (
                    <div key={i} className="flex justify-between py-0.5 text-muted-foreground">
                      <span>{b.band} @ {(b.rate * 100).toFixed(0)}%</span>
                      <span className="font-mono">{fmtCurrency(b.tax, result.grossCurrency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
