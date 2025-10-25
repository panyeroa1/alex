import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { Conversation, ChatMessage } from '../types';

// Define the type for our database schema for type safety.
export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: Conversation; // The type of a row in the table
        // FIX: Explicitly defining Insert and Update types to resolve Supabase client type errors.
        // Supabase was incorrectly inferring the types as `never`.
        Insert: {
          title: string;
          // FIX: Use 'ChatMessage[]' to provide a concrete type for the jsonb column, resolving inference issues.
          history: ChatMessage[];
          user_id: string;
          recording_url?: string | null;
        };
        Update: {
          title?: string;
          // FIX: Use 'ChatMessage[]' to provide a concrete type for the jsonb column, resolving inference issues.
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