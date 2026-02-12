import type { TaxDocumentsData } from '@/types/tax';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatEUR(amount: number): string {
  return `€${Math.round(amount).toLocaleString()}`;
}

interface SpainBeckhamFormSummaryProps {
  data: TaxDocumentsData;
}

export default function SpainBeckhamFormSummary({ data }: SpainBeckhamFormSummaryProps) {
  const { modelo151 } = data;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Spain Beckham Law – Modelo 151</h3>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Modelo 149 – Application (one-time)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Apply within 6 months of Spanish Social Security registration.
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Modelo 149 is the application form for the Beckham Law regime. Submit electronically via
            the Spanish Tax Agency (Agencia Tributaria) with supporting documentation.
          </p>
        </CardContent>
      </Card>

      {modelo151 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Modelo 151 – Annual Return</CardTitle>
            <p className="text-sm text-muted-foreground">File in June each year under special regime</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Spanish employment income</span>
              <span className="font-mono">{formatEUR(modelo151.spanishIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>IRPF (24% flat)</span>
              <span className="font-mono">{formatEUR(modelo151.tax24)}</span>
            </div>
            <div className="flex justify-between">
              <span>Social security</span>
              <span className="font-mono">{formatEUR(modelo151.socialSecurity)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
