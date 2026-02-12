import type { TaxDocumentsData } from '@/types/tax';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

function formatGBP(amount: number): string {
  return `£${Math.round(amount).toLocaleString()}`;
}

interface UKPropertyFormsCardProps {
  data: NonNullable<TaxDocumentsData['ukPropertyForms']>;
}

/**
 * UK property forms required when Spain resident owns UK rental.
 * HMRC taxes UK property regardless of owner residence — file SA105/NRL return.
 */
export default function UKPropertyFormsCard({ data }: UKPropertyFormsCardProps) {
  const [open, setOpen] = useState(true);
  const b = data.calculationBreakdown;

  return (
    <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">UK Property — Forms to File (HMRC)</CardTitle>
        <p className="text-sm text-muted-foreground">
          As a Spain resident with UK rental property, you must still file a UK tax return for the
          property. HMRC taxes UK property on non‑residents. Tax year {data.ukTaxYearLabel}.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Income & expenses summary */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Rental income</span>
            <span className="font-mono">{formatGBP(data.rentalIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span>Allowable expenses</span>
            <span className="font-mono">{formatGBP(data.allowableExpenses)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Net profit (rental − expenses)</span>
            <span className="font-mono">{formatGBP(data.netProfit)}</span>
          </div>
        </div>

        {/* Tax calculation breakdown */}
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-left font-medium hover:underline">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
            How is UK tax calculated?
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2 pt-2 border-t">
            <div className="flex justify-between text-muted-foreground">
              <span>1. Net profit</span>
              <span className="font-mono">{formatGBP(data.netProfit)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>2. Less: Personal allowance (non‑resident)</span>
              <span className="font-mono">−{formatGBP(b.personalAllowance)}</span>
            </div>
            <div className="flex justify-between">
              <span>3. Taxable amount</span>
              <span className="font-mono">{formatGBP(b.taxableAfterPA)}</span>
            </div>
            <div className="flex justify-between">
              <span>4. Tax before S24 credit (progressive bands)</span>
              <span className="font-mono">{formatGBP(b.taxBeforeS24)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>5. Less: S24 mortgage interest credit (20% of £{Math.round(data.mortgageInterest).toLocaleString()})</span>
              <span className="font-mono">−{formatGBP(b.s24Credit)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>6. UK tax due (to HMRC)</span>
              <span className="font-mono">{formatGBP(b.netTaxDue)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2 leading-relaxed">
              {b.explanation}
            </p>
          </CollapsibleContent>
        </Collapsible>

        <p className="text-xs text-muted-foreground pt-2">
          File SA105 (property supplement) with SA100, or use the Non-Resident Landlord scheme. Claim
          DTA credit on your Spanish return for UK tax paid.
        </p>
      </CardContent>
    </Card>
  );
}
