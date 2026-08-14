export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          id: string;
          logo_path: string | null;
          name_ar: string | null;
          name_en: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          logo_path?: string | null;
          name_ar?: string | null;
          name_en: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          logo_path?: string | null;
          name_ar?: string | null;
          name_en?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          cart_id: string;
          created_at: string;
          qty: number;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          cart_id: string;
          created_at?: string;
          qty: number;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          cart_id?: string;
          created_at?: string;
          qty?: number;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cart_items_cart_id_fkey';
            columns: ['cart_id'];
            isOneToOne: false;
            referencedRelation: 'carts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cart_items_variant_id_fkey';
            columns: ['variant_id'];
            isOneToOne: false;
            referencedRelation: 'product_variants';
            referencedColumns: ['id'];
          },
        ];
      };
      carts: {
        Row: {
          converted_at: string | null;
          country_code: string;
          created_at: string;
          currency: string;
          customer_id: string | null;
          id: string;
          session_token: string | null;
          updated_at: string;
        };
        Insert: {
          converted_at?: string | null;
          country_code: string;
          created_at?: string;
          currency: string;
          customer_id?: string | null;
          id?: string;
          session_token?: string | null;
          updated_at?: string;
        };
        Update: {
          converted_at?: string | null;
          country_code?: string;
          created_at?: string;
          currency?: string;
          customer_id?: string | null;
          id?: string;
          session_token?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'carts_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'carts_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          id: string;
          image_path: string | null;
          name_ar: string;
          name_en: string | null;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          image_path?: string | null;
          name_ar: string;
          name_en?: string | null;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          image_path?: string | null;
          name_ar?: string;
          name_en?: string | null;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      countries: {
        Row: {
          code: string;
          created_at: string;
          currency: string;
          currency_exponent: number;
          enabled: boolean;
          free_shipping_threshold_minor: number | null;
          fx_rate_from_omr: number;
          name_ar: string;
          name_en: string;
          rounding_step_minor: number;
          shipping_flat_minor: number;
          sort_order: number;
          updated_at: string;
          vat_rate: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          currency: string;
          currency_exponent: number;
          enabled?: boolean;
          free_shipping_threshold_minor?: number | null;
          fx_rate_from_omr: number;
          name_ar: string;
          name_en: string;
          rounding_step_minor?: number;
          shipping_flat_minor?: number;
          sort_order?: number;
          updated_at?: string;
          vat_rate?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          currency?: string;
          currency_exponent?: number;
          enabled?: boolean;
          free_shipping_threshold_minor?: number | null;
          fx_rate_from_omr?: number;
          name_ar?: string;
          name_en?: string;
          rounding_step_minor?: number;
          shipping_flat_minor?: number;
          sort_order?: number;
          updated_at?: string;
          vat_rate?: number;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          created_at: string;
          default_locale: string;
          id: string;
          marketing_opt_in: boolean;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_locale?: string;
          id: string;
          marketing_opt_in?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_locale?: string;
          id?: string;
          marketing_opt_in?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          category_id: string;
          position: number;
          product_id: string;
        };
        Insert: {
          category_id: string;
          position?: number;
          product_id: string;
        };
        Update: {
          category_id?: string;
          position?: number;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_categories_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_categories_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      product_images: {
        Row: {
          alt_ar: string | null;
          alt_en: string | null;
          created_at: string;
          id: string;
          position: number;
          product_id: string;
          storage_path: string;
          variant_id: string | null;
        };
        Insert: {
          alt_ar?: string | null;
          alt_en?: string | null;
          created_at?: string;
          id?: string;
          position?: number;
          product_id: string;
          storage_path: string;
          variant_id?: string | null;
        };
        Update: {
          alt_ar?: string | null;
          alt_en?: string | null;
          created_at?: string;
          id?: string;
          position?: number;
          product_id?: string;
          storage_path?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_images_variant_id_fkey';
            columns: ['variant_id'];
            isOneToOne: false;
            referencedRelation: 'product_variants';
            referencedColumns: ['id'];
          },
        ];
      };
      product_variants: {
        Row: {
          barcode: string | null;
          base_price_minor: number;
          compare_at_minor: number | null;
          created_at: string;
          id: string;
          position: number;
          product_id: string;
          sku: string | null;
          stock_qty: number;
          title_ar: string | null;
          title_en: string | null;
          updated_at: string;
        };
        Insert: {
          barcode?: string | null;
          base_price_minor: number;
          compare_at_minor?: number | null;
          created_at?: string;
          id?: string;
          position?: number;
          product_id: string;
          sku?: string | null;
          stock_qty?: number;
          title_ar?: string | null;
          title_en?: string | null;
          updated_at?: string;
        };
        Update: {
          barcode?: string | null;
          base_price_minor?: number;
          compare_at_minor?: number | null;
          created_at?: string;
          id?: string;
          position?: number;
          product_id?: string;
          sku?: string | null;
          stock_qty?: number;
          title_ar?: string | null;
          title_en?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          brand_id: string | null;
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          en_translation_status: Database['public']['Enums']['translation_status'];
          handle: string;
          id: string;
          is_new: boolean;
          name_ar: string;
          name_en: string | null;
          published_at: string | null;
          sort_order: number;
          status: Database['public']['Enums']['product_status'];
          tags: string[];
          updated_at: string;
        };
        Insert: {
          brand_id?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          en_translation_status?: Database['public']['Enums']['translation_status'];
          handle: string;
          id?: string;
          is_new?: boolean;
          name_ar: string;
          name_en?: string | null;
          published_at?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['product_status'];
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          brand_id?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          en_translation_status?: Database['public']['Enums']['translation_status'];
          handle?: string;
          id?: string;
          is_new?: boolean;
          name_ar?: string;
          name_en?: string | null;
          published_at?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['product_status'];
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_brand_id_fkey';
            columns: ['brand_id'];
            isOneToOne: false;
            referencedRelation: 'brands';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      product_status: 'draft' | 'active' | 'archived';
      translation_status: 'missing' | 'machine' | 'human';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      product_status: ['draft', 'active', 'archived'],
      translation_status: ['missing', 'machine', 'human'],
    },
  },
} as const;
