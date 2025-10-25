import { supabase } from './supabase';
import { ChatMessage, Conversation } from '../types';

export const getConversations = async (): Promise<Conversation[]> => {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

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

    const { data, error } = await supabase
        .from('conversations')
        .insert({ title: 'New Conversation', history: [], user_id: user.id })
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
        .update({ history })
        .eq('id', id);

    if (error) {
        console.error("Error saving history:", error);
    }
};

export const updateConversationTitle = async (id: string, title: string): Promise<void> => {
    const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', id);
        
    if (error) {
        console.error("Error updating title:", error);
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
            .update({ recording_url: publicUrl })
            .eq('id', conversationId);
        
        if (updateError) {
            console.error("Error updating conversation with recording URL:", updateError);
        }
    }
};