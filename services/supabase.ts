import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { Conversation, ChatMessage } from '../types';

// Define the type for our database schema for type safety.
export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: Conversation; // The type of a row in the table
        // FIX: Explicitly defining Insert and Update types to handle the 'history' jsonb column.
        // Supabase can struggle to infer these from the Row type when a jsonb column contains a complex array.
        Insert: {
          title: string;
          // FIX: Using the specific ChatMessage[] type instead of a generic Json type resolves Supabase client type inference errors.
          history: ChatMessage[];
          user_id: string;
          recording_url?: string | null;
        };
        Update: {
          title?: string;
          // FIX: Using the specific ChatMessage[] type instead of a generic Json type resolves Supabase client type inference errors.
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