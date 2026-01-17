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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          dismissed_at: string | null
          dismissed_by_admin_id: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          metadata: Json | null
          notification_id: string
          read_at: string | null
          severity: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          dismissed_by_admin_id?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          metadata?: Json | null
          notification_id?: string
          read_at?: string | null
          severity?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          dismissed_by_admin_id?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          metadata?: Json | null
          notification_id?: string
          read_at?: string | null
          severity?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_dismissed_by_admin_id_fkey"
            columns: ["dismissed_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          dob: string | null
          email: string
          force_password_reset: boolean
          full_name: string
          id: string
          last_login_at: string | null
          phone: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dob?: string | null
          email: string
          force_password_reset?: boolean
          full_name: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dob?: string | null
          email?: string
          force_password_reset?: boolean
          full_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at: string
          event_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          event_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          event_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      bitcard_activation_events: {
        Row: {
          activated_by_merchant_user_id: string
          activation_method: Database["public"]["Enums"]["activation_method"]
          bitcard_id: string
          created_at: string
          id: string
          merchant_id: string
          usd_value: number
        }
        Insert: {
          activated_by_merchant_user_id: string
          activation_method?: Database["public"]["Enums"]["activation_method"]
          bitcard_id: string
          created_at?: string
          id?: string
          merchant_id: string
          usd_value: number
        }
        Update: {
          activated_by_merchant_user_id?: string
          activation_method?: Database["public"]["Enums"]["activation_method"]
          bitcard_id?: string
          created_at?: string
          id?: string
          merchant_id?: string
          usd_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "bitcard_activation_events_activated_by_merchant_user_id_fkey"
            columns: ["activated_by_merchant_user_id"]
            isOneToOne: false
            referencedRelation: "merchant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitcard_activation_events_bitcard_id_fkey"
            columns: ["bitcard_id"]
            isOneToOne: false
            referencedRelation: "bitcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitcard_activation_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      bitcard_pin_attempts: {
        Row: {
          attempted_at: string
          attempted_by_merchant_user_id: string
          bitcard_id: string | null
          id: string
          merchant_id: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          attempted_by_merchant_user_id: string
          bitcard_id?: string | null
          id?: string
          merchant_id: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          attempted_by_merchant_user_id?: string
          bitcard_id?: string | null
          id?: string
          merchant_id?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bitcard_pin_attempts_attempted_by_merchant_user_id_fkey"
            columns: ["attempted_by_merchant_user_id"]
            isOneToOne: false
            referencedRelation: "merchant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitcard_pin_attempts_bitcard_id_fkey"
            columns: ["bitcard_id"]
            isOneToOne: false
            referencedRelation: "bitcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitcard_pin_attempts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      bitcards: {
        Row: {
          activated_at: string | null
          activated_by_merchant_user_id: string | null
          bitcard_id: string
          created_at: string
          id: string
          issued_at: string
          merchant_id: string | null
          pin_hash: string | null
          pin_required: boolean
          redeemed_at: string | null
          status: Database["public"]["Enums"]["bitcard_status"]
          usd_value: number | null
        }
        Insert: {
          activated_at?: string | null
          activated_by_merchant_user_id?: string | null
          bitcard_id: string
          created_at?: string
          id?: string
          issued_at?: string
          merchant_id?: string | null
          pin_hash?: string | null
          pin_required?: boolean
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["bitcard_status"]
          usd_value?: number | null
        }
        Update: {
          activated_at?: string | null
          activated_by_merchant_user_id?: string | null
          bitcard_id?: string
          created_at?: string
          id?: string
          issued_at?: string
          merchant_id?: string | null
          pin_hash?: string | null
          pin_required?: boolean
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["bitcard_status"]
          usd_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bitcards_activated_by_merchant_user_id_fkey"
            columns: ["activated_by_merchant_user_id"]
            isOneToOne: false
            referencedRelation: "merchant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitcards_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      card_orders: {
        Row: {
          created_at: string
          created_by_merchant_user_id: string | null
          id: string
          merchant_id: string
          product_id: string
          quantity: number
          shipping_address_line1: string
          shipping_address_line2: string | null
          shipping_city: string
          shipping_country: string
          shipping_name: string
          shipping_phone: string
          shipping_state: string
          shipping_zip: string
          status: Database["public"]["Enums"]["card_order_status"]
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_merchant_user_id?: string | null
          id?: string
          merchant_id: string
          product_id: string
          quantity?: number
          shipping_address_line1: string
          shipping_address_line2?: string | null
          shipping_city: string
          shipping_country?: string
          shipping_name: string
          shipping_phone: string
          shipping_state: string
          shipping_zip: string
          status?: Database["public"]["Enums"]["card_order_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_merchant_user_id?: string | null
          id?: string
          merchant_id?: string
          product_id?: string
          quantity?: number
          shipping_address_line1?: string
          shipping_address_line2?: string | null
          shipping_city?: string
          shipping_country?: string
          shipping_name?: string
          shipping_phone?: string
          shipping_state?: string
          shipping_zip?: string
          status?: Database["public"]["Enums"]["card_order_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_orders_created_by_merchant_user_id_fkey"
            columns: ["created_by_merchant_user_id"]
            isOneToOne: false
            referencedRelation: "merchant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "card_products"
            referencedColumns: ["id"]
          },
        ]
      }
      card_products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          notes: string | null
          pack_size: number
          price_usd: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          pack_size?: number
          price_usd: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          pack_size?: number
          price_usd?: number
        }
        Relationships: []
      }
      cashout_orders: {
        Row: {
          bank_account_id: string
          completed_at: string | null
          conversion_rate: number | null
          created_at: string
          estimated_arrival: string | null
          failed_reason: string | null
          fee_usd: number
          id: string
          order_id: string
          plaid_transfer_id: string | null
          source_amount: number
          source_asset: string
          status: string
          updated_at: string
          usd_amount: number
          user_id: string
        }
        Insert: {
          bank_account_id: string
          completed_at?: string | null
          conversion_rate?: number | null
          created_at?: string
          estimated_arrival?: string | null
          failed_reason?: string | null
          fee_usd?: number
          id?: string
          order_id?: string
          plaid_transfer_id?: string | null
          source_amount: number
          source_asset: string
          status?: string
          updated_at?: string
          usd_amount: number
          user_id: string
        }
        Update: {
          bank_account_id?: string
          completed_at?: string | null
          conversion_rate?: number | null
          created_at?: string
          estimated_arrival?: string | null
          failed_reason?: string | null
          fee_usd?: number
          id?: string
          order_id?: string
          plaid_transfer_id?: string | null
          source_amount?: number
          source_asset?: string
          status?: string
          updated_at?: string
          usd_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashout_orders_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "user_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashout_orders_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "user_bank_accounts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_ledger: {
        Row: {
          activated_at: string
          activation_fee_usd: number
          bitcard_id: string | null
          card_value_usd: number
          coinedge_revenue_usd: number
          commission_id: string
          created_at: string
          id: string
          merchant_id: string | null
          rep_commission_usd: number
          rep_id: string | null
          status: Database["public"]["Enums"]["commission_status"]
        }
        Insert: {
          activated_at?: string
          activation_fee_usd: number
          bitcard_id?: string | null
          card_value_usd: number
          coinedge_revenue_usd: number
          commission_id: string
          created_at?: string
          id?: string
          merchant_id?: string | null
          rep_commission_usd: number
          rep_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Update: {
          activated_at?: string
          activation_fee_usd?: number
          bitcard_id?: string | null
          card_value_usd?: number
          coinedge_revenue_usd?: number
          commission_id?: string
          created_at?: string
          id?: string
          merchant_id?: string | null
          rep_commission_usd?: number
          rep_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_bitcard_id_fkey"
            columns: ["bitcard_id"]
            isOneToOne: false
            referencedRelation: "bitcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      company_usdc_balance: {
        Row: {
          balance_usdc: number
          id: string
          last_updated_at: string
          updated_by_admin_id: string | null
        }
        Insert: {
          balance_usdc?: number
          id?: string
          last_updated_at?: string
          updated_by_admin_id?: string | null
        }
        Update: {
          balance_usdc?: number
          id?: string
          last_updated_at?: string
          updated_by_admin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_usdc_balance_updated_by_admin_id_fkey"
            columns: ["updated_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_usdc_ledger: {
        Row: {
          amount_usdc: number
          created_at: string
          created_by_admin_id: string | null
          id: string
          notes: string | null
          reference: string | null
          type: string
        }
        Insert: {
          amount_usdc: number
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          notes?: string | null
          reference?: string | null
          type: string
        }
        Update: {
          amount_usdc?: number
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          notes?: string | null
          reference?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_usdc_ledger_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_swap_orders: {
        Row: {
          btc_amount: number
          btc_price_at_order: number
          completed_at: string | null
          created_at: string
          customer_id: string
          destination_address: string | null
          failed_reason: string | null
          fee_usdc: number
          id: string
          inventory_allocated: boolean | null
          order_id: string
          order_type: Database["public"]["Enums"]["swap_order_type"]
          source_usdc_address: string | null
          status: Database["public"]["Enums"]["swap_order_status"]
          tx_hash: string | null
          updated_at: string
          usdc_amount: number
        }
        Insert: {
          btc_amount: number
          btc_price_at_order: number
          completed_at?: string | null
          created_at?: string
          customer_id: string
          destination_address?: string | null
          failed_reason?: string | null
          fee_usdc?: number
          id?: string
          inventory_allocated?: boolean | null
          order_id?: string
          order_type: Database["public"]["Enums"]["swap_order_type"]
          source_usdc_address?: string | null
          status?: Database["public"]["Enums"]["swap_order_status"]
          tx_hash?: string | null
          updated_at?: string
          usdc_amount: number
        }
        Update: {
          btc_amount?: number
          btc_price_at_order?: number
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          destination_address?: string | null
          failed_reason?: string | null
          fee_usdc?: number
          id?: string
          inventory_allocated?: boolean | null
          order_id?: string
          order_type?: Database["public"]["Enums"]["swap_order_type"]
          source_usdc_address?: string | null
          status?: Database["public"]["Enums"]["swap_order_status"]
          tx_hash?: string | null
          updated_at?: string
          usdc_amount?: number
        }
        Relationships: []
      }
      daily_btc_sends: {
        Row: {
          created_at: string
          id: string
          send_date: string
          total_btc_sent: number
          transaction_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          send_date?: string
          total_btc_sent?: number
          transaction_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          send_date?: string
          total_btc_sent?: number
          transaction_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      fulfillment_orders: {
        Row: {
          bitcard_id: string | null
          blocked_reason: string | null
          btc_amount: number | null
          btc_price_used: number | null
          created_at: string
          customer_id: string | null
          destination_wallet_address: string
          fireblocks_transfer_id: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_fulfillment_status"]
          merchant_id: string | null
          order_type: Database["public"]["Enums"]["fulfillment_order_type"]
          sales_rep_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["fulfillment_status"]
          tx_hash: string | null
          updated_at: string
          usd_value: number
        }
        Insert: {
          bitcard_id?: string | null
          blocked_reason?: string | null
          btc_amount?: number | null
          btc_price_used?: number | null
          created_at?: string
          customer_id?: string | null
          destination_wallet_address: string
          fireblocks_transfer_id?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_fulfillment_status"]
          merchant_id?: string | null
          order_type: Database["public"]["Enums"]["fulfillment_order_type"]
          sales_rep_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["fulfillment_status"]
          tx_hash?: string | null
          updated_at?: string
          usd_value: number
        }
        Update: {
          bitcard_id?: string | null
          blocked_reason?: string | null
          btc_amount?: number | null
          btc_price_used?: number | null
          created_at?: string
          customer_id?: string | null
          destination_wallet_address?: string
          fireblocks_transfer_id?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_fulfillment_status"]
          merchant_id?: string | null
          order_type?: Database["public"]["Enums"]["fulfillment_order_type"]
          sales_rep_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["fulfillment_status"]
          tx_hash?: string | null
          updated_at?: string
          usd_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_orders_bitcard_id_fkey"
            columns: ["bitcard_id"]
            isOneToOne: false
            referencedRelation: "bitcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_orders_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lots: {
        Row: {
          amount_btc_available: number
          amount_btc_total: number
          created_at: string
          created_by_admin_id: string | null
          eligible_at: string
          id: string
          notes: string | null
          received_at: string
          reference_id: string | null
          source: Database["public"]["Enums"]["inventory_source"]
          treasury_wallet_id: string
        }
        Insert: {
          amount_btc_available: number
          amount_btc_total: number
          created_at?: string
          created_by_admin_id?: string | null
          eligible_at: string
          id?: string
          notes?: string | null
          received_at?: string
          reference_id?: string | null
          source?: Database["public"]["Enums"]["inventory_source"]
          treasury_wallet_id: string
        }
        Update: {
          amount_btc_available?: number
          amount_btc_total?: number
          created_at?: string
          created_by_admin_id?: string | null
          eligible_at?: string
          id?: string
          notes?: string | null
          received_at?: string
          reference_id?: string | null
          source?: Database["public"]["Enums"]["inventory_source"]
          treasury_wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_treasury_wallet_id_fkey"
            columns: ["treasury_wallet_id"]
            isOneToOne: false
            referencedRelation: "treasury_wallet"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_allocations: {
        Row: {
          amount_btc_allocated: number
          created_at: string
          fulfillment_id: string
          id: string
          is_reversed: boolean
          lot_id: string
          reversed_at: string | null
        }
        Insert: {
          amount_btc_allocated: number
          created_at?: string
          fulfillment_id: string
          id?: string
          is_reversed?: boolean
          lot_id: string
          reversed_at?: string | null
        }
        Update: {
          amount_btc_allocated?: number
          created_at?: string
          fulfillment_id?: string
          id?: string
          is_reversed?: boolean
          lot_id?: string
          reversed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_allocations_fulfillment_id_fkey"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_allocations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_audit_logs: {
        Row: {
          action: string
          actor_merchant_user_id: string | null
          created_at: string
          id: string
          merchant_id: string
          metadata_json: Json | null
        }
        Insert: {
          action: string
          actor_merchant_user_id?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          metadata_json?: Json | null
        }
        Update: {
          action?: string
          actor_merchant_user_id?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          metadata_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_audit_logs_actor_merchant_user_id_fkey"
            columns: ["actor_merchant_user_id"]
            isOneToOne: false
            referencedRelation: "merchant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_audit_logs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invite_code: string
          invite_id: string
          invite_token: string
          merchant_id: string
          rep_id: string | null
          sent_to_email: string
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          invite_code: string
          invite_id: string
          invite_token: string
          merchant_id: string
          rep_id?: string | null
          sent_to_email: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invite_id?: string
          invite_token?: string
          merchant_id?: string
          rep_id?: string | null
          sent_to_email?: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "merchant_invites_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_invites_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          event_type: string
          id: string
          merchant_id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          event_type: string
          id?: string
          merchant_id: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          event_type?: string
          id?: string
          merchant_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_timeline_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          merchant_id: string
          must_reset_password: boolean
          phone: string | null
          role: Database["public"]["Enums"]["merchant_user_role"]
          status: Database["public"]["Enums"]["merchant_user_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          last_login_at?: string | null
          merchant_id: string
          must_reset_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["merchant_user_role"]
          status?: Database["public"]["Enums"]["merchant_user_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          merchant_id?: string
          must_reset_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["merchant_user_role"]
          status?: Database["public"]["Enums"]["merchant_user_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_users_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_wallet_ledger: {
        Row: {
          amount_usd: number
          created_at: string
          created_by_merchant_user_id: string | null
          id: string
          merchant_id: string
          reference: string | null
          type: Database["public"]["Enums"]["merchant_ledger_type"]
        }
        Insert: {
          amount_usd: number
          created_at?: string
          created_by_merchant_user_id?: string | null
          id?: string
          merchant_id: string
          reference?: string | null
          type: Database["public"]["Enums"]["merchant_ledger_type"]
        }
        Update: {
          amount_usd?: number
          created_at?: string
          created_by_merchant_user_id?: string | null
          id?: string
          merchant_id?: string
          reference?: string | null
          type?: Database["public"]["Enums"]["merchant_ledger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "merchant_wallet_ledger_created_by_merchant_user_id_fkey"
            columns: ["created_by_merchant_user_id"]
            isOneToOne: false
            referencedRelation: "merchant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_wallet_ledger_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_wallets: {
        Row: {
          balance_usd: number
          id: string
          merchant_id: string
          updated_at: string
        }
        Insert: {
          balance_usd?: number
          id?: string
          merchant_id: string
          updated_at?: string
        }
        Update: {
          balance_usd?: number
          id?: string
          merchant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_wallets_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          admin_pin_hash: string | null
          business_name: string
          category: string | null
          city: string | null
          created_at: string
          email: string
          id: string
          lat: number | null
          lng: number | null
          merchant_id: string
          phone: string
          point_of_contact: string
          rep_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["merchant_status"]
          street: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          admin_pin_hash?: string | null
          business_name: string
          category?: string | null
          city?: string | null
          created_at?: string
          email: string
          id?: string
          lat?: number | null
          lng?: number | null
          merchant_id: string
          phone: string
          point_of_contact: string
          rep_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["merchant_status"]
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          admin_pin_hash?: string | null
          business_name?: string
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          lat?: number | null
          lng?: number | null
          merchant_id?: string
          phone?: string
          point_of_contact?: string
          rep_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["merchant_status"]
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchants_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          btc_address: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          kyc_approved_at: string | null
          kyc_rejected_at: string | null
          kyc_rejection_reason: string | null
          kyc_retry_available_at: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          usdc_address: string | null
          user_id: string
          username: string | null
          wallet_created_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          btc_address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_approved_at?: string | null
          kyc_rejected_at?: string | null
          kyc_rejection_reason?: string | null
          kyc_retry_available_at?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          usdc_address?: string | null
          user_id: string
          username?: string | null
          wallet_created_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          btc_address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_approved_at?: string | null
          kyc_rejected_at?: string | null
          kyc_rejection_reason?: string | null
          kyc_retry_available_at?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          usdc_address?: string | null
          user_id?: string
          username?: string | null
          wallet_created_at?: string | null
        }
        Relationships: []
      }
      sales_reps: {
        Row: {
          created_at: string
          created_by: string | null
          dob: string
          email: string
          force_password_reset: boolean
          full_name: string
          id: string
          last_login_at: string | null
          phone: string
          status: Database["public"]["Enums"]["rep_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dob: string
          email: string
          force_password_reset?: boolean
          full_name: string
          id?: string
          last_login_at?: string | null
          phone: string
          status?: Database["public"]["Enums"]["rep_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dob?: string
          email?: string
          force_password_reset?: boolean
          full_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["rep_status"]
          user_id?: string
        }
        Relationships: []
      }
      square_payments: {
        Row: {
          amount_usd: number
          created_at: string
          created_by_merchant_user_id: string | null
          id: string
          merchant_id: string
          square_payment_id: string | null
          status: Database["public"]["Enums"]["square_payment_status"]
          updated_at: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          created_by_merchant_user_id?: string | null
          id?: string
          merchant_id: string
          square_payment_id?: string | null
          status?: Database["public"]["Enums"]["square_payment_status"]
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          created_by_merchant_user_id?: string | null
          id?: string
          merchant_id?: string
          square_payment_id?: string | null
          status?: Database["public"]["Enums"]["square_payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "square_payments_created_by_merchant_user_id_fkey"
            columns: ["created_by_merchant_user_id"]
            isOneToOne: false
            referencedRelation: "merchant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "square_payments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      treasury_reconciliation: {
        Row: {
          asset_type: string
          created_at: string
          created_by_admin_id: string | null
          database_balance: number
          discrepancy: number | null
          discrepancy_pct: number | null
          id: string
          notes: string | null
          onchain_balance: number
          reconciliation_id: string
          resolved_at: string | null
          resolved_by_admin_id: string | null
          status: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          created_by_admin_id?: string | null
          database_balance: number
          discrepancy?: number | null
          discrepancy_pct?: number | null
          id?: string
          notes?: string | null
          onchain_balance: number
          reconciliation_id?: string
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          status?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          created_by_admin_id?: string | null
          database_balance?: number
          discrepancy?: number | null
          discrepancy_pct?: number | null
          id?: string
          notes?: string | null
          onchain_balance?: number
          reconciliation_id?: string
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_reconciliation_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_reconciliation_resolved_by_admin_id_fkey"
            columns: ["resolved_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_snapshots: {
        Row: {
          btc_eligible: number
          btc_total: number
          company_usdc: number
          created_at: string
          id: string
          snapshot_date: string
          usdc_available: number
          usdc_total: number
        }
        Insert: {
          btc_eligible?: number
          btc_total?: number
          company_usdc?: number
          created_at?: string
          id?: string
          snapshot_date: string
          usdc_available?: number
          usdc_total?: number
        }
        Update: {
          btc_eligible?: number
          btc_total?: number
          company_usdc?: number
          created_at?: string
          id?: string
          snapshot_date?: string
          usdc_available?: number
          usdc_total?: number
        }
        Relationships: []
      }
      treasury_wallet: {
        Row: {
          asset_type: string | null
          btc_address: string | null
          created_at: string
          fireblocks_vault_id: string
          fireblocks_wallet_id: string | null
          id: string
          is_active: boolean
          label: string | null
          updated_at: string
          usdc_address: string | null
        }
        Insert: {
          asset_type?: string | null
          btc_address?: string | null
          created_at?: string
          fireblocks_vault_id: string
          fireblocks_wallet_id?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
          usdc_address?: string | null
        }
        Update: {
          asset_type?: string | null
          btc_address?: string | null
          created_at?: string
          fireblocks_vault_id?: string
          fireblocks_wallet_id?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
          usdc_address?: string | null
        }
        Relationships: []
      }
      usdc_inventory_lots: {
        Row: {
          amount_usdc_available: number
          amount_usdc_total: number
          created_at: string
          created_by_admin_id: string | null
          id: string
          notes: string | null
          received_at: string
          reference_id: string | null
          source: string
          treasury_wallet_id: string
        }
        Insert: {
          amount_usdc_available: number
          amount_usdc_total: number
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          notes?: string | null
          received_at?: string
          reference_id?: string | null
          source?: string
          treasury_wallet_id: string
        }
        Update: {
          amount_usdc_available?: number
          amount_usdc_total?: number
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          notes?: string | null
          received_at?: string
          reference_id?: string | null
          source?: string
          treasury_wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usdc_inventory_lots_treasury_wallet_id_fkey"
            columns: ["treasury_wallet_id"]
            isOneToOne: false
            referencedRelation: "treasury_wallet"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bank_accounts: {
        Row: {
          account_mask: string
          account_type: string
          bank_name: string
          created_at: string
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          plaid_access_token: string | null
          plaid_account_id: string | null
          plaid_item_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_mask: string
          account_type?: string
          bank_name: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          plaid_access_token?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_mask?: string
          account_type?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          plaid_access_token?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_bank_accounts_public: {
        Row: {
          account_mask: string | null
          account_type: string | null
          bank_name: string | null
          created_at: string | null
          id: string | null
          is_primary: boolean | null
          is_verified: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_mask?: string | null
          account_type?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string | null
          is_primary?: boolean | null
          is_verified?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_mask?: string | null
          account_type?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string | null
          is_primary?: boolean | null
          is_verified?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      allocate_btc_fifo: {
        Args: { p_btc_amount: number; p_fulfillment_id: string }
        Returns: boolean
      }
      generate_unique_id: { Args: { prefix: string }; Returns: string }
      get_inventory_stats: {
        Args: never
        Returns: {
          eligible_btc: number
          eligible_lots_count: number
          locked_btc: number
          locked_lots_count: number
          total_btc: number
        }[]
      }
      get_merchant_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_usdc_inventory_stats: {
        Args: never
        Returns: {
          available_usdc: number
          lots_count: number
          total_usdc: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_admin_pin: { Args: { p_pin: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_merchant_admin: { Args: { _user_id: string }; Returns: boolean }
      is_merchant_cashier_or_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_merchant_user: { Args: { _user_id: string }; Returns: boolean }
      reverse_allocations: {
        Args: { p_fulfillment_id: string }
        Returns: boolean
      }
      update_admin_pin: {
        Args: {
          p_current_pin: string
          p_merchant_id: string
          p_new_pin: string
        }
        Returns: boolean
      }
      verify_admin_pin: {
        Args: { p_merchant_id: string; p_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      activation_method: "QR_PIN" | "MANUAL"
      actor_type: "admin" | "system" | "sales_rep"
      app_role: "super_admin" | "admin" | "sales_rep"
      bitcard_status: "issued" | "active" | "redeemed" | "expired" | "canceled"
      card_order_status:
        | "SUBMITTED"
        | "PAID"
        | "PROCESSING"
        | "SHIPPED"
        | "DELIVERED"
        | "CANCELED"
      commission_status: "accrued" | "approved" | "paid"
      fulfillment_order_type: "BITCARD_REDEMPTION" | "BUY_ORDER"
      fulfillment_status:
        | "SUBMITTED"
        | "KYC_PENDING"
        | "WAITING_INVENTORY"
        | "READY_TO_SEND"
        | "SENDING"
        | "SENT"
        | "FAILED"
        | "HOLD"
      inventory_source: "manual_topup" | "exchange_withdraw" | "other"
      invite_status:
        | "created"
        | "sent"
        | "opened"
        | "started"
        | "completed"
        | "expired"
      kyc_fulfillment_status: "PENDING" | "APPROVED" | "REJECTED"
      kyc_status: "not_started" | "pending" | "approved" | "rejected"
      merchant_ledger_type: "TOPUP" | "ACTIVATION_DEBIT" | "ADJUSTMENT"
      merchant_status:
        | "lead"
        | "invited"
        | "onboarding_started"
        | "approved"
        | "active"
        | "paused"
      merchant_user_role: "MERCHANT_ADMIN" | "CASHIER"
      merchant_user_status: "ACTIVE" | "DISABLED"
      rep_status: "draft" | "cleared" | "active" | "disabled"
      square_payment_status: "CREATED" | "PAID" | "FAILED" | "CANCELED"
      swap_order_status:
        | "PENDING"
        | "PROCESSING"
        | "COMPLETED"
        | "FAILED"
        | "CANCELLED"
      swap_order_type: "BUY_BTC" | "SELL_BTC"
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
  public: {
    Enums: {
      activation_method: ["QR_PIN", "MANUAL"],
      actor_type: ["admin", "system", "sales_rep"],
      app_role: ["super_admin", "admin", "sales_rep"],
      bitcard_status: ["issued", "active", "redeemed", "expired", "canceled"],
      card_order_status: [
        "SUBMITTED",
        "PAID",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELED",
      ],
      commission_status: ["accrued", "approved", "paid"],
      fulfillment_order_type: ["BITCARD_REDEMPTION", "BUY_ORDER"],
      fulfillment_status: [
        "SUBMITTED",
        "KYC_PENDING",
        "WAITING_INVENTORY",
        "READY_TO_SEND",
        "SENDING",
        "SENT",
        "FAILED",
        "HOLD",
      ],
      inventory_source: ["manual_topup", "exchange_withdraw", "other"],
      invite_status: [
        "created",
        "sent",
        "opened",
        "started",
        "completed",
        "expired",
      ],
      kyc_fulfillment_status: ["PENDING", "APPROVED", "REJECTED"],
      kyc_status: ["not_started", "pending", "approved", "rejected"],
      merchant_ledger_type: ["TOPUP", "ACTIVATION_DEBIT", "ADJUSTMENT"],
      merchant_status: [
        "lead",
        "invited",
        "onboarding_started",
        "approved",
        "active",
        "paused",
      ],
      merchant_user_role: ["MERCHANT_ADMIN", "CASHIER"],
      merchant_user_status: ["ACTIVE", "DISABLED"],
      rep_status: ["draft", "cleared", "active", "disabled"],
      square_payment_status: ["CREATED", "PAID", "FAILED", "CANCELED"],
      swap_order_status: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ],
      swap_order_type: ["BUY_BTC", "SELL_BTC"],
    },
  },
} as const
