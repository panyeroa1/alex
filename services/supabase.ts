import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
// FIX: Import ChatMessage to be used in the Database type definition.
import { Conversation, ChatMessage } from '../types';

// FIX: Define a standard `Json` type to handle Supabase's `jsonb` columns correctly.
// This provides better type safety than `any` and resolves inference issues with complex object arrays.
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Define the type for our database schema for type safety.
export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: Conversation; // The type of a row in the table
        // FIX: Explicitly define Insert and Update types to prevent type inference issues with the 'history' jsonb column.
        // Supabase's type inference can fail for complex array types in jsonb, resulting in a 'never' type for payloads.
        // By specifying `Json` for the history field, we provide a concrete type that Supabase can handle, while keeping `ChatMessage[]` for the Row type for type-safe reads.
        Insert: {
          title: string;
          // FIX: Reverted 'history' type to 'Json' to fix Supabase type inference errors. The 'never' type error indicates an issue with resolving complex types like 'ChatMessage[]' for jsonb columns in insert/update operations.
          history: Json;
          user_id: string;
          recording_url?: string | null;
          summary?: string | null;
        };
        Update: {
          title?: string;
          // FIX: Reverted 'history' type to 'Json' to fix Supabase type inference errors.
          history?: Json;
          recording_url?: string | null;
          summary?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};


export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);