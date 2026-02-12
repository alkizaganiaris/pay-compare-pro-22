import { TaxResult, Currency, CalculationStep } from '@/types/tax';
import { convert } from '@/lib/taxCalculators';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, AlertTriangle, Receipt, BarChart3 } from 'lucide-react';
import { useState } from 'react';

function stepValueClass(step: CalculationStep): string {
  const l = step.label.toLowerCase();
  if (l.includes('credit') || l.includes('net annual')) return 'text-emerald-600';
  if (l.includes('allowance') || l.includes('general deduction') || l.includes('irpf (gross)')) return 'text-muted-foreground';
  const isMoneyOut = (l.includes('tax') && !l.includes('taxable')) || l.includes('net irpf') || l.includes('national insurance') || l.includes('social security') || l.includes('cuota') || l.includes('total deduction') || l.includes('expense deduction');
  if (isMoneyOut) return 'text-rose-600';
  if (step.amount < 0) return 'text-rose-600';
  if (step.amount > 0 && (l.includes('gross') || l.includes('income') || l.includes('taxable') || l.includes('profit') || l.includes('base') || l.includes('property (nrl)'))) return 'text-emerald-600';
  return 'text-muted-foreground';
}

interface ResultCardProps {
  result: TaxResult;
  baseCurrency: Currency;
  exchangeRate: number;
  accentClass: string;
  isBest?: boolean;
}

function fmtCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'GBP' ? '£' : '€';
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

export default function ResultCard({ result, baseCurrency, exchangeRate, accentClass, isBest }: ResultCardProps) {
  const [open, setOpen] = useState(false);

  // Total net: employment net + property net cash flow − UK property tax (when Spain resident with UK property)
  const propertyNetAnnual = result.foreignPropertyNetCashFlow ?? result.foreignPropertyNetAnnual ?? 0;
  const ukPropertyTaxInResult = (result.ukPropertyTax ?? 0);
  const ukPropertyTaxInResultCurrency = result.grossCurrency === 'GBP'
    ? ukPropertyTaxInResult
    : convert(ukPropertyTaxInResult, 'GBP', result.grossCurrency, exchangeRate);
  const totalNetAnnual = result.netAnnual + propertyNetAnnual - ukPropertyTaxInResultCurrency;
  const netInBase = convert(totalNetAnnual, result.grossCurrency, baseCurrency, exchangeRate);
  const netMonthlyBase = netInBase / 12;
  const grossInBase = convert(result.grossIncome, result.grossCurrency, baseCurrency, exchangeRate);

  // Monthly payslip figures — all in base currency
  const toBase = (amount: number, from: Currency) => convert(amount, from, baseCurrency, exchangeRate);
  const pensionMonthly = toBase((result.pensionContribution ?? 0) / 12, result.grossCurrency);
  const grossMonthly = toBase(result.grossIncome / 12, result.grossCurrency);
  const taxableMonthly = toBase(result.taxableIncome / 12, result.grossCurrency);
  const incomeTaxMonthly = toBase(result.incomeTax / 12, result.grossCurrency);
  const socialMonthly = toBase(result.socialContributions / 12, result.grossCurrency);
  const propertyNetMonthly = toBase(propertyNetAnnual / 12, result.grossCurrency);
  const propertyTaxMonthly = toBase((result.foreignIncomeTax ?? 0) / 12, result.grossCurrency);
  const ukPropertyTaxMonthly = toBase(ukPropertyTaxInResultCurrency / 12, result.grossCurrency);
  const netEmploymentMonthly = toBase((result.netAnnual + (result.foreignIncomeTax ?? 0)) / 12, result.grossCurrency);
  const totalNetMonthly = netMonthlyBase;

  return (
    <Card className={`border-t-4 ${accentClass} ${isBest ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {result.regime}
          {isBest && (
            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">Best</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="w-full h-9 p-1 rounded-lg bg-muted/70 flex [&>button:first-child]:rounded-l-md [&>button:first-child]:rounded-r-none [&>button:last-child]:rounded-r-md [&>button:last-child]:rounded-l-none">
            <TabsTrigger
              value="summary"
              className="flex-1 text-xs h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-colors"
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Summary
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="flex-1 text-xs h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-colors"
            >
              <Receipt className="h-3 w-3 mr-1" />
              Monthly
            </TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Gross Annual</p>
            <p className="text-sm font-medium">{fmtCurrency(grossInBase, baseCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net Annual</p>
            <p className="text-lg font-bold">{fmtCurrency(netInBase, baseCurrency)}</p>
            {baseCurrency !== result.grossCurrency && (
              <p className="text-xs text-muted-foreground">{fmtCurrency(totalNetAnnual, result.grossCurrency)}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net Monthly</p>
            <p className="text-lg font-bold">{fmtCurrency(netMonthlyBase, baseCurrency)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Gross − Total Deductions = Net</p>

        {/* Tax by country — dynamic based on scenario and property location */}
        {(result.taxByCountry && result.taxByCountry.length > 0) && (
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tax by country</p>
            {result.taxByCountry
              .filter(({ amount }) => amount > 0)
              .map(({ country, amount, currency }) => (
                <div key={country} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax paid in {country}</span>
                  <span className="font-mono font-medium">
                    {fmtCurrency(convert(amount, currency, baseCurrency, exchangeRate), baseCurrency)}
                  </span>
                </div>
              ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          {(result.pensionContribution ?? 0) > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Pension (sacrifice)</p>
              <p className="font-medium">{fmtCurrency(convert(result.pensionContribution!, result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Income Tax{result.regimeKey === 'spainNormal' && ukPropertyTaxInResult > 0 ? ' (after DTA)' : ''}</p>
            <p className="font-medium">{fmtCurrency(convert(result.incomeTax - (result.dtaCredit ?? 0), result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Social Contributions</p>
            <p className="font-medium">{fmtCurrency(convert(result.socialContributions, result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Deductions{result.regimeKey === 'spainNormal' && ukPropertyTaxInResult > 0 ? ' (after DTA)' : ''}</p>
            <p className="font-medium">{fmtCurrency(convert(result.totalDeductions, result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}</p>
          </div>
          {ukPropertyTaxInResult > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">UK property tax (paid to HMRC)</p>
              <p className="font-medium">{fmtCurrency(convert(ukPropertyTaxInResult, 'GBP', baseCurrency, exchangeRate), baseCurrency)}</p>
            </div>
          )}
          {result.taxByCountry
            ?.filter(({ country }) => ['Portugal', 'Greece', 'Italy'].includes(country))
            .filter(({ amount }) => amount > 0)
            .map(({ country, amount, currency }) => (
              <div key={country}>
                <p className="text-xs text-muted-foreground">{country} property tax (source country)</p>
                <p className="font-medium">{fmtCurrency(convert(amount, currency, baseCurrency, exchangeRate), baseCurrency)}</p>
              </div>
            ))}
          {result.regimeKey === 'spainNormal' && ukPropertyTaxInResult > 0 && (
            <div className="col-span-2 rounded-md border border-border bg-muted/30 p-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">DTA (UK-Spain) — after DTA relief</p>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Spanish tax on property</span>
                <span className="font-mono">{fmtCurrency(convert(result.foreignIncomeTax, result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">UK property tax</span>
                <span className="font-mono">{fmtCurrency(convert(ukPropertyTaxInResult, 'GBP', baseCurrency, exchangeRate), baseCurrency)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-600">
                <span>DTA credit (relief)</span>
                <span className="font-mono">−{fmtCurrency(convert(result.dtaCredit ?? 0, result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-border font-medium">
                <span>Net Spanish tax on property (after DTA)</span>
                <span className="font-mono">{fmtCurrency(convert(Math.max(0, result.foreignIncomeTax - (result.dtaCredit ?? 0)), result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}</span>
              </div>
            </div>
          )}
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
              <span className="font-medium text-xs">{fmtCurrency(toBase(result.cuotaAutonomoMonthly, result.grossCurrency), baseCurrency)}/mo · {fmtCurrency(toBase(result.cuotaAutonomoAnnual ?? 0, result.grossCurrency), baseCurrency)}/yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Expenses deducted</span>
              <span className="font-medium text-xs">{fmtCurrency(toBase(result.expenseDeduction || 0, result.grossCurrency), baseCurrency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Net taxable profit</span>
              <span className="font-medium text-xs">{fmtCurrency(toBase(result.netTaxableProfit || 0, result.grossCurrency), baseCurrency)}</span>
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
            <div className="mt-2 space-y-3 text-xs">
              {(['employment', 'property', 'net'] as const).map((section) => {
                const sectionSteps = result.steps
                  .filter((s) => s.section === section)
                  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                if (sectionSteps.length === 0) return null;
                const sectionTitles = { employment: 'From employment', property: 'From property', net: 'Net' };
                return (
                  <div key={section}>
                    <p className="font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">{sectionTitles[section]}</p>
                    <div className="space-y-0.5">
                      {sectionSteps.map((step, i) => {
                        const valueClass = stepValueClass(step);
                        return (
                          <div key={i} className="flex justify-between py-0.5 border-b border-border/50 last:border-0">
                            <span className="text-muted-foreground">{step.label}</span>
                            <span className={`font-mono font-medium ${valueClass}`}>
                              {step.amount < 0 ? '-' : ''}{fmtCurrency(convert(Math.abs(step.amount), result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {/* Steps without section (legacy / fallback) */}
              {result.steps.filter((s) => !s.section).length > 0 && (
                <div>
                  {result.steps.filter((s) => !s.section).map((step, i) => {
                    const valueClass = stepValueClass(step);
                    return (
                      <div key={i} className="flex justify-between py-0.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground">{step.label}</span>
                        <span className={`font-mono font-medium ${valueClass}`}>
                          {step.amount < 0 ? '-' : ''}{fmtCurrency(convert(Math.abs(step.amount), result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {result.bandBreakdown.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Tax bands</p>
                  {result.bandBreakdown.map((b, i) => (
                    <div key={i} className="flex justify-between py-0.5 text-muted-foreground">
                      <span>{b.band} @ {(b.rate * 100).toFixed(0)}%</span>
                      <span className="font-mono text-rose-600 font-medium">{fmtCurrency(convert(b.tax, result.grossCurrency, baseCurrency, exchangeRate), baseCurrency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
          </TabsContent>
          <TabsContent value="monthly" className="mt-3">
            <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
              {result.regimeKey === 'spainAutonomo' ? (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Monthly Breakdown</p>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Gross revenue</span>
                    <span className="font-mono font-medium">{fmtCurrency(grossMonthly, baseCurrency)}</span>
                  </div>
                  {result.expenseDeduction !== undefined && result.expenseDeduction > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Expense deduction</span>
                      <span className="font-mono font-medium text-amber-600">−{fmtCurrency(toBase(result.expenseDeduction / 12, result.grossCurrency), baseCurrency)}</span>
                    </div>
                  )}
                  {result.netTaxableProfit !== undefined && result.netTaxableProfit > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Net profit</span>
                      <span className="font-mono font-medium">{fmtCurrency(toBase(result.netTaxableProfit / 12, result.grossCurrency), baseCurrency)}</span>
                    </div>
                  )}
                  {result.cuotaAutonomoMonthly !== undefined && result.cuotaAutonomoMonthly > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Cuota autónomo</span>
                      <span className="font-mono font-medium text-red-600">−{fmtCurrency(toBase(result.cuotaAutonomoMonthly, result.grossCurrency), baseCurrency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Income tax (IRPF)</span>
                    <span className="font-mono font-medium text-red-600">−{fmtCurrency(incomeTaxMonthly, baseCurrency)}</span>
                  </div>
                  <div className="flex justify-between py-2 pt-3 font-semibold">
                    <span>Net freelance pay</span>
                    <span className="font-mono text-emerald-600">{fmtCurrency(netEmploymentMonthly, baseCurrency)}</span>
                  </div>
                  {(propertyNetMonthly !== 0 || propertyTaxMonthly > 0 || ukPropertyTaxMonthly > 0) && (
                    <div className="pt-2 mt-1 border-t border-border/50 space-y-1.5 text-muted-foreground">
                      {propertyTaxMonthly > 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs">Property tax (Spain)</span>
                          <span className="font-mono text-xs font-medium text-red-600">−{fmtCurrency(propertyTaxMonthly, baseCurrency)}</span>
                        </div>
                      )}
                      {ukPropertyTaxMonthly > 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs">UK property tax (paid to HMRC)</span>
                          <span className="font-mono text-xs font-medium text-red-600">−{fmtCurrency(ukPropertyTaxMonthly, baseCurrency)}</span>
                        </div>
                      )}
                      {propertyNetMonthly !== 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs">Property income (net)</span>
                          <span className="font-mono text-xs font-medium text-emerald-600">+{fmtCurrency(propertyNetMonthly, baseCurrency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1.5 font-semibold text-foreground border-t border-border/50 mt-1.5">
                        <span className="text-xs">Net pay</span>
                        <span className="font-mono text-xs text-emerald-600">{fmtCurrency(totalNetMonthly, baseCurrency)}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Monthly Payslip</p>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Gross pay</span>
                    <span className="font-mono font-medium">{fmtCurrency(grossMonthly, baseCurrency)}</span>
                  </div>
                  {pensionMonthly > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Pension (salary sacrifice)</span>
                      <span className="font-mono font-medium text-amber-600">−{fmtCurrency(pensionMonthly, baseCurrency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Taxable pay</span>
                    <span className="font-mono font-medium">{fmtCurrency(taxableMonthly, baseCurrency)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Income tax</span>
                    <span className="font-mono font-medium text-red-600">−{fmtCurrency(incomeTaxMonthly, baseCurrency)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">NI / Social security</span>
                    <span className="font-mono font-medium text-red-600">−{fmtCurrency(socialMonthly, baseCurrency)}</span>
                  </div>
                  <div className="flex justify-between py-2 pt-3 font-semibold">
                    <span>Net employment pay</span>
                    <span className="font-mono text-emerald-600">{fmtCurrency(netEmploymentMonthly, baseCurrency)}</span>
                  </div>
                  {(propertyNetMonthly !== 0 || propertyTaxMonthly > 0 || ukPropertyTaxMonthly > 0) ? (
                    <div className="pt-2 mt-1 border-t border-border/50 space-y-1.5 text-muted-foreground">
                      {propertyTaxMonthly > 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs">Property tax (Spain)</span>
                          <span className="font-mono text-xs font-medium text-red-600">−{fmtCurrency(propertyTaxMonthly, baseCurrency)}</span>
                        </div>
                      )}
                      {ukPropertyTaxMonthly > 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs">UK property tax (paid to HMRC)</span>
                          <span className="font-mono text-xs font-medium text-red-600">−{fmtCurrency(ukPropertyTaxMonthly, baseCurrency)}</span>
                        </div>
                      )}
                      {propertyNetMonthly !== 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs">Property income (net)</span>
                          <span className="font-mono text-xs font-medium text-emerald-600">+{fmtCurrency(propertyNetMonthly, baseCurrency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1.5 font-semibold text-foreground border-t border-border/50 mt-1.5">
                        <span className="text-xs">Net pay</span>
                        <span className="font-mono text-xs text-emerald-600">{fmtCurrency(totalNetMonthly, baseCurrency)}</span>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
