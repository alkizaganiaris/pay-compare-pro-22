import { TaxInputs, Currency } from '@/types/tax';
import { propertyCountries, availableTaxYears } from '@/data/taxConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, Building2, Briefcase, Home } from 'lucide-react';

interface InputPanelProps {
  inputs: TaxInputs;
  onChange: (inputs: TaxInputs) => void;
  onReset: () => void;
  taxYear: string;
  onTaxYearChange: (year: string) => void;
}

function CurrencySelect({ value, onChange }: { value: Currency; onChange: (v: Currency) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Currency)}>
      <SelectTrigger className="w-20">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="EUR">€</SelectItem>
        <SelectItem value="GBP">£</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function InputPanel({ inputs, onChange, onReset, taxYear, onTaxYearChange }: InputPanelProps) {
  const update = (partial: Partial<TaxInputs>) => onChange({ ...inputs, ...partial });

  return (
    <div className="space-y-4">
      {/* Tax Year (global for all scenarios) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-lg">📅</span> Tax Year
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label className="w-24 shrink-0 text-xs">Year</Label>
            <Select value={taxYear} onValueChange={onTaxYearChange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTaxYears.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Applied across all scenarios</p>
        </CardContent>
      </Card>

      {/* Regime Toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">🇬🇧 UK Tax Resident</Label>
            <Switch checked={inputs.includeUkNi} onCheckedChange={(v) => update({ includeUkNi: v })} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Label className="text-sm">🇪🇸 Spanish Tax Resident - IRPF</Label>
            <Switch checked={inputs.includeSpainNormal} onCheckedChange={(v) => update({ includeSpainNormal: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">🇪🇸 Spanish Beckham's Law</Label>
            <Switch checked={inputs.includeSpainBeckham} onCheckedChange={(v) => update({ includeSpainBeckham: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">🇪🇸 Spanish Autónomo</Label>
            <Switch checked={inputs.includeSpainAutonomo} onCheckedChange={(v) => update({ includeSpainAutonomo: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Currency & Exchange */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-lg">💱</span> Currency & Exchange
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="w-28 shrink-0 text-xs">Base currency</Label>
            <CurrencySelect value={inputs.baseCurrency} onChange={(v) => update({ baseCurrency: v })} />
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-28 shrink-0 text-xs">1 GBP =</Label>
            <Input
              type="number"
              step="0.01"
              value={inputs.exchangeRate}
              onChange={(e) => update({ exchangeRate: parseFloat(e.target.value) || 0 })}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">EUR</span>
          </div>
        </CardContent>
      </Card>

      {/* Employment Income */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Employment Income
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Gross salary"
              value={inputs.grossSalary || ''}
              onChange={(e) => update({ grossSalary: parseFloat(e.target.value) || 0 })}
              className="flex-1"
            />
            <CurrencySelect value={inputs.salaryCurrency} onChange={(v) => update({ salaryCurrency: v })} />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="0"
              min={0}
              max={100}
              step={0.5}
              value={inputs.pensionContributionPercent ?? 0}
              onChange={(e) => update({ pensionContributionPercent: parseFloat(e.target.value) || 0 })}
              className="w-20"
            />
            <Label className="text-xs shrink-0">Pension % (salary sacrifice)</Label>
          </div>
          <p className="text-xs text-muted-foreground">Used for UK, Spain Normal & Beckham calculations. Pension reduces taxable gross.</p>
        </CardContent>
      </Card>

      {/* Freelance Income */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Freelance Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Gross annual revenue"
              value={inputs.freelanceRevenue || ''}
              onChange={(e) => update({ freelanceRevenue: parseFloat(e.target.value) || 0 })}
              className="flex-1"
            />
            <CurrencySelect value={inputs.freelanceCurrency} onChange={(v) => update({ freelanceCurrency: v })} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Expense deduction rate</Label>
              <span className="text-xs font-medium">{inputs.expenseDeductionRate}%</span>
            </div>
            <Slider
              value={[inputs.expenseDeductionRate]}
              onValueChange={([v]) => update({ expenseDeductionRate: v })}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
          {inputs.includeSpainAutonomo && (
            <div className="flex items-center gap-3">
              <Label className="text-xs w-28 shrink-0">Autónomo year</Label>
              <Select
                value={String(inputs.autonomoYear ?? 3)}
                onValueChange={(v) => update({ autonomoYear: Number(v) as 1 | 2 | 3 })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Year 1 (tarifa plana)</SelectItem>
                  <SelectItem value="2">Year 2</SelectItem>
                  <SelectItem value="3">Year 3+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Used for Spain Autónomo calculation</p>
        </CardContent>
      </Card>

      {/* Foreign Property Income */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" /> Foreign Property Income
            </CardTitle>
            <Switch
              checked={inputs.foreignPropertyEnabled}
              onCheckedChange={(v) => update({ foreignPropertyEnabled: v })}
            />
          </div>
        </CardHeader>
        {inputs.foreignPropertyEnabled && (
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-xs w-28 shrink-0">Property country</Label>
              <Select
                value={inputs.foreignPropertyCountry}
                onValueChange={(v) => {
                  update({
                    foreignPropertyCountry: v,
                    ...(v === 'UK' && { foreignPropertyMortgageInterestDeductiblePercent: 0 }),
                  });
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {propertyCountries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs w-28 shrink-0">Currency</Label>
              <CurrencySelect
                value={inputs.foreignPropertyCurrency}
                onChange={(v) => update({ foreignPropertyCurrency: v })}
              />
            </div>
            <p className="text-xs text-muted-foreground">Monthly figures</p>
            <div className="flex items-center gap-3">
              <Label className="text-xs w-28 shrink-0">Rental income</Label>
              <Input
                type="number"
                placeholder="0"
                value={inputs.foreignPropertyRentalIncome ?? ''}
                onChange={(e) => update({ foreignPropertyRentalIncome: parseFloat(e.target.value) || 0 })}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs w-28 shrink-0">Deductibles</Label>
              <Input
                type="number"
                placeholder="0"
                value={inputs.foreignPropertyDeductibles ?? ''}
                onChange={(e) => update({ foreignPropertyDeductibles: parseFloat(e.target.value) || 0 })}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs w-28 shrink-0">Mortgage interest</Label>
              <Input
                type="number"
                placeholder="0"
                value={inputs.foreignPropertyMortgageInterest ?? ''}
                onChange={(e) => update({ foreignPropertyMortgageInterest: parseFloat(e.target.value) || 0 })}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs w-28 shrink-0">Mortgage payment</Label>
              <Input
                type="number"
                placeholder="0"
                value={inputs.foreignPropertyMortgagePayment ?? ''}
                onChange={(e) => update({ foreignPropertyMortgagePayment: parseFloat(e.target.value) || 0 })}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs w-28 shrink-0">Mortgage interest deductible %</Label>
              <Input
                type="number"
                placeholder="0"
                min={0}
                max={100}
                step={1}
                value={
                  inputs.foreignPropertyCountry === 'UK' ? 0 :
                  (inputs.foreignPropertyCountry === 'Spain' || !inputs.treatAsForeignSource)
                    ? 100 : (inputs.foreignPropertyMortgageInterestDeductiblePercent ?? '')
                }
                onChange={(e) => update({ foreignPropertyMortgageInterestDeductiblePercent: parseFloat(e.target.value) || 0 })}
                disabled={inputs.foreignPropertyCountry === 'UK' || (inputs.foreignPropertyCountry === 'Spain' || !inputs.treatAsForeignSource)}
                className="w-24"
              />
            </div>
            {inputs.foreignPropertyCountry === 'UK' && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                UK (S24): Mortgage interest is not deductible from income; relief is via 20% tax credit instead.
              </p>
            )}
            {(inputs.foreignPropertyCountry === 'Spain' || !inputs.treatAsForeignSource) && inputs.foreignPropertyCountry !== 'UK' && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded p-2">
                Spain: Mortgage interest is fully deductible from rental income (Agencia Tributaria). Deductions capped at gross rental income.
              </p>
            )}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Treat as foreign-source income</Label>
              <Switch
                checked={inputs.treatAsForeignSource}
                onCheckedChange={(v) => update({ treatAsForeignSource: v })}
              />
            </div>
          </CardContent>
        )}
      </Card>

      <Button variant="outline" className="w-full" onClick={onReset}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset to defaults
      </Button>
    </div>
  );
}
