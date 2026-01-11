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
      bitcards: {
        Row: {
          activated_at: string | null
          bitcard_id: string
          created_at: string
          id: string
          issued_at: string
          merchant_id: string | null
          redeemed_at: string | null
          status: Database["public"]["Enums"]["bitcard_status"]
          usd_value: number
        }
        Insert: {
          activated_at?: string | null
          bitcard_id: string
          created_at?: string
          id?: string
          issued_at?: string
          merchant_id?: string | null
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["bitcard_status"]
          usd_value: number
        }
        Update: {
          activated_at?: string | null
          bitcard_id?: string
          created_at?: string
          id?: string
          issued_at?: string
          merchant_id?: string | null
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["bitcard_status"]
          usd_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "bitcards_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
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
      merchants: {
        Row: {
          business_name: string
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
          business_name: string
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
          business_name?: string
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
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          usdc_address: string | null
          user_id: string
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
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          usdc_address?: string | null
          user_id: string
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
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          usdc_address?: string | null
          user_id?: string
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
      treasury_wallet: {
        Row: {
          btc_address: string | null
          created_at: string
          fireblocks_vault_id: string
          fireblocks_wallet_id: string | null
          id: string
          is_active: boolean
          label: string | null
          updated_at: string
        }
        Insert: {
          btc_address?: string | null
          created_at?: string
          fireblocks_vault_id: string
          fireblocks_wallet_id?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
        }
        Update: {
          btc_address?: string | null
          created_at?: string
          fireblocks_vault_id?: string
          fireblocks_wallet_id?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
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
      [_ in never]: never
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      reverse_allocations: {
        Args: { p_fulfillment_id: string }
        Returns: boolean
      }
    }
    Enums: {
      actor_type: "admin" | "system" | "sales_rep"
      app_role: "super_admin" | "admin" | "sales_rep"
      bitcard_status: "issued" | "active" | "redeemed" | "expired" | "canceled"
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
      merchant_status:
        | "lead"
        | "invited"
        | "onboarding_started"
        | "kyc_pending"
        | "approved"
        | "active"
        | "paused"
      rep_status: "draft" | "cleared" | "active" | "disabled"
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
      actor_type: ["admin", "system", "sales_rep"],
      app_role: ["super_admin", "admin", "sales_rep"],
      bitcard_status: ["issued", "active", "redeemed", "expired", "canceled"],
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
      merchant_status: [
        "lead",
        "invited",
        "onboarding_started",
        "kyc_pending",
        "approved",
        "active",
        "paused",
      ],
      rep_status: ["draft", "cleared", "active", "disabled"],
    },
  },
} as const
