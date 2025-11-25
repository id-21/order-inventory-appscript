import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client (Anon Key)
 * Uses Row Level Security - users can only access their own data
 * Safe to use on client-side
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Database types (matching schema)
 * These types are used for client-side operations
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: "user" | "admin";
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: "user" | "admin";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: "user" | "admin";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: number;
          customer_name: string;
          status: "PENDING" | "COMPLETED" | "CANCELLED";
          order_json: any;
          created_by: string;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          order_number?: number;
          customer_name: string;
          status?: "PENDING" | "COMPLETED" | "CANCELLED";
          order_json: any;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          order_number?: number;
          customer_name?: string;
          status?: "PENDING" | "COMPLETED" | "CANCELLED";
          order_json?: any;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          design: string;
          quantity: number;
          lot_number: string;
          fulfilled_quantity: number;
          status: "PENDING" | "PARTIALLY_FULFILLED" | "FULFILLED";
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          design: string;
          quantity: number;
          lot_number: string;
          fulfilled_quantity?: number;
          status?: "PENDING" | "PARTIALLY_FULFILLED" | "FULFILLED";
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          design?: string;
          quantity?: number;
          lot_number?: string;
          fulfilled_quantity?: number;
          status?: "PENDING" | "PARTIALLY_FULFILLED" | "FULFILLED";
          created_at?: string;
        };
      };
      stock_movements: {
        Row: {
          id: string;
          order_id: string | null;
          invoice_number: string;
          design: string;
          quantity: number;
          lot_number: string;
          unique_identifiers: any;
          image_url: string | null;
          movement_type: "OUT" | "IN" | "ADJUSTMENT" | "CUSTOM";
          status: "COMPLETED" | "CANCELLED";
          session_json: any;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          invoice_number: string;
          design: string;
          quantity: number;
          lot_number: string;
          unique_identifiers?: any;
          image_url?: string | null;
          movement_type?: "OUT" | "IN" | "ADJUSTMENT" | "CUSTOM";
          status?: "COMPLETED" | "CANCELLED";
          session_json?: any;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          invoice_number?: string;
          design?: string;
          quantity?: number;
          lot_number?: string;
          unique_identifiers?: any;
          image_url?: string | null;
          movement_type?: "OUT" | "IN" | "ADJUSTMENT" | "CUSTOM";
          status?: "COMPLETED" | "CANCELLED";
          session_json?: any;
          created_by?: string;
          created_at?: string;
        };
      };
      scanned_items: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          order_id: string | null;
          design: string;
          lot_number: string;
          unique_identifier: string;
          is_processed: boolean;
          scanned_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          order_id?: string | null;
          design: string;
          lot_number: string;
          unique_identifier: string;
          is_processed?: boolean;
          scanned_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          order_id?: string | null;
          design?: string;
          lot_number?: string;
          unique_identifier?: string;
          is_processed?: boolean;
          scanned_at?: string;
        };
      };
    };
  };
}

/**
 * Typed Supabase client
 * Use this for type-safe database operations
 */
export type TypedSupabaseClient = ReturnType<typeof createClient<Database>>;
