// FIX: LiveSession and Chat are not exported from @google/genai's root.
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, FunctionCall, Chat, Part, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from "../types";

// FIX: Define LiveSession interface locally as it is not exported from the SDK.
export interface LiveSession {
    close(): void;
    sendRealtimeInput(params: { media: Blob }): void;
    sendToolResponse(params: { functionResponses: { id: string, name: string, response: { result: string } } }): void;
}

// --- Audio/Video Helpers ---
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
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

const blobToBase64 = (blob: globalThis.Blob): Promise<string> => {
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
    toggleInputMute: (mute: boolean) => void,
    toggleOutputMute: (mute: boolean) => void,
    outputAudioContext: AudioContext,
    outputGainNode: GainNode
}> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    outputGainNode = outputAudioContext.createGain();
    outputGainNode.connect(outputAudioContext.destination);

    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();
    let speakingTimeout: number;

    let isInputMuted = false;
    const toggleInputMute = (mute: boolean) => { isInputMuted = mute; };
    const toggleOutputMute = (mute: boolean) => {
        outputGainNode?.gain.setValueAtTime(mute ? 0 : 1, outputAudioContext!.currentTime);
    };

    const historyText = config.history.map(m => `${m.speaker === 'user' ? 'Master E' : 'Alex'}: ${m.text}`).join('\n');
    const contextInstruction = historyText ? `\n\n--- PREVIOUS CONVERSATION ---\n${historyText}` : '';

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
    mediaStreamSource = inputAudioContext.createMediaStreamSource(audioStream);
    scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        if (isInputMuted) return;
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const pcmBlob = createAudioBlob(inputData);
        sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
    };

    mediaStreamSource.connect(scriptProcessor);
    scriptProcessor.connect(inputAudioContext.destination);

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
    return { session, audioStream, toggleInputMute, toggleOutputMute, outputAudioContext: outputAudioContext!, outputGainNode: outputGainNode! };
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

export async function startChatSession(history: ChatMessage[]): Promise<Chat> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const formattedHistory = history.map(msg => ({
        role: msg.speaker === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: formattedHistory,
    });
    return chat;
}

export async function sendChatMessage(chat: Chat, message: string, extraParts?: Part[]): Promise<GenerateContentResponse> {
    // FIX: The `chat.sendMessage` method expects a `SendMessageParameters` object, not a raw string.
    if (!extraParts) {
        const response = await chat.sendMessage({ message });
        return response;
    }

    const parts: Part[] = [];
    if (message) {
        parts.push({ text: message });
    }
    parts.push(...extraParts);
    
    // FIX: The `chat.sendMessage` method expects a `SendMessageParameters` object. The `message` property can be an array of `Part` objects.
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