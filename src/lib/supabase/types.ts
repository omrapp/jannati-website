/**
 * Database types.
 *
 * Regenerate after every migration with:
 *   npm run db:types
 *
 * Hand-written until the local stack is first started; the generator overwrites
 * this file wholesale.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      countries: {
        Row: {
          code: string;
          name_ar: string;
          name_en: string;
          currency: string;
          currency_exponent: number;
          fx_rate_from_omr: number;
          rounding_step_minor: number;
          vat_rate: number;
          shipping_flat_minor: number;
          free_shipping_threshold_minor: number | null;
          enabled: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          name_ar: string;
          name_en: string;
          currency: string;
          currency_exponent: number;
          fx_rate_from_omr: number;
          rounding_step_minor?: number;
          vat_rate?: number;
          shipping_flat_minor?: number;
          free_shipping_threshold_minor?: number | null;
          enabled?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['countries']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
