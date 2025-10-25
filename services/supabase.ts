


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
        // TypeScript inference issue with the Supabase client.
        Row: {
          id: string;
          created_at: string;
          title: string;
          // FIX: Using 'any' for the 'history' jsonb column. The Supabase client's type inference
          // can fail with complex array types like 'ChatMessage[]', leading to 'never' type errors
          // on insert/update operations. 'any' is used here as a pragmatic solution.
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
          // FIX: Using 'any' to match the Row definition and fix insert type errors.
          history?: any;
          summary?: string | null;
          user_id: string;
          recording_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          // FIX: Using 'any' to match the Row definition and fix update type errors.
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