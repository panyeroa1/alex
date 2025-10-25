
import { supabase } from './supabase';
import { ChatMessage, Conversation, MediaItem } from '../types';

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
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching conversations:", error.message);
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
        console.error(`Error fetching conversation ${id}:`, error.message);
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
        // FIX: Removed `as any` cast. With the corrected Database type, this is no longer needed.
        history: [],
        user_id: user.id,
    };

    const { data, error } = await supabase
        .from('conversations')
        .insert(newConversation)
        .select()
        .single();
    
    if (error || !data) {
        console.error("Error creating conversation:", error?.message);
        throw new Error("Could not create a new conversation.");
    }
    return data;
};

export const saveConversationHistory = async (id: string, history: ChatMessage[]): Promise<void> => {
    const { error } = await supabase
        .from('conversations')
        // FIX: Removed `as any` cast. With the corrected Database type, this is no longer needed.
        .update({ history: history })
        .eq('id', id);

    if (error) {
        console.error("Error saving history:", error.message);
    }
};

export const updateConversationTitle = async (id: string, title: string): Promise<void> => {
    const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', id);
        
    if (error) {
        console.error("Error updating title:", error.message);
    }
};

export const updateConversationSummary = async (id: string, summary: string): Promise<void> => {
    const { error } = await supabase
        .from('conversations')
        .update({ summary })
        .eq('id', id);

    if (error) {
        console.error("Error updating summary:", error.message);
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
        console.error("Error uploading recording:", error.message);
        return;
    }

    const { data: { publicUrl } } = supabase.storage.from('recordings').getPublicUrl(data.path);
    
    if (publicUrl) {
        const { error: updateError } = await supabase
            .from('conversations')
            .update({ recording_url: publicUrl })
            .eq('id', conversationId);
        
        if (updateError) {
            console.error("Error updating conversation with recording URL:", updateError.message);
        }
    }
};

export const uploadMediaFile = async (file: File): Promise<MediaItem | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("User not authenticated, cannot upload media.");
        return null;
    }
    
    const filePath = `${user.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error('Error uploading media file:', uploadError.message);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

    if (!publicUrl) {
        console.error('Could not get public URL for uploaded media.');
        return null;
    }
    
    const { data: listData, error: listError } = await supabase.storage.from('media').list(user.id, { search: file.name });
    const fileData = listData && !listError ? listData[0] : null;

    const mediaItem: MediaItem = {
        id: fileData ? Date.parse(fileData.created_at) : Date.now(),
        name: file.name,
        url: publicUrl,
        type: file.type.startsWith('audio') ? 'audio' : 'video',
        source: 'upload',
    };

    return mediaItem;
};

export const listMediaFiles = async (): Promise<MediaItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.storage
        .from('media')
        .list(user.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    
    if (error) {
        console.error('Error listing media files:', error.message);
        return [];
    }

    if (!data) return [];
    
    const mediaItems: MediaItem[] = data
        .filter(file => !file.name.startsWith('.')) // Supabase storage might have placeholder files
        .map(file => {
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(`${user.id}/${file.name}`);
            return {
                id: Date.parse(file.created_at),
                name: file.name,
                url: publicUrl,
                type: (file.metadata?.mimetype as string)?.startsWith('audio/') ? 'audio' : 'video',
                source: 'upload'
            };
        });

    return mediaItems;
};

export const deleteMediaFile = async (fileName: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase.storage
        .from('media')
        .remove([`${user.id}/${fileName}`]);

    if (error) {
        console.error('Error deleting media file:', error.message);
    }
};
