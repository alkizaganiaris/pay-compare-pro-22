import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ukTaxConfig, spainNormalConfig, spainBeckhamConfig, spainAutonomoConfig } from '@/data/taxConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TaxInputs } from '@/types/tax';

interface AssumptionsPanelProps {
  inputs: TaxInputs;
  taxYears: { uk: string; spainNormal: string; spainBeckham: string; spainAutonomo: string };
  onTaxYearsChange: (years: { uk: string; spainNormal: string; spainBeckham: string; spainAutonomo: string }) => void;
}

export default function AssumptionsPanel({ inputs, taxYears, onTaxYearsChange }: AssumptionsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Tax Year Selectors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs">UK Tax Year</Label>
          <Select value={taxYears.uk} onValueChange={(v) => onTaxYearsChange({ ...taxYears, uk: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(ukTaxConfig).map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Spain Normal Year</Label>
          <Select value={taxYears.spainNormal} onValueChange={(v) => onTaxYearsChange({ ...taxYears, spainNormal: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(spainNormalConfig).map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Beckham Year</Label>
          <Select value={taxYears.spainBeckham} onValueChange={(v) => onTaxYearsChange({ ...taxYears, spainBeckham: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(spainBeckhamConfig).map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Autónomo Year</Label>
          <Select value={taxYears.spainAutonomo} onValueChange={(v) => onTaxYearsChange({ ...taxYears, spainAutonomo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(spainAutonomoConfig).map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Per-regime accordions */}
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="uk">
          <AccordionTrigger className="text-sm">🇬🇧 UK Income Tax & NI</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Tax year:</strong> {taxYears.uk}</p>
              <p><strong>Personal allowance:</strong> £{ukTaxConfig[taxYears.uk].personalAllowance?.toLocaleString()} — tapers by £1 for every £2 earned above £{ukTaxConfig[taxYears.uk].personalAllowanceTaperStart?.toLocaleString()}</p>
              <p><strong>Income tax bands:</strong></p>
              <ul className="list-disc ml-4">
                {ukTaxConfig[taxYears.uk].bands.map((b, i) => (
                  <li key={i}>
                    {b.to !== null ? `£${b.from.toLocaleString()} – £${(b.from + b.to).toLocaleString()}` : `£${b.from.toLocaleString()}+`}: {(b.rate * 100)}%
                  </li>
                ))}
              </ul>
              <p><strong>Employee NI:</strong> {inputs.includeUkNi ? 'Included' : 'Excluded'}</p>
              {inputs.includeUkNi && (
                <ul className="list-disc ml-4">
                  <li>8% on earnings £{ukTaxConfig[taxYears.uk].niThresholds?.primary.toLocaleString()} – £{ukTaxConfig[taxYears.uk].niThresholds?.upper.toLocaleString()}</li>
                  <li>2% on earnings above £{ukTaxConfig[taxYears.uk].niThresholds?.upper.toLocaleString()}</li>
                </ul>
              )}
              <p><strong>Foreign property income:</strong> {inputs.foreignPropertyEnabled && inputs.ukResident ? 'Included — estimated at basic rate (20%) on net rental income' : 'Not included'}</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="spain-normal">
          <AccordionTrigger className="text-sm">🇪🇸 Spain Normal (Employed)</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Tax year:</strong> {taxYears.spainNormal}</p>
              <p><strong>Personal minimum:</strong> €{spainNormalConfig[taxYears.spainNormal].personalMinimum?.toLocaleString()}</p>
              <p><strong>General deduction:</strong> €{spainNormalConfig[taxYears.spainNormal].generalDeduction?.toLocaleString()}</p>
              <p><strong>IRPF bands (state + average regional):</strong></p>
              <ul className="list-disc ml-4">
                {spainNormalConfig[taxYears.spainNormal].bands.map((b, i) => (
                  <li key={i}>
                    €{b.from.toLocaleString()} – {b.to !== null ? `€${b.to.toLocaleString()}` : '∞'}: {(b.rate * 100)}%
                  </li>
                ))}
              </ul>
              <p><strong>Employee social security:</strong> {(spainNormalConfig[taxYears.spainNormal].socialSecurityRate! * 100).toFixed(2)}% capped at €{spainNormalConfig[taxYears.spainNormal].socialSecurityCap?.toLocaleString()}/year</p>
              <p><strong>Foreign property income:</strong> {inputs.foreignPropertyEnabled && inputs.spainResident && inputs.treatAsForeignSource ? 'Included in worldwide income' : 'Not included'}</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="beckham">
          <AccordionTrigger className="text-sm">🇪🇸 Spain Beckham Law</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Tax year:</strong> {taxYears.spainBeckham}</p>
              <p><strong>Flat rate:</strong> {(spainBeckhamConfig[taxYears.spainBeckham].beckhamFlatRate! * 100)}% on employment income up to €{spainBeckhamConfig[taxYears.spainBeckham].beckhamThreshold?.toLocaleString()}</p>
              <p><strong>Above threshold:</strong> {(spainBeckhamConfig[taxYears.spainBeckham].beckhamUpperRate! * 100)}%</p>
              <p><strong>Foreign income:</strong> Generally exempt from Spanish tax under this regime. Foreign-source property income is typically not taxed in Spain.</p>
              <p><strong>No personal allowance or deductions</strong> — flat rate applied to gross employment income.</p>
              <p><strong>Social security:</strong> Same employee rates as normal regime.</p>
              <p><strong>Eligibility:</strong> {inputs.beckhamEligible ? 'Assumed eligible and opted in' : 'Not eligible / not opted in'}</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="autonomo">
          <AccordionTrigger className="text-sm">🇪🇸 Spain Autónomo (Freelancer)</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Tax year:</strong> {taxYears.spainAutonomo}</p>
              <p><strong>Expense deduction rate:</strong> {inputs.expenseDeductionRate}% (flat, user-configurable)</p>
              <p><strong>IRPF:</strong> Same progressive bands as normal regime, applied to net profit (gross minus expenses minus cuota).</p>
              <p><strong>Personal minimum:</strong> €{spainAutonomoConfig[taxYears.spainAutonomo].personalMinimum?.toLocaleString()}</p>
              <p><strong>General deduction:</strong> €{spainAutonomoConfig[taxYears.spainAutonomo].generalDeduction?.toLocaleString()}</p>
              <p><strong>Cuota de autónomo (2025):</strong> Progressive system based on net monthly income. No employer SS contributions.</p>
              <ul className="list-disc ml-4 max-h-40 overflow-y-auto">
                {spainAutonomoConfig[taxYears.spainAutonomo].autonomoTramos?.map((t, i) => (
                  <li key={i}>
                    €{t.minMonthly.toLocaleString()} – {t.maxMonthly !== null ? `€${t.maxMonthly.toLocaleString()}` : '∞'}/mo → €{t.cuota}/mo
                  </li>
                ))}
              </ul>
              <p><strong>Foreign property income:</strong> {inputs.foreignPropertyEnabled && inputs.spainResident && inputs.treatAsForeignSource ? 'Included in worldwide income' : 'Not included'}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Exchange rate & disclaimer */}
      <div className="text-xs text-muted-foreground space-y-2 pt-4 border-t border-border">
        <p><strong>Exchange rate:</strong> 1 GBP = {inputs.exchangeRate} EUR — manual input by user.</p>
        <p className="italic">
          ⚠️ Disclaimer: These are estimates only, not tax advice. Tax rules vary by autonomous community, personal circumstances, and may change. 
          Consult a qualified tax professional for your specific situation.
        </p>
      </div>
    </div>
  );
}
