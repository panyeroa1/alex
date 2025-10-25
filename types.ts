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

export interface ProjectFile extends UploadedFile {
    content: string; // Base64 encoded content
}

export interface Conversation {
    id: string; // Will be a UUID from Supabase
    title: string;
    history: ChatMessage[];
    created_at: string; // Supabase timestamp with timezone
    user_id?: string | null;
    recording_url?: string | null;
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