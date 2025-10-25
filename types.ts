export type AgentStatus = 'idle' | 'verifying' | 'connecting' | 'listening' | 'speaking' | 'executing' | 'recalling';

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

export interface ProjectFile extends UploadedFile {
    content: string; // Base64 encoded content
}

export interface Conversation {
    id: string; // Will be a UUID from Supabase
    title: string;
    history: ChatMessage[];
    created_at: string; // Supabase timestamp with timezone
    last_accessed_at: string;
    summary: string | null;
    // FIX: Changed user_id to be required, as it's likely a non-nullable foreign key.
    // The optional '?' was causing type conflicts with the explicit Insert/Update types in Supabase.
    user_id: string;
    // FIX: Changed recording_url to be non-optional but nullable. A database column will always be present in a row, even if its value is null.
    recording_url: string | null;
}

export interface BackgroundTask {
    id: number;
    message: string;
}

export interface IntegrationCredentials {
    [key: string]: any;
    storyAuth?: {
        enabled: boolean;
        key: string | null;
    }
}

export interface MediaItem {
    id: number;
    name: string;
    url: string;
    type: 'audio' | 'video';
}