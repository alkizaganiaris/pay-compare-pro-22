import type { TaxDocumentsData, TaxInputs } from '@/types/tax';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

function formatEUR(amount: number): string {
  return `€${Math.round(amount).toLocaleString()}`;
}

interface SpainAutonomoFormSummaryProps {
  data: TaxDocumentsData;
  inputs: TaxInputs;
}

export default function SpainAutonomoFormSummary({ data, inputs }: SpainAutonomoFormSummaryProps) {
  const { modelo130, modelo100 } = data;
  const [otherOpen, setOtherOpen] = useState(false);
  const hasForeignProperty = inputs.foreignPropertyEnabled;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Spain Autónomo – Modelo 130 & 100</h3>

      {modelo130 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Modelo 130 – Quarterly IRPF Prepayment</CardTitle>
            <p className="text-sm text-muted-foreground">20% of quarterly net profit · File by deadline</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {modelo130.map((q) => (
                <div key={q.quarter} className="flex items-center justify-between rounded border px-3 py-2">
                  <div>
                    <span className="font-medium">Q{q.quarter}</span>
                    <span className="ml-2 text-muted-foreground">– Deadline {q.deadline}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono">{formatEUR(q.amountDue)}</span>
                    <span className="ml-1 text-muted-foreground">
                      (net €{Math.round(q.netProfit).toLocaleString()} × {q.rate * 100}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {modelo100 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Modelo 100 – Annual IRPF Return</CardTitle>
            <p className="text-sm text-muted-foreground">File Apr–30 Jun for prior year</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total income</span>
              <span className="font-mono">{formatEUR(modelo100.totalIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total deductions</span>
              <span className="font-mono">{formatEUR(modelo100.totalDeductions)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax due</span>
              <span className="font-mono">{formatEUR(modelo100.taxDue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Modelo 130 prepayments</span>
              <span className="font-mono text-emerald-600">−{formatEUR(modelo100.modelo130Prepayments)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Balance due / refund</span>
              <span className="font-mono">
                {modelo100.taxDue - modelo100.modelo130Prepayments >= 0
                  ? formatEUR(modelo100.taxDue - modelo100.modelo130Prepayments)
                  : `Refund ${formatEUR(Math.abs(modelo100.taxDue - modelo100.modelo130Prepayments))}`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Collapsible open={otherOpen} onOpenChange={setOtherOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                {otherOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <CardTitle className="text-base">Other possible documents (depending on your situation)</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                IVA, foreign assets, wealth tax, third-party operations &mdash; expand for full list.
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Modelo 100 sections for different income types */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Modelo 100 – sections to complete</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Rendimientos actividades económicas</strong> – Self-employed income (always)</li>
                  {hasForeignProperty && (
                    <li><strong>Rendimientos de capital inmobiliario</strong> – Rental income (foreign or Spanish property)</li>
                  )}
                  <li><strong>Rendimientos del capital mobiliario</strong> – Dividends, interest (if any)</li>
                  <li><strong>Ganancias patrimoniales</strong> – Capital gains (e.g. property sale, shares)</li>
                  <li><strong>Renta mundial</strong> – Worldwide income; foreign income with DTA credit if taxed abroad</li>
                </ul>
              </div>

              {/* IVA / VAT */}
              <div>
                <h4 className="text-sm font-semibold mb-2">IVA (VAT) – if you are VAT registered</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><strong>Modelo 303</strong> – Quarterly VAT return. 1–20 Apr, Jul, Oct; 1–30 Jan.</li>
                  <li><strong>Modelo 349</strong> – Intra-EU operations (B2B sales/purchases with other EU countries).</li>
                  <li><strong>Modelo 390</strong> – Annual VAT summary. By 30 January.</li>
                </ul>
              </div>

              {/* Foreign assets */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Modelo 720 – Foreign assets declaration</h4>
                <p className="text-sm text-muted-foreground mb-1">
                  Required if <strong>any single category</strong> exceeds €50,000 (as of 31 Dec). Deadline: 31 March.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Bank accounts abroad</li>
                  <li>Investments abroad (stocks, bonds, funds, crypto)</li>
                  <li>Real estate abroad {hasForeignProperty && '(including your rental property)'}</li>
                </ul>
              </div>

              {/* Third-party operations */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Modelo 347 – Third-party operations</h4>
                <p className="text-sm text-muted-foreground">
                  Informative declaration when payments <strong>to or from</strong> the same person/entity exceed €3,005.06 (VAT included) in the year. Many autónomos qualify. Deadline: 1 Feb – 28 Feb (or early March).
                </p>
              </div>

              {/* Wealth tax */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Modelo 714 – Wealth tax (Patrimonio)</h4>
                <p className="text-sm text-muted-foreground">
                  If net wealth exceeds ~€700,000 (threshold varies by region; Catalonia €500k, Madrid/Andalusia 100% bonus). Filed Apr–30 Jun with IRPF.
                </p>
              </div>

              {/* Registration */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Modelo 036 / 037 – Census & registration</h4>
                <p className="text-sm text-muted-foreground">
                  Alta as autónomo (epígrafe IAE), modifications, or baja. Usually handled by gestoría or when registering.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
