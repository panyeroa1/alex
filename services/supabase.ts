

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { Conversation, ChatMessage } from '../types';

// Define the type for our database schema for type safety.
export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: Conversation; // The type of a row in the table
        // FIX: Explicitly define Insert and Update types to prevent type inference issues with the 'history' jsonb column.
        // Supabase's type inference can fail for complex array types in jsonb, resulting in a 'never' type for payloads.
        // By specifying `ChatMessage[]` for the history field, we ensure the client uses the correct type.
        Insert: {
          title: string;
          // FIX: Using `ChatMessage[]` instead of `any` to correctly type the jsonb `history` column.
          history: ChatMessage[];
          user_id: string;
          recording_url?: string | null;
        };
        Update: {
          title?: string;
          // FIX: Using `ChatMessage[]` instead of `any` to correctly type the jsonb `history` column.
          history?: ChatMessage[];
          recording_url?: string | null;
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