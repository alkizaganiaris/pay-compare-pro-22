import { TaxInputs, Currency } from '@/types/tax';
import { propertyCountries } from '@/data/taxConfig';
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

export default function InputPanel({ inputs, onChange, onReset }: InputPanelProps) {
  const update = (partial: Partial<TaxInputs>) => onChange({ ...inputs, ...partial });

  return (
    <div className="space-y-4">
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
          <p className="text-xs text-muted-foreground">Used for UK, Spain Normal & Beckham calculations</p>
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
          <p className="text-xs text-muted-foreground">Used for Spain Autónomo calculation</p>
        </CardContent>
      </Card>

      {/* Regime Toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">🇬🇧 UK Employed</Label>
            <Switch checked={inputs.includeUkNi} onCheckedChange={(v) => update({ includeUkNi: v })} />
          </div>
          <p className="text-xs text-muted-foreground -mt-1 ml-6">Include employee NI</p>

          <Separator />

          <div className="flex items-center justify-between">
            <Label className="text-sm">🇪🇸 Spain Normal</Label>
            <Switch checked={inputs.includeSpainNormal} onCheckedChange={(v) => update({ includeSpainNormal: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">🇪🇸 Spain Beckham</Label>
            <Switch checked={inputs.includeSpainBeckham} onCheckedChange={(v) => update({ includeSpainBeckham: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">🇪🇸 Spain Autónomo</Label>
            <Switch checked={inputs.includeSpainAutonomo} onCheckedChange={(v) => update({ includeSpainAutonomo: v })} />
          </div>
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
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Net rental income"
                value={inputs.foreignPropertyIncome || ''}
                onChange={(e) => update({ foreignPropertyIncome: parseFloat(e.target.value) || 0 })}
                className="flex-1"
              />
              <CurrencySelect
                value={inputs.foreignPropertyCurrency}
                onChange={(v) => update({ foreignPropertyCurrency: v })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs w-28 shrink-0">Property country</Label>
              <Select
                value={inputs.foreignPropertyCountry}
                onValueChange={(v) => update({ foreignPropertyCountry: v })}
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
            <div className="flex items-center justify-between">
              <Label className="text-xs">Treat as foreign-source income</Label>
              <Switch
                checked={inputs.treatAsForeignSource}
                onCheckedChange={(v) => update({ treatAsForeignSource: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Expenses already netted</Label>
              <Switch
                checked={inputs.expensesAlreadyNetted}
                onCheckedChange={(v) => update({ expensesAlreadyNetted: v })}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Residency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Residency Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">UK tax resident</Label>
            <Switch checked={inputs.ukResident} onCheckedChange={(v) => update({ ukResident: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Spain tax resident</Label>
            <Switch checked={inputs.spainResident} onCheckedChange={(v) => update({ spainResident: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Beckham eligible & opted in</Label>
            <Switch checked={inputs.beckhamEligible} onCheckedChange={(v) => update({ beckhamEligible: v })} />
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={onReset}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset to defaults
      </Button>
    </div>
  );
}
