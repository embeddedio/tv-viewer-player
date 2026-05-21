/** Element de taux retourne par /api/widgets/tableau-change */
export interface ExchangeRate {
  code: string;
  label: string;
  unit: string;
  buy: string;
  sell: string;
  icon: string;
}

/** Element de taux retourne par /api/widgets/currency-bkam-ref */
export interface BkamRate {
  code: string;
  label: string;
  unit: string;
  bkamReference: string;
  bkamTpe: string;
  icon: string;
}

/** Element de taux retourne par /api/widgets/currency-ref */
export interface CombinedRate {
  code: string;
  label: string;
  unit: string;
  buy: string;
  sell: string;
  bkamReference: string;
  bkamTpe: string;
  icon: string;
}

