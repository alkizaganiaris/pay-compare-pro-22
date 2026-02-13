import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ukTaxConfig, spainNormalConfig, spainBeckhamConfig, spainAutonomoConfig, SMI_MONTHLY } from '@/data/taxConfig';
import { TaxInputs } from '@/types/tax';

interface AssumptionsPanelProps {
  inputs: TaxInputs;
  taxYear: string;
  taxYears: { uk: string; spainNormal: string; spainBeckham: string; spainAutonomo: string };
}

export default function AssumptionsPanel({ inputs, taxYear, taxYears }: AssumptionsPanelProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm font-medium">Tax year <strong>{taxYear}</strong> applied across all scenarios (UK: {taxYears.uk}, Spain: {taxYear})</p>

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
              <p><strong>Foreign property income:</strong> {inputs.foreignPropertyEnabled ? (inputs.foreignPropertyCountry === 'UK' ? 'Included — S24 applies for UK properties (20% credit on mortgage interest)' : 'Included — taxed at marginal rate') : 'Not included'}</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="spain-normal">
          <AccordionTrigger className="text-sm">🇪🇸 Spain Normal (Employed)</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Region:</strong> Barcelona (Catalonia) assumed</p>
              <p><strong>Tax year:</strong> {taxYears.spainNormal}</p>
              <p><strong>Personal minimum:</strong> €{spainNormalConfig[taxYears.spainNormal].personalMinimum?.toLocaleString()}</p>
              <p><strong>General deduction:</strong> €{spainNormalConfig[taxYears.spainNormal].generalDeduction?.toLocaleString()}</p>
              <p><strong>IRPF bands (Barcelona / Catalonia):</strong></p>
              <ul className="list-disc ml-4">
                {spainNormalConfig[taxYears.spainNormal].bands.map((b, i) => (
                  <li key={i}>
                    €{b.from.toLocaleString()} – {b.to !== null ? `€${b.to.toLocaleString()}` : '∞'}: {(b.rate * 100)}%
                  </li>
                ))}
              </ul>
              <p><strong>Employee social security:</strong> {(spainNormalConfig[taxYears.spainNormal].socialSecurityRate! * 100).toFixed(2)}% capped at €{spainNormalConfig[taxYears.spainNormal].socialSecurityCap?.toLocaleString()}/year</p>
              <p><strong>Foreign property income:</strong> {inputs.foreignPropertyEnabled && (inputs.treatAsForeignSource || inputs.foreignPropertyCountry === 'Spain') ? 'Included in worldwide income (foreign or domestic Spain)' : 'Not included'}</p>
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
              <p><strong>UK property:</strong> Always foreign-source and exempt from Spanish tax. UK property is taxed in the UK (NRL).</p>
              <p><strong>Foreign income:</strong> Generally exempt from Spanish tax under this regime. Foreign-source property income is typically not taxed in Spain.</p>
              <p><strong>Spanish rental:</strong> Treated as Spanish-source; deductions (mortgage interest, IBI, etc.) allowed per July 2025 ruling for non-EU residents.</p>
              <p><strong>No personal allowance or deductions</strong> — flat rate applied to gross employment income.</p>
              <p><strong>Social security:</strong> Same employee rates as normal regime.</p>
              <p><strong>Eligibility:</strong> Assumed eligible and opted in. Beckham Law applies to new Spanish residents in the first 6 years. Foreign income exceeding 15% of total may affect eligibility.</p>
              <p><strong>Main residence imputed income:</strong> TEAC July 2024 — owner-occupied Spanish main residence may have imputed income (2% of cadastral value) taxable at 24%. Not included here (rental property only).</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="autonomo">
          <AccordionTrigger className="text-sm">🇪🇸 Spain Autónomo (Freelancer)</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Region:</strong> Barcelona (Catalonia) assumed</p>
              <p><strong>Tax year:</strong> {taxYears.spainAutonomo}</p>
              <p><strong>Expense deduction rate:</strong> {inputs.expenseDeductionRate}% (flat, user-configurable)</p>
              <p><strong>Pension sacrifice:</strong> {(inputs.freelancePensionContributionPercent ?? 0) > 0 ? `${inputs.freelancePensionContributionPercent}% of gross (reduces taxable base)` : 'None'}</p>
              <p><strong>IRPF:</strong> Same Barcelona (Catalonia) bands as normal regime, applied to net profit (gross minus expenses minus pension minus cuota).</p>
              <p><strong>Personal minimum:</strong> €{spainAutonomoConfig[taxYears.spainAutonomo].personalMinimum?.toLocaleString()}</p>
              <p><strong>General deduction:</strong> €{spainAutonomoConfig[taxYears.spainAutonomo].generalDeduction?.toLocaleString()}</p>
              <p><strong>Cuota de autónomo:</strong></p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li><strong>Year 1:</strong> €80/month (tarifa plana) — first 12 months</li>
                <li><strong>Year 2:</strong> €80/month if net income below SMI (€{SMI_MONTHLY[taxYears.spainAutonomo]?.toLocaleString() ?? '1,184'}/mo), otherwise full tramo</li>
                <li><strong>Year 3+:</strong> Progressive tramos based on net monthly income</li>
              </ul>
              <p><strong>Tramos (Year 3+):</strong></p>
              <ul className="list-disc ml-4 max-h-40 overflow-y-auto">
                {spainAutonomoConfig[taxYears.spainAutonomo].autonomoTramos?.map((t, i) => (
                  <li key={i}>
                    €{t.minMonthly.toLocaleString()} – {t.maxMonthly !== null ? `€${t.maxMonthly.toLocaleString()}` : '∞'}/mo → €{t.cuota}/mo
                  </li>
                ))}
              </ul>
              <p><strong>Foreign property income:</strong> {inputs.foreignPropertyEnabled && (inputs.treatAsForeignSource || inputs.foreignPropertyCountry === 'Spain') ? 'Included in worldwide income (foreign or domestic Spain)' : 'Not included'}</p>
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
