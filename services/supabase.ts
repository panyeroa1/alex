import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
// FIX: Import ChatMessage to be used in the Database type definition.
import { Conversation, ChatMessage } from '../types';

// Define the type for our database schema for type safety.
export type Database = {
  public: {
    Tables: {
      conversations: {
        // FIX: Override the 'history' column type to 'any' in the Row definition.
        // This resolves a Supabase type inference issue with complex jsonb arrays (ChatMessage[]),
        // which was causing Insert and Update types to become 'never'.
        // By setting 'history' to 'any' here, Supabase can correctly infer the types for database operations,
        // so we no longer need to define Insert and Update types manually.
        Row: Omit<Conversation, 'history'> & { history: any };
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