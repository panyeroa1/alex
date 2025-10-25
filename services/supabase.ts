
import { createClient } from '@supabase/supabase-js';
// FIX: Using the 'Json' type from Supabase for jsonb columns is more specific and safer than 'any',
// and it correctly resolves the type inference issues that were causing 'never' type errors.
import type { Json } from '@supabase/supabase-js';
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
          // FIX: Using 'Json' for the 'history' jsonb column. The Supabase client's type inference
          // can fail with complex array types like 'ChatMessage[]', leading to 'never' type errors
          // on insert/update operations. 'Json' is the correct type for this.
          history: Json;
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
          // FIX: Using 'Json' to match the Row definition and fix insert type errors.
          history?: Json;
          summary?: string | null;
          user_id: string;
          recording_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          // FIX: Using 'Json' to match the Row definition and fix update type errors.
          history?: Json;
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