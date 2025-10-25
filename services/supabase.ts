


import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
// FIX: Import ChatMessage to be used in the Database type definition.
import { Conversation, ChatMessage } from '../types';

// Define the type for our database schema for type safety.
export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: Conversation; // The type of a row in the table
        // FIX: Explicitly define Insert and Update types to prevent type inference issues with the 'history' jsonb column.
        // Supabase's type inference can fail for complex array types in jsonb, resulting in a 'never' type for payloads.
        // By specifying `any` for the history field in Insert/Update, we bypass this issue while keeping `ChatMessage[]` for the Row type for type-safe reads.
        Insert: {
          title: string;
          // FIX: Changed history type from 'any' to 'ChatMessage[]'. Using 'any' was causing Supabase to infer the insert/update payload type as 'never', leading to type errors. A strong type resolves this.
          history: ChatMessage[];
          user_id: string;
          recording_url?: string | null;
          summary?: string | null;
          last_accessed_at?: string;
        };
        Update: {
          title?: string;
          // FIX: Changed history type from 'any' to 'ChatMessage[]' for type consistency and to fix Supabase type inference.
          history?: ChatMessage[];
          recording_url?: string | null;
          summary?: string | null;
          last_accessed_at?: string;
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