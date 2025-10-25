export type AgentStatus = 'idle' | 'verifying' | 'connecting' | 'listening' | 'speaking' | 'executing';

export interface Notification {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface ChatMessage {
    id: number;
    speaker: 'user' | 'alex';
    text: string;
}

export interface UploadedFile {
    name: string;
    type: string;
    size: number;
}

export interface Conversation {
    id: string; // Will be a UUID from Supabase
    title: string;
    history: ChatMessage[];
    created_at: string; // Supabase timestamp with timezone
    user_id?: string | null;
    recording_url?: string | null;
}
