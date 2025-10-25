
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
// FIX: Import ChatMessage to be used in the Database type definition.
import { Conversation, ChatMessage } from '../types';

// Define the type for our database schema for type safety.
export type Database = {
  public: {
    Tables: {
      conversations: {
        // FIX: Replaced Omit<...> with an explicit Row definition to resolve a complex
        // TypeScript inference issue with the Supabase client. The 'history' column,
        // a jsonb type, is set to 'any' to ensure Supabase can generate valid
        // types for operations, preventing the 'never' type error.
        Row: {
          id: string;
          created_at: string;
          title: string;
          history: any;
          summary: string | null;
          user_id: string;
          recording_url: string | null;
        };
        // FIX: Manually defining Insert and Update types to resolve 'never' type inference issue
        // that was not solved by only overriding the Row type. This ensures that insert() and update()
        // methods have the correct parameter types.
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          history?: any;
          summary?: string | null;
          user_id: string;
          recording_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          history?: any;
          summary?: string | null;
          user_id?: string;
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