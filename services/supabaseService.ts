import { supabase } from './supabase';
import { ChatMessage, Conversation } from '../types';

export const signInAnonymouslyIfNeeded = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
            console.error("Error signing in anonymously:", error);
            throw new Error("Could not authenticate user.");
        }
    }
};

export const getConversations = async (): Promise<Conversation[]> => {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_accessed_at', { ascending: false });

    if (error) {
        console.error("Error fetching conversations:", error);
        return [];
    }
    return data || [];
};

export const getConversation = async (id: string): Promise<Conversation | null> => {
     const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error(`Error fetching conversation ${id}:`, error);
        return null;
    }
    return data;
};

export const createConversation = async (): Promise<Conversation> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not authenticated, cannot create conversation.");
        throw new Error("User not authenticated, cannot create conversation.");
    }

    const newConversation = {
        title: 'New Conversation',
        history: [],
        user_id: user.id,
        last_accessed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('conversations')
        .insert(newConversation)
        .select()
        .single();
    
    if (error || !data) {
        console.error("Error creating conversation:", error);
        // Fallback or throw error
        throw new Error("Could not create a new conversation.");
    }
    return data;
};

export const saveConversationHistory = async (id: string, history: ChatMessage[]): Promise<void> => {
    const { error } = await supabase
        .from('conversations')
        .update({ history, last_accessed_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        console.error("Error saving history:", error);
    }
};

export const updateConversationTitle = async (id: string, title: string): Promise<void> => {
    const { error } = await supabase
        .from('conversations')
        .update({ title, last_accessed_at: new Date().toISOString() })
        .eq('id', id);
        
    if (error) {
        console.error("Error updating title:", error);
    }
};

export const updateConversationSummary = async (id: string, summary: string): Promise<void> => {
    const { error } = await supabase
        .from('conversations')
        .update({ summary, last_accessed_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        console.error("Error updating summary:", error);
    }
};

export const uploadRecording = async (conversationId: string, audioBlob: Blob): Promise<void> => {
    if (!conversationId) {
        console.error("Cannot upload recording without a conversation ID.");
        return;
    }

    const fileName = `${conversationId}/${Date.now()}.webm`;
    const { data, error } = await supabase.storage
        .from('recordings')
        .upload(fileName, audioBlob, {
            contentType: 'audio/webm;codecs=opus',
            upsert: false,
        });

    if (error) {
        console.error("Error uploading recording:", error);
        return;
    }

    const { data: { publicUrl } } = supabase.storage.from('recordings').getPublicUrl(data.path);
    
    if (publicUrl) {
        const { error: updateError } = await supabase
            .from('conversations')
            .update({ recording_url: publicUrl, last_accessed_at: new Date().toISOString() })
            .eq('id', conversationId);
        
        if (updateError) {
            console.error("Error updating conversation with recording URL:", updateError);
        }
    }
};