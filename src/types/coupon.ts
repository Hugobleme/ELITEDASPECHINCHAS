export interface CouponItem {
  id: string;
  store: string;
  store_slug: string;
  discount_text: string; // Ex: "10% OFF", "25% OFF", "R$Grátis OFF"
  rule_text: string;     // Ex: "Em todo o site", "Compras acima de R$ 150"
  code: string;          // Ex: "MELI10", "AMAZON10", "SUPER25"
  affiliate_url: string;
  category?: string;
  verified?: boolean;
  expires_at?: string;
  description?: string;
}
