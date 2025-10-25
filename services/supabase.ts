

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { Conversation, ChatMessage } from '../types';

// Define the type for our database schema for type safety.
export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: Conversation; // The type of a row in the table
        // FIX: Corrected the Update type to exclude non-updatable fields like 'id' and 'created_at', which resolves type inference issues with the Supabase client.
        Insert: {
            title: string;
            history: ChatMessage[];
            user_id?: string | null;
            recording_url?: string | null;
        }; // The type for inserting a new row
        Update: {
            title?: string;
            history?: ChatMessage[];
            user_id?: string | null;
            recording_url?: string | null;
        }; // The type for updating a row
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