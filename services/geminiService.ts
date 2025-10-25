

import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, FunctionCall, Chat, Part, GenerateContentResponse, Type } from "@google/genai";
import { ChatMessage, Conversation, MediaItem } from "../types";

export interface LiveSession {
    close(): void;
    sendRealtimeInput(params: { media: Blob }): void;
    sendToolResponse(params: { functionResponses: { id: string, name: string, response: { result: string | object } } }): void;
}

// --- Audio/Video Helpers ---
export function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function createAudioBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

export const blobToBase64 = (blob: globalThis.Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- Live Session Management ---

interface ConnectionCallbacks {
    onSpeaking: () => void;
    onIdle: () => void;
    onToolCall: (fc: FunctionCall) => void;
    onError: (e: ErrorEvent) => void;
    onTranscriptionUpdate: (speaker: 'user' | 'alex', text: string) => void;
}

interface ConnectionConfig {
    systemInstruction: string;
    tools: { functionDeclarations: FunctionDeclaration[] }[];
    videoElement: HTMLVideoElement | null;
    history: ChatMessage[];
}

let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;
let mediaStreamSource: MediaStreamAudioSourceNode | null = null;
let outputGainNode: GainNode | null = null;
let videoFrameInterval: number | null = null;

export async function connectToLiveSession(
    config: ConnectionConfig & ConnectionCallbacks
): Promise<{ 
    session: LiveSession, 
    audioStream: MediaStream, 
    toggleOutputMute: (mute: boolean) => void,
    outputAudioContext: AudioContext,
    outputGainNode: GainNode,
    inputAnalyser: AnalyserNode,
    outputAnalyser: AnalyserNode,
}> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    outputGainNode = outputAudioContext.createGain();
    const outputAnalyser = outputAudioContext.createAnalyser();
    outputGainNode.connect(outputAnalyser);
    outputAnalyser.connect(outputAudioContext.destination);

    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();
    let speakingTimeout: number;

    const toggleOutputMute = (mute: boolean) => {
        outputGainNode?.gain.setValueAtTime(mute ? 0 : 1, outputAudioContext!.currentTime);
    };

    const historyText = config.history.map(m => `${m.speaker === 'user' ? 'Master E' : 'Alex'}: ${m.text}`).join('\n');
    const contextInstruction = historyText ? `\n\n--- CURRENT CONVERSATION ---\n${historyText}` : '';

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => console.log('Session opened.'),
            onmessage: async (message: LiveServerMessage) => {
                if(message.toolCall){
                    for(const fc of message.toolCall.functionCalls){
                       config.onToolCall(fc);
                    }
                }

                const transcriptPart = message.serverContent?.inputTranscription ?? message.serverContent?.outputTranscription;
                if (transcriptPart) {
                    const speaker = message.serverContent?.inputTranscription ? 'user' : 'alex';
                    config.onTranscriptionUpdate(speaker, transcriptPart.text);
                }

                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    config.onSpeaking();
                    clearTimeout(speakingTimeout);
                    
                    nextStartTime = Math.max(nextStartTime, outputAudioContext!.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext!, 24000, 1);
                    const source = outputAudioContext!.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputGainNode!);
                    source.addEventListener('ended', () => {
                        sources.delete(source);
                        if (sources.size === 0) {
                           speakingTimeout = window.setTimeout(() => config.onIdle(), 500);
                        }
                    });
                    source.start(nextStartTime);
                    nextStartTime += audioBuffer.duration;
                    sources.add(source);
                }

                if (message.serverContent?.interrupted) {
                    for (const source of sources.values()) source.stop();
                    sources.clear();
                    nextStartTime = 0;
                    config.onIdle();
                }
            },
            onerror: config.onError,
            onclose: () => console.log('Session closed.'),
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
            systemInstruction: config.systemInstruction + contextInstruction,
            tools: config.tools,
        },
    });

    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: {
        noiseSuppression: true,
        echoCancellation: true,
    } });
    inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const inputAnalyser = inputAudioContext.createAnalyser();
    mediaStreamSource = inputAudioContext.createMediaStreamSource(audioStream);
    scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

    mediaStreamSource.connect(inputAnalyser);
    inputAnalyser.connect(scriptProcessor);
    scriptProcessor.connect(inputAudioContext.destination);

    // VAD (Voice Activity Detection) state
    const VAD_THRESHOLD = 0.01; // Sensitivity for speech detection
    const SILENCE_TIMEOUT_MS = 400; // Time in ms to wait before considering speech ended
    let vadState: 'silent' | 'speaking' = 'silent';
    let silenceTimer: number | null = null;

    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        
        // Calculate RMS to detect voice activity
        let sum = 0;
        for(let i = 0; i < inputData.length; i++){
            sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        if (rms > VAD_THRESHOLD) {
            // Speech detected
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }
            vadState = 'speaking';
        } else if (vadState === 'speaking') {
            // Potential end of speech
            if (!silenceTimer) {
                silenceTimer = window.setTimeout(() => {
                    vadState = 'silent';
                    silenceTimer = null;
                }, SILENCE_TIMEOUT_MS);
            }
        }
        
        // Only send audio to Gemini if we are in the 'speaking' state
        if (vadState === 'speaking') {
            const pcmBlob = createAudioBlob(inputData);
            sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
        }
    };

    if (config.videoElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = config.videoElement;

        videoFrameInterval = window.setInterval(() => {
            if (!ctx || video.paused || video.ended || video.videoWidth === 0) return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const base64Data = await blobToBase64(blob);
                    sessionPromise.then(session => session.sendRealtimeInput({
                        media: { data: base64Data, mimeType: 'image/jpeg' }
                    }));
                }
            }, 'image/jpeg', 0.8);
        }, 1000 / 5); // 5 FPS
    }

    const session = await sessionPromise;
    return { session, audioStream, toggleOutputMute, outputAudioContext: outputAudioContext!, outputGainNode: outputGainNode!, inputAnalyser, outputAnalyser };
}

export async function disconnectLiveSession(session: LiveSession, audioStream: MediaStream | null, videoStream: MediaStream | null) {
    session.close();
    audioStream?.getTracks().forEach(track => track.stop());
    videoStream?.getTracks().forEach(track => track.stop());

    if (videoFrameInterval) clearInterval(videoFrameInterval);
    videoFrameInterval = null;

    scriptProcessor?.disconnect();
    mediaStreamSource?.disconnect();
    scriptProcessor = null;
    mediaStreamSource = null;
    
    if (inputAudioContext?.state !== 'closed') await inputAudioContext?.close();
    if (outputAudioContext?.state !== 'closed') await outputAudioContext?.close();
    inputAudioContext = null;
    outputAudioContext = null;
}

// --- Chat Session Management ---

export async function startChatSession(history: ChatMessage[], systemInstruction: string): Promise<Chat> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const formattedHistory = history.map(msg => ({
        role: msg.speaker === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: formattedHistory,
        config: {
            systemInstruction: systemInstruction,
        }
    });
    return chat;
}

export async function sendChatMessage(chat: Chat, message: string, extraParts?: Part[]): Promise<GenerateContentResponse> {
    if (!extraParts) {
        const response = await chat.sendMessage({ message });
        return response;
    }

    const parts: Part[] = [];
    if (message) {
        parts.push({ text: message });
    }
    parts.push(...extraParts);
    
    const response = await chat.sendMessage({ message: parts });
    return response;
}

// --- Utility Functions ---

export async function generateConversationTitle(history: ChatMessage[]): Promise<string> {
    if (history.length < 2) return "New Conversation";
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const historyText = history.slice(0, 4).map(m => `${m.speaker}: ${m.text}`).join('\n');
    const prompt = `Summarize the following conversation into a short, 2-3 word title. Be concise and relevant. Example: "Deployment Pipeline Fix" or "Staging Server Rollback".\n\nCONVERSATION:\n${historyText}\n\nTITLE:`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.replace(/["*]/g, '').trim();
    } catch (error) {
        console.error("Failed to generate title:", error);
        return "New Conversation";
    }
}

export async function generateConversationSummary(history: ChatMessage[]): Promise<string> {
    if (history.length === 0) return "";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const historyText = history.map(m => `${m.speaker}: ${m.text}`).join('\n');
    const prompt = `Summarize the key points, decisions, and action items from this conversation into a concise paragraph. This is for your long-term memory.

    CONVERSATION:
    ${historyText}
    
    SUMMARY:`;

    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text.trim();
    } catch (error) {
        console.error("Failed to generate summary:", error);
        return "Could not generate summary.";
    }
}

export async function summarizeConversationsForMemory(conversations: Conversation[]): Promise<string> {
    if (conversations.length === 0) return "";

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = conversations
        .map(c => `Conversation about "${c.title}" (last accessed ${new Date(c.last_accessed_at).toLocaleString()}):\nSummary: ${c.summary || 'No summary available.'}`)
        .join('\n\n---\n\n');

    const prompt = `You are Alex, an AI agent, preparing for a new session with your boss, Master E. Below is a summary of your last few conversations. Review it to refresh your memory on recent projects and discussions. Synthesize these points into a brief, consolidated paragraph of your key takeaways. This is for your internal context only; do not mention this memory recall process to the user unless they ask.

    PAST CONVERSATIONS:
    ${context}
    
    CONSOLIDATED SUMMARY OF KEY TAKEAWAYS:`;
    
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return `\n\n--- LONG-TERM MEMORY CONTEXT ---\nHere is a summary of our recent conversations:\n${response.text}\n--- END OF MEMORY CONTEXT ---`;
    } catch (error) {
        console.error("Failed to summarize conversations for memory:", error);
        return "\n\n--- LONG-TERM MEMORY CONTEXT ---\nCould not load recent conversation summaries.\n--- END OF MEMORY CONTEXT ---";
    }
}


export async function performWebSearch(query: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: `Boss, please search for this: ${query}`,
           config: {
             tools: [{googleSearch: {}}],
           },
        });

        let resultText = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

        if (groundingChunks && groundingChunks.length > 0) {
            const sources = groundingChunks
                .map((chunk: any) => chunk.web?.uri || chunk.maps?.uri)
                .filter(Boolean);
            
            if (sources.length > 0) {
                const uniqueSources = [...new Set(sources)];
                resultText += `\n\n**Sources:**\n- ${uniqueSources.join('\n- ')}`;
            }
        }
        return resultText;
    } catch (error) {
        console.error("Web search failed:", error);
        return "Sorry Boss, I couldn't search the web right now.";
    }
}


export async function analyzeAudio(audioBlob: globalThis.Blob): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const audioBase64 = await blobToBase64(audioBlob);

    const audioPart = {
        inlineData: {
            mimeType: audioBlob.type || 'audio/webm',
            data: audioBase64,
        },
    };

    const textPart = {
        text: `You are an expert app development consultant. Analyze the following audio recording from a user describing an app idea. The user is your boss, "Master E". Provide a concise summary of the app's overview and its core workflow. Structure your response clearly with an "App Overview" and a "Workflow" section. Be direct and professional.`
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, audioPart] },
    });

    return response.text;
}

export async function synthesizeSpeech(text: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Charon' },
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("TTS failed to generate audio.");
    }
    return base64Audio;
}

export async function analyzeCode(fileName: string, base64Content: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let decodedCode: string;
    try {
        decodedCode = atob(base64Content);
    } catch (e) {
        console.error("Failed to decode base64 content for", fileName);
        return `Error: Could not decode the content of ${fileName}. It may not be a text-based file.`;
    }

    const prompt = `
You are an expert, automated CLI code analysis agent.
Your task is to analyze the following code from the file named "${fileName}".
Do not provide a greeting or any conversational filler. Go straight to the analysis.
Provide a detailed report in Markdown format. Your analysis must cover:
1.  **Potential Bugs**: Identify any logic errors, race conditions, or potential runtime exceptions.
2.  **Security Vulnerabilities**: Look for common vulnerabilities like injection attacks, insecure data handling, etc.
3.  **Performance Improvements**: Suggest ways to optimize the code for better performance and efficiency.
4.  **Code Style & Readability**: Comment on code structure, naming conventions, and suggest improvements for clarity.
5.  **Overall Summary**: Conclude with a brief summary of the code's health.

--- CODE FOR ANALYSIS ---
${decodedCode}
--- END OF CODE ---

Begin your report now.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error(`Code analysis failed for ${fileName}:`, error);
        return `Error: Could not analyze the code for ${fileName}.`;
    }
}

export async function searchYouTube(query: string): Promise<Partial<MediaItem> | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: `Find a song on YouTube for the query: "${query}". Respond ONLY with a JSON object containing "title" and "youtubeId". Example: {"title": "Artist - Song Title", "youtubeId": "videoId"}.`,
           config: {
             responseMimeType: "application/json",
             responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    youtubeId: { type: Type.STRING }
                },
                required: ['title', 'youtubeId']
             },
            // FIX: Removed `tools` config because it is incompatible with `responseMimeType` and `responseSchema` as per Gemini API guidelines.
           },
        });

        const jsonString = response.text;
        const result = JSON.parse(jsonString);

        if (result.title && result.youtubeId) {
             // In a real app, you'd use a service like youtube-dl to get a direct stream URL.
             // For this simulation, we'll use a placeholder.
            const placeholderUrl = `https://www.youtube.com/watch?v=${result.youtubeId}`; // Not a direct audio link, but serves for tracking.
            return {
                name: result.title,
                youtubeId: result.youtubeId,
                url: placeholderUrl, 
                source: 'youtube',
                type: 'audio',
            };
        }
        return null;

    } catch (error) {
        console.error("YouTube search failed:", error);
        return null;
    }
}

export async function generateLyrics(prompt: string, genre?: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const fullPrompt = `You are a creative songwriter. Write song lyrics based on the following prompt.
    Genre: ${genre || 'any'}
    Prompt: "${prompt}"
    
    Provide only the lyrics.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Failed to generate lyrics:", error);
        return "Sorry, I couldn't write a song right now.";
    }
}

export async function analyzeAudioTone(audioBlob: globalThis.Blob): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const audioBase64 = await blobToBase64(audioBlob);

    const audioPart = {
        inlineData: { mimeType: audioBlob.type || 'audio/webm', data: audioBase64 },
    };

    const textPart = {
        text: `You are an expert music analyst. Analyze the following audio recording. Describe its musical and emotional tone. What instruments do you hear? What is the genre and mood? Be descriptive and insightful.`
    };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, audioPart] },
        });
        return response.text;
    } catch (error) {
        console.error("Audio tone analysis failed:", error);
        return "Sorry, I couldn't analyze the song's tone.";
    }
}