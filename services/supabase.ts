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
        // Using the specific ChatMessage[] type instead of 'any' resolves the client type inference errors.
        Insert: {
          title: string;
          // FIX: The Supabase client struggles with complex types like ChatMessage[] for jsonb columns on write operations.
          // Using 'any' resolves the type errors where the insert/update payload was expected to be 'never'.
          history: any;
          user_id: string;
          recording_url?: string | null;
        };
        Update: {
          title?: string;
          // FIX: The Supabase client struggles with complex types like ChatMessage[] for jsonb columns on write operations.
          // Using 'any' resolves the type errors where the insert/update payload was expected to be 'never'.
          history?: any;
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