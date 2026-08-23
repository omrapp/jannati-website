export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          area: string | null
          city: string
          country_code: string
          created_at: string
          customer_id: string
          full_name: string
          id: string
          is_default: boolean
          line1: string
          phone: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          city: string
          country_code: string
          created_at?: string
          customer_id: string
          full_name: string
          id?: string
          is_default?: boolean
          line1: string
          phone: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          city?: string
          country_code?: string
          created_at?: string
          customer_id?: string
          full_name?: string
          id?: string
          is_default?: boolean
          line1?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_path: string
          link: string | null
          sort_order: number
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_path: string
          link?: string | null
          sort_order?: number
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_path?: string
          link?: string | null
          sort_order?: number
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          logo_path: string | null
          name_ar: string | null
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          logo_path?: string | null
          name_ar?: string | null
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          logo_path?: string | null
          name_ar?: string | null
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          qty: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          qty: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          qty?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          converted_at: string | null
          country_code: string
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          session_token: string | null
          updated_at: string
        }
        Insert: {
          converted_at?: string | null
          country_code: string
          created_at?: string
          currency: string
          customer_id?: string | null
          id?: string
          session_token?: string | null
          updated_at?: string
        }
        Update: {
          converted_at?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          session_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "carts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          image_path: string | null
          name_ar: string
          name_en: string | null
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_path?: string | null
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_path?: string | null
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      content_pages: {
        Row: {
          body_ar: string
          body_en: string | null
          created_at: string
          id: string
          published: boolean
          slug: string
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          body_ar: string
          body_en?: string | null
          created_at?: string
          id?: string
          published?: boolean
          slug: string
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          body_ar?: string
          body_en?: string | null
          created_at?: string
          id?: string
          published?: boolean
          slug?: string
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency: string
          currency_exponent: number
          enabled: boolean
          free_shipping_threshold_minor: number | null
          fx_rate_from_omr: number
          name_ar: string
          name_en: string
          rounding_step_minor: number
          shipping_flat_minor: number
          sort_order: number
          updated_at: string
          vat_rate: number
        }
        Insert: {
          code: string
          created_at?: string
          currency: string
          currency_exponent: number
          enabled?: boolean
          free_shipping_threshold_minor?: number | null
          fx_rate_from_omr: number
          name_ar: string
          name_en: string
          rounding_step_minor?: number
          shipping_flat_minor?: number
          sort_order?: number
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          currency_exponent?: number
          enabled?: boolean
          free_shipping_threshold_minor?: number | null
          fx_rate_from_omr?: number
          name_ar?: string
          name_en?: string
          rounding_step_minor?: number
          shipping_flat_minor?: number
          sort_order?: number
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          ends_at: string | null
          id: string
          min_order_minor: number | null
          per_user_limit: number | null
          starts_at: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          usage_limit: number | null
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          min_order_minor?: number | null
          per_user_limit?: number | null
          starts_at?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          min_order_minor?: number | null
          per_user_limit?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          default_locale: string
          id: string
          marketing_opt_in: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_locale?: string
          id: string
          marketing_opt_in?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_locale?: string
          id?: string
          marketing_opt_in?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total_minor: number
          name_snapshot: string
          order_id: string
          qty: number
          sku: string | null
          unit_price_minor: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_total_minor: number
          name_snapshot: string
          order_id: string
          qty: number
          sku?: string | null
          unit_price_minor: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_total_minor?: number
          name_snapshot?: string
          order_id?: string
          qty?: number
          sku?: string | null
          unit_price_minor?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          country_code: string
          coupon_code: string | null
          created_at: string
          currency: string
          customer_id: string | null
          discount_minor: number
          fulfilment_status: Database["public"]["Enums"]["fulfilment_status"]
          fx_rate_used: number
          guest_email: string | null
          guest_phone: string | null
          id: string
          locale: string
          order_number: string
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_address: Json
          shipping_minor: number
          subtotal_minor: number
          total_minor: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          vat_minor: number
        }
        Insert: {
          country_code: string
          coupon_code?: string | null
          created_at?: string
          currency: string
          customer_id?: string | null
          discount_minor?: number
          fulfilment_status?: Database["public"]["Enums"]["fulfilment_status"]
          fx_rate_used: number
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          locale?: string
          order_number: string
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address: Json
          shipping_minor?: number
          subtotal_minor: number
          total_minor: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vat_minor?: number
        }
        Update: {
          country_code?: string
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_minor?: number
          fulfilment_status?: Database["public"]["Enums"]["fulfilment_status"]
          fx_rate_used?: number
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          locale?: string
          order_number?: string
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json
          shipping_minor?: number
          subtotal_minor?: number
          total_minor?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vat_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          position: number
          product_id: string
        }
        Insert: {
          category_id: string
          position?: number
          product_id: string
        }
        Update: {
          category_id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_ar: string | null
          alt_en: string | null
          created_at: string
          id: string
          position: number
          product_id: string
          storage_path: string
          variant_id: string | null
        }
        Insert: {
          alt_ar?: string | null
          alt_en?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id: string
          storage_path: string
          variant_id?: string | null
        }
        Update: {
          alt_ar?: string | null
          alt_en?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          storage_path?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          base_price_minor: number
          compare_at_minor: number | null
          created_at: string
          id: string
          position: number
          product_id: string
          sku: string | null
          stock_qty: number
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          base_price_minor: number
          compare_at_minor?: number | null
          created_at?: string
          id?: string
          position?: number
          product_id: string
          sku?: string | null
          stock_qty?: number
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          base_price_minor?: number
          compare_at_minor?: number | null
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          sku?: string | null
          stock_qty?: number
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          en_translation_status: Database["public"]["Enums"]["translation_status"]
          handle: string
          id: string
          is_new: boolean
          name_ar: string
          name_en: string | null
          published_at: string | null
          search_ar: unknown
          search_en: unknown
          sort_order: number
          status: Database["public"]["Enums"]["product_status"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          en_translation_status?: Database["public"]["Enums"]["translation_status"]
          handle: string
          id?: string
          is_new?: boolean
          name_ar: string
          name_en?: string | null
          published_at?: string | null
          search_ar?: unknown
          search_en?: unknown
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          en_translation_status?: Database["public"]["Enums"]["translation_status"]
          handle?: string
          id?: string
          is_new?: boolean
          name_ar?: string
          name_en?: string | null
          published_at?: string | null
          search_ar?: unknown
          search_en?: unknown
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          created_at: string
          customer_id: string
          id: string
          product_id: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          address_ar: string | null
          address_en: string | null
          email: string | null
          facebook_url: string | null
          id: boolean
          instagram_url: string | null
          legal_entity_name_ar: string | null
          legal_entity_name_en: string | null
          map_lat: number | null
          map_lng: number | null
          phone: string | null
          registration_number: string | null
          tiktok_url: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_show: boolean
          x_url: string | null
          youtube_url: string | null
        }
        Insert: {
          address_ar?: string | null
          address_en?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: boolean
          instagram_url?: string | null
          legal_entity_name_ar?: string | null
          legal_entity_name_en?: string | null
          map_lat?: number | null
          map_lng?: number | null
          phone?: string | null
          registration_number?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_show?: boolean
          x_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          address_ar?: string | null
          address_en?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: boolean
          instagram_url?: string | null
          legal_entity_name_ar?: string | null
          legal_entity_name_en?: string | null
          map_lat?: number | null
          map_lng?: number | null
          phone?: string | null
          registration_number?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_show?: boolean
          x_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: {
          p_cart_id: string
          p_country_code: string
          p_coupon_code: string
          p_currency: string
          p_customer_id: string
          p_discount_minor: number
          p_fx_rate_used: number
          p_guest_email: string
          p_guest_phone: string
          p_items: Json
          p_locale?: string
          p_order_number: string
          p_payment_provider: Database["public"]["Enums"]["payment_provider"]
          p_shipping_address: Json
          p_shipping_minor: number
          p_subtotal_minor: number
          p_total_minor: number
          p_vat_minor: number
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      mark_fulfilment_status: {
        Args: {
          p_created_by: string
          p_note: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["fulfilment_status"]
        }
        Returns: boolean
      }
      mark_payment_status: {
        Args: {
          p_note: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: boolean
      }
      merge_guest_cart_into_customer: {
        Args: { p_customer_id: string; p_guest_session_token: string }
        Returns: undefined
      }
      search_products: {
        Args: { search_language: string; search_query: string }
        Returns: {
          handle: string
          rank: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      coupon_type: "percent" | "fixed"
      fulfilment_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_provider: "thawani" | "tap" | "cod"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      product_status: "draft" | "active" | "archived"
      review_status: "pending" | "approved" | "rejected"
      translation_status: "missing" | "machine" | "human"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      coupon_type: ["percent", "fixed"],
      fulfilment_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_provider: ["thawani", "tap", "cod"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      product_status: ["draft", "active", "archived"],
      review_status: ["pending", "approved", "rejected"],
      translation_status: ["missing", "machine", "human"],
    },
  },
} as const
