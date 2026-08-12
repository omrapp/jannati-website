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
      brands: {
        Row: {
          id: string;
          slug: string;
          name_en: string;
          name_ar: string | null;
          description_ar: string | null;
          description_en: string | null;
          logo_path: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_en: string;
          name_ar?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          logo_path?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['brands']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          parent_id: string | null;
          name_ar: string;
          name_en: string | null;
          description_ar: string | null;
          description_en: string | null;
          image_path: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          parent_id?: string | null;
          name_ar: string;
          name_en?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          image_path?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          handle: string;
          brand_id: string | null;
          name_ar: string;
          name_en: string | null;
          description_ar: string | null;
          description_en: string | null;
          en_translation_status: Database['public']['Enums']['translation_status'];
          status: Database['public']['Enums']['product_status'];
          is_new: boolean;
          published_at: string | null;
          sort_order: number;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          handle: string;
          brand_id?: string | null;
          name_ar: string;
          name_en?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          en_translation_status?: Database['public']['Enums']['translation_status'];
          status?: Database['public']['Enums']['product_status'];
          is_new?: boolean;
          published_at?: string | null;
          sort_order?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      product_categories: {
        Row: { product_id: string; category_id: string; position: number };
        Insert: { product_id: string; category_id: string; position?: number };
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string | null;
          barcode: string | null;
          title_ar: string | null;
          title_en: string | null;
          /** OMR minor units (baisa). */
          base_price_minor: number;
          compare_at_minor: number | null;
          stock_qty: number;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku?: string | null;
          barcode?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          base_price_minor: number;
          compare_at_minor?: number | null;
          stock_qty?: number;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>;
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          storage_path: string;
          alt_ar: string | null;
          alt_en: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          storage_path: string;
          alt_ar?: string | null;
          alt_en?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_images']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      product_status: 'draft' | 'active' | 'archived';
      translation_status: 'missing' | 'machine' | 'human';
    };
    CompositeTypes: Record<never, never>;
  };
};
