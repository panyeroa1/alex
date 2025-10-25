
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, FunctionCall, Chat } from '@google/genai';
import { Luto, MiniLuto } from './components/Orb';
import { AgentStatus, Notification, ChatMessage, UploadedFile, Conversation, BackgroundTask, IntegrationCredentials, MediaItem, ProjectFile, CliHistoryItem } from './types';
import { connectToLiveSession, disconnectLiveSession, startChatSession, sendChatMessage, generateConversationTitle, type LiveSession, analyzeAudio, synthesizeSpeech, decode, decodeAudioData, analyzeCode, summarizeConversationsForMemory, generateConversationSummary, performWebSearch, searchYouTube, generateLyrics, analyzeAudioTone, blobToBase64 } from './services/geminiService';
import * as db from './services/supabaseService';
import { supabase } from './services/supabase';
import { DEFAULT_SYSTEM_PROMPT, DEV_TOOLS } from './constants';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import { MusicPlayer } from './components/MusicPlayer';
import { MusicStudio } from './components/MusicStudio';
import { DevConsole } from './components/DevConsole';
import { VideoLibrary } from './components/VideoLibrary';

// --- Python Execution Service (using Pyodide) ---
declare global {
    interface Window {
        loadPyodide: (config?: { indexURL: string }) => Promise<any>;
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

let pyodide: any = null;

const initializePyodide = async (): Promise<void> => {
    if (pyodide || typeof window.loadPyodide !== 'function') {
        return;
    }
    try {
        console.log("Loading Pyodide...");
        pyodide = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
        });
        console.log("Pyodide loaded successfully.");
    } catch (error) {
        console.error("Failed to load Pyodide:", error);
        throw new Error("Could not initialize Python environment.");
    }
};

interface PythonExecutionResult {
    output: string;
    error: string | null;
}

const executePython = async (code: string): Promise<PythonExecutionResult> => {
    if (!pyodide) {
        throw new Error("Pyodide is not initialized.");
    }

    try {
        let stdout = '';
        let stderr = '';
        pyodide.setStdout({ batched: (str: string) => { stdout += str + '\n'; } });
        pyodide.setStderr({ batched: (str: string) => { stderr += str + '\n'; } });

        await pyodide.runPythonAsync(code);

        return {
            output: stdout.trim(),
            error: stderr.trim() || null,
        };
    } catch (e: any) {
        return {
            output: '',
            error: e.message,
        };
    } finally {
        pyodide.setStdout({});
        pyodide.setStderr({});
    }
};

const ENROLLMENT_PHRASES = [
    "Alex, activate all security protocols for Master E.",
    "My voice is my password; authorize complete access.",
    "Execute command override sequence Alpha-Gamma-7.",
];

const BiometricsEnrollment: React.FC<{ onEnrollmentComplete: () => void; }> = ({ onEnrollmentComplete }) => {
    const [status, setStatus] = useState<'idle' | 'prompting' | 'recording' | 'processing' | 'done' | 'error'>('idle');
    const [currentStep, setCurrentStep] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const recordingTimeoutRef = useRef<number | null>(null);

    const cleanupAudio = useCallback(() => {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        streamRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
    }, []);
    
    useEffect(() => {
        return cleanupAudio;
    }, [cleanupAudio]);

    const setupAudio = async () => {
        if (streamRef.current) return true;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;
            analyserRef.current = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            return true;
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setErrorMsg("Microphone access is required for enrollment. Please enable it in your browser settings and refresh the page.");
            setStatus('error');
            return false;
        }
    };
    
    const startVisualization = () => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            animationFrameIdRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 1.5;
            let barHeight;
            let x = 0;
            
            for(let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] * 1.5;
                
                const r = barHeight + (25 * (i/bufferLength));
                const g = 200 * (i/bufferLength);
                const b = 50;
        
                ctx.fillStyle = `rgba(${r},${g},${b}, 0.8)`;
                ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight);
        
                x += barWidth + 1;
            }
        };
        draw();
    };

    const handleStartEnrollment = async () => {
        const audioReady = await setupAudio();
        if (audioReady) {
            setStatus('prompting');
        }
    };

    const handleStartRecording = () => {
        setStatus('recording');
        startVisualization();

        recordingTimeoutRef.current = window.setTimeout(() => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            setStatus('processing');

            setTimeout(() => {
                if (currentStep < ENROLLMENT_PHRASES.length - 1) {
                    setCurrentStep(prev => prev + 1);
                    setStatus('prompting');
                } else {
                    setStatus('done');
                    cleanupAudio();
                    setTimeout(onEnrollmentComplete, 2000);
                }
            }, 1500);

        }, 4000); // Record for 4 seconds
    };
    
    const getStatusContent = () => {
        const progressIndicator = (
            <div className="flex justify-center gap-2 mt-4">
                {ENROLLMENT_PHRASES.map((_, index) => (
                    <div key={index} className={`w-3 h-3 rounded-full transition-colors ${
                        index < currentStep ? 'bg-green-500' : 
                        index === currentStep ? 'bg-blue-500 animate-pulse' : 
                        'bg-gray-600'
                    }`}></div>
                ))}
            </div>
        );

        switch (status) {
            case 'idle':
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-2">Voice Biometrics Enrollment</h2>
                        <p className="text-white/70 mb-6">For enhanced security, we need to enroll your voiceprint, Master E.</p>
                        <button onClick={handleStartEnrollment} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-100">
                            Begin Enrollment
                        </button>
                    </>
                );
            case 'prompting':
                return (
                    <>
                        <p className="text-lg text-white/80 mb-2">Step {currentStep + 1} of {ENROLLMENT_PHRASES.length}</p>
                        <p className="text-2xl font-medium">Please say the following phrase clearly:</p>
                        <p className="text-3xl font-bold my-6 p-4 bg-white/5 rounded-lg border border-white/10">"{ENROLLMENT_PHRASES[currentStep]}"</p>
                        <button onClick={handleStartRecording} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-100">
                            Record Phrase
                        </button>
                        {progressIndicator}
                    </>
                );
            case 'recording':
                return (
                    <>
                        <p className="text-2xl font-bold text-red-500 mb-4 animate-pulse">RECORDING</p>
                        <p className="text-xl font-medium mt-2">"{ENROLLMENT_PHRASES[currentStep]}"</p>
                        <canvas ref={canvasRef} width="300" height="100" className="my-4"></canvas>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2 overflow-hidden">
                           <div className="bg-red-600 h-2.5 rounded-full animate-progress" style={{animationDuration: '4s'}}></div>
                        </div>
                        {progressIndicator}
                    </>
                );
            case 'processing':
                 return (
                    <>
                        <p className="text-2xl font-bold animate-pulse">Processing Voiceprint...</p>
                        {progressIndicator}
                    </>
                 );
            case 'done':
                return <p className="text-2xl font-bold text-green-400">Enrollment Complete. Welcome, Master E.</p>;
            case 'error':
                 return (
                    <>
                        <h2 className="text-2xl font-bold text-red-400 mb-4">Enrollment Failed</h2>
                        <p className="text-white/80 max-w-md">{errorMsg}</p>
                    </>
                 );
        }
    };
    
    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center text-center p-4">
            {getStatusContent()}
        </div>
    );
};

const ChatView: React.FC<{
    transcript: ChatMessage[];
    onSendMessage: (message: string) => void;
    onSwitchToVoice: () => void;
    uploadedFiles: UploadedFile[];
    onFileUpload: (files: FileList) => void;
    onOpenSidebar: () => void;
    agentStatus: AgentStatus;
}> = ({ transcript, onSendMessage, onSwitchToVoice, uploadedFiles, onFileUpload, onOpenSidebar, agentStatus }) => {
    const [input, setInput] = useState('');
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const handleSend = () => {
        if (input.trim()) {
            onSendMessage(input.trim());
            setInput('');
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onFileUpload(event.target.files);
            event.target.value = '';
        }
    };

    return (
        <div className="absolute inset-0 z-30 bg-black flex flex-col p-4 font-sans">
             <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-black opacity-30"></div>
            <header className="flex items-center justify-between pb-4 border-b border-white/10 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onOpenSidebar} className="p-2 rounded-full hover:bg-white/10 transition-all active:scale-95" aria-label="Open Conversation History">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    </button>
                    <h1 className="text-xl font-bold">Alex</h1>
                    <MiniLuto status={agentStatus} />
                </div>
                <button onClick={onSwitchToVoice} className="p-2 rounded-full hover:bg-white/10 transition-all active:scale-95" aria-label="Switch to Voice Mode">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
                </button>
            </header>
            <main className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent z-10">
                {transcript.map((msg) => (
                    <div key={msg.id} className={`flex mb-3 animate-chat-message-in ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.speaker === 'user' ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
                           <p className="text-white break-words" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}></p>
                        </div>
                    </div>
                ))}
                 {uploadedFiles.length > 0 && (
                    <div className="text-center my-4 text-gray-400 text-sm">
                        <p>Attached files: {uploadedFiles.map(f => f.name).join(', ')}</p>
                    </div>
                )}
                <div ref={transcriptEndRef} />
            </main>
            <footer className="flex items-center gap-2 pt-4 border-t border-white/10 z-10">
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" accept="*/*" />
                 <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full hover:bg-white/10 transition-all active:scale-95" aria-label="Attach File">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Message Alex..."
                    className="flex-1 bg-white/10 rounded-full px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button onClick={handleSend} className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-all active:scale-95" aria-label="Send Message">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </footer>
        </div>
    );
};


const App: React.FC = () => {
    const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOutputMuted, setIsOutputMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showCc, setShowCc] = useState(false);
    const [transcript, setTranscript] = useState<ChatMessage[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [view, setView] = useState<'voice' | 'chat'>('voice');
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMusicStudioOpen, setIsMusicStudioOpen] = useState(false);
    const [isDevConsoleOpen, setIsDevConsoleOpen] = useState(false);
    const [isVideoLibraryOpen, setIsVideoLibraryOpen] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
    const [integrations, setIntegrations] = useState<IntegrationCredentials>({
        storyAuth: { enabled: false, key: null },
        mux: { enabled: false, tokenId: null, tokenSecret: null },
    });
    const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
    const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
    const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
    const [isPyodideReady, setIsPyodideReady] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ toolCall: FunctionCall, source: 'voice' | 'chat' } | null>(null);

    // Dev Console State
    const [browserUrl, setBrowserUrl] = useState('about:blank');
    const [cliHistory, setCliHistory] = useState<CliHistoryItem[]>([
        { type: 'output', text: 'Alex CLI v1.0. Welcome, Master E.' }
    ]);

    // Music Player State
    const [playlist, setPlaylist] = useState<MediaItem[]>([]);
    const [currentTrack, setCurrentTrack] = useState<MediaItem | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [trackProgress, setTrackProgress] = useState({ currentTime: 0, duration: 0 });

    // Video Library State
    const [videoToPlay, setVideoToPlay] = useState<MediaItem | null>(null);
    
    const sessionRef = useRef<LiveSession | null>(null);
    const chatRef = useRef<Chat | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const userAudioStreamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<{ outputCtx: AudioContext, outputGain: GainNode, destinationNode: MediaStreamAudioDestinationNode | null } | null>(null);
    const analyserRef = useRef<{ input: AnalyserNode | null, output: AnalyserNode | null }>({ input: null, output: null });
    const audioPlayerRef = useRef<HTMLAudioElement>(null);
    const youtubePlayerRef = useRef<any>(null);
    const [isYouTubeApiReady, setIsYouTubeApiReady] = useState(false);
    const progressIntervalRef = useRef<number | null>(null);
    
    const toggleOutputMuteRef = useRef<((mute: boolean) => void) | null>(null);
    const isSavingRef = useRef(false);
    const autoSaveTimerRef = useRef<number | null>(null);

    const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    }, []);

    const endSession = useCallback(async () => {
        if (isRecording) {
            recorderRef.current?.stop();
            setIsRecording(false);
        }
        if (sessionRef.current) {
            await disconnectLiveSession(sessionRef.current, userAudioStreamRef.current, videoStreamRef.current);
            sessionRef.current = null;
            toggleOutputMuteRef.current = null;
            userAudioStreamRef.current = null;
            analyserRef.current = { input: null, output: null };
            if(audioContextRef.current) {
                audioContextRef.current.outputGain.disconnect();
                audioContextRef.current = null;
            }
            setAgentStatus('idle');
            if (isVideoEnabled) setIsVideoEnabled(false);
            addNotification('Voice session ended.');
        }
    }, [addNotification, isVideoEnabled, isRecording]);

    const handleNewConversation = useCallback(async (closeSidebar = true): Promise<Conversation> => {
        if (sessionRef.current) await endSession();
        const newConvo = await db.createConversation();
        const allConvos = await db.getConversations();
        setConversations(allConvos);
        setCurrentConversationId(newConvo.id);
        setTranscript([]);
        setUploadedFiles([]);
        chatRef.current = null;
        if(closeSidebar) setIsSidebarOpen(false);
        return newConvo;
    }, [endSession]);

    const initializeApp = useCallback(async () => {
        try {
            await db.signInAnonymouslyIfNeeded();
            const convos = await db.getConversations();
            setConversations(convos);
            let convoToLoad: Conversation | null = null;
    
            if (convos.length > 0) {
                convoToLoad = convos[0];
            } else {
                convoToLoad = await handleNewConversation(false);
            }
            
            if (convoToLoad) {
                setCurrentConversationId(convoToLoad.id);
                // Check for a local backup
                const backupRaw = localStorage.getItem(`alex_conversation_backup_${convoToLoad.id}`);
                if (backupRaw) {
                    try {
                        const backupHistory: ChatMessage[] = JSON.parse(backupRaw);
                        // Simple logic: if backup has more messages, it's likely newer.
                        if (backupHistory.length > convoToLoad.history.length) {
                            setTranscript(backupHistory);
                            addNotification("Restored unsaved changes from last session.", "info");
                        } else {
                            setTranscript(convoToLoad.history);
                        }
                    } catch (e) {
                        console.error("Failed to parse conversation backup:", e);
                        setTranscript(convoToLoad.history);
                    }
                } else {
                    setTranscript(convoToLoad.history);
                }
            }
            
            // Load media library from both Supabase Storage (for uploads) and localStorage (for links)
            const uploadedMedia = await db.listMediaFiles();
            const storedLinksRaw = localStorage.getItem('alex_media_library_links');
            const storedLinks = storedLinksRaw ? JSON.parse(storedLinksRaw) : [];
            const combinedLibrary = [...uploadedMedia, ...storedLinks];

            setMediaLibrary(combinedLibrary);
            setPlaylist(combinedLibrary.filter((item: MediaItem) => item.type === 'audio'));

        } catch (error) {
            console.error("Initialization failed:", error);
            addNotification("Failed to initialize the app.", "error");
        }
    }, [handleNewConversation, addNotification]);

    useEffect(() => {
        const enrolled = localStorage.getItem('alex_biometrics_enrolled') === 'true';
        setIsEnrolled(enrolled);

        const savedPrompt = localStorage.getItem('alex_system_prompt');
        if (savedPrompt) setSystemPrompt(savedPrompt);

        const savedIntegrations = localStorage.getItem('alex_integrations');
        if (savedIntegrations) {
            const parsed = JSON.parse(savedIntegrations);
            setIntegrations(prev => ({ ...prev, ...parsed }));
        }
        
        const savedProjectFiles = localStorage.getItem('alex_project_files');
        if(savedProjectFiles) setProjectFiles(JSON.parse(savedProjectFiles));

        if (enrolled) {
            initializeApp();
             // Initialize Pyodide in the background
            initializePyodide()
                .then(() => {
                    setIsPyodideReady(true);
                    addNotification("Python environment ready.", "success");
                })
                .catch(err => {
                    console.error("Failed to load Pyodide:", err);
                    addNotification("Failed to load Python environment.", "error");
                });
        }
    }, [isEnrolled, initializeApp, addNotification]);
    
    // Supabase Keep-Alive: Periodically refresh the session to prevent expiration.
    useEffect(() => {
        const keepAliveInterval = setInterval(async () => {
            try {
                // A lightweight query to keep the session active
                const { error } = await supabase.auth.getSession();
                if (error) throw error;
                console.log('Supabase session kept alive.');
            } catch (error) {
                console.error('Keep-alive ping failed:', error);
            }
        }, 5 * 60 * 1000); // every 5 minutes

        return () => clearInterval(keepAliveInterval);
    }, []);

    const handleEnrollmentComplete = () => {
        localStorage.setItem('alex_biometrics_enrolled', 'true');
        setIsEnrolled(true);
        addNotification('Voiceprint enrolled successfully.', 'success');
    };
    
    const addBackgroundTask = useCallback((message: string): number => {
        const id = Date.now();
        setBackgroundTasks(prev => [...prev, { id, message }]);
        return id;
    }, []);

    const updateBackgroundTask = useCallback((id: number, message: string) => {
        setBackgroundTasks(prev => prev.map(task => task.id === id ? { ...task, message } : task));
    }, []);

    const removeBackgroundTask = useCallback((id: number) => {
        setTimeout(() => {
            setBackgroundTasks(prev => prev.filter(task => task.id !== id));
        }, 3000);
    }, []);

    const checkAndGenerateTitle = useCallback(async (newHistory: ChatMessage[]) => {
        const currentConvo = conversations.find(c => c.id === currentConversationId);
        // To prevent spamming the API on every partial transcript (which causes rate limit errors),
        // only generate a title if it's the default, there's at least one user message
        // and one agent message, and the last message is from Alex. This ensures we only
        // try to generate a title after the first full exchange.
        if (currentConvo && currentConvo.title === 'New Conversation' && newHistory.length >= 2) {
            const lastMessage = newHistory[newHistory.length - 1];
            const secondLastMessage = newHistory[newHistory.length - 2];
            
            if (lastMessage.speaker === 'alex' && secondLastMessage.speaker === 'user') {
                 const title = await generateConversationTitle(newHistory);
                 if (currentConversationId) {
                     await db.updateConversationTitle(currentConversationId, title);
                     setConversations(convos => convos.map(c => c.id === currentConversationId ? {...c, title} : c));
                 }
            }
        }
    }, [conversations, currentConversationId]);

    const saveConversation = useCallback((conversationId: string | null, history: ChatMessage[]) => {
        if (!conversationId || history.length === 0 || isSavingRef.current) return;

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = window.setTimeout(() => {
            isSavingRef.current = true;
            console.log('Auto-saving conversation...');
            
            try {
                localStorage.setItem(`alex_conversation_backup_${conversationId}`, JSON.stringify(history));
            } catch (e) {
                console.error("Failed to save backup to local storage:", e);
            }

            db.saveConversationHistory(conversationId, history)
                .then(() => {
                    console.log('Conversation saved to Supabase.');
                    localStorage.removeItem(`alex_conversation_backup_${conversationId}`);
                })
                .catch(error => {
                    console.error("Failed to auto-save to Supabase:", error);
                    addNotification("Could not save conversation. Check connection.", "error");
                })
                .finally(() => {
                    isSavingRef.current = false;
                });
        }, 1000); // Debounce for 1 second
    }, [addNotification]);

    const updateTranscript = useCallback((speaker: 'user' | 'alex', text: string) => {
        if (!text) return;
        let newHistory: ChatMessage[] = [];
        setTranscript(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.speaker === speaker && !lastMessage.text.endsWith(' ')) {
                newHistory = [...prev.slice(0, -1), { ...lastMessage, text: lastMessage.text + text }];
            } else {
                newHistory = [...prev, { id: Date.now(), speaker, text }];
            }
            checkAndGenerateTitle(newHistory);
            
            if (speaker === 'alex' && currentConversationId) {
                saveConversation(currentConversationId, newHistory);
            }
            
            return newHistory;
        });
    }, [checkAndGenerateTitle, saveConversation, currentConversationId]);
    
    // Auto-save every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setTranscript(currentTranscript => {
                if (currentConversationId && currentTranscript.length > 0) {
                    saveConversation(currentConversationId, currentTranscript);
                }
                return currentTranscript;
            });
        }, 30000);

        return () => clearInterval(interval);
    }, [currentConversationId, saveConversation]);

    const playAudio = useCallback(async (base64Audio: string) => {
        if (!base64Audio) return;
    
        let localAudioContext = audioContextRef.current;
    
        if (!localAudioContext) {
            const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const outputGain = outputCtx.createGain();
            outputGain.connect(outputCtx.destination);
            localAudioContext = { outputCtx, outputGain, destinationNode: null };
            audioContextRef.current = localAudioContext;
        }
        
        const { outputCtx, outputGain } = localAudioContext;
    
        setAgentStatus('speaking');
        try {
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputGain);
            source.start();
        
            source.onended = () => {
                setAgentStatus(sessionRef.current ? 'listening' : 'idle');
            };
        } catch (error) {
            console.error("Failed to play audio:", error);
            addNotification("Error playing audio response.", "error");
            setAgentStatus(sessionRef.current ? 'listening' : 'idle');
        }
    }, [addNotification]);
    
    const handleAudioAnalysis = useCallback(async (audioBlob: globalThis.Blob, fileName?: string) => {
        addNotification(fileName ? `Analyzing ${fileName}...` : 'Analyzing your app idea...', 'info');
        setAgentStatus('executing');
        try {
            if (fileName) {
                updateTranscript('user', `(Uploaded audio for analysis: ${fileName})`);
            }
            const analysisText = await analyzeAudio(audioBlob);
            
            const confirmationPrompt = fileName 
                ? `Boss, in-analyze ko yung audio file na '${fileName}'. Eto yung nakuha ko: ${analysisText}. Tama ba, Boss?`
                : `Sige Boss, na-analyze ko na yung idea mo. Eto yung naintindihan ko: ${analysisText}. Tama ba ang pagkakaintindi ko, Boss?`;
            
            const audioBase64 = await synthesizeSpeech(confirmationPrompt);
            
            await playAudio(audioBase64);
            updateTranscript('alex', confirmationPrompt);

        } catch (error) {
            console.error("Audio analysis failed:", error);
            addNotification("Sorry, I couldn't analyze the audio.", "error");
            setAgentStatus(sessionRef.current ? 'listening' : 'idle');
        }
    }, [addNotification, updateTranscript, playAudio]);

    const handleSaveMediaLibrary = useCallback((newLibrary: MediaItem[]) => {
        // Detect removed items that were uploaded to storage
        const removedItems = mediaLibrary.filter(oldItem => 
            oldItem.source === 'upload' && !newLibrary.some(newItem => newItem.id === oldItem.id)
        );
    
        for (const item of removedItems) {
            db.deleteMediaFile(item.name);
        }
        
        setMediaLibrary(newLibrary);
        setPlaylist(newLibrary.filter(item => item.type === 'audio'));
        
        // Persist only non-uploaded items (links) to localStorage
        const nonUploadedItems = newLibrary.filter(item => item.source !== 'upload');
        localStorage.setItem('alex_media_library_links', JSON.stringify(nonUploadedItems));
    }, [mediaLibrary]); // Depends on mediaLibrary to compare old and new states

    const playTrack = useCallback((track: MediaItem) => {
        setCurrentTrack(track);
        setTrackProgress({ currentTime: 0, duration: 0 });
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }

        if (track.source === 'youtube' && track.youtubeId) {
            audioPlayerRef.current?.pause();
            if (youtubePlayerRef.current?.loadVideoById) {
                youtubePlayerRef.current.loadVideoById(track.youtubeId);
            }
        } else {
            youtubePlayerRef.current?.pauseVideo();
            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = track.url;
                audioPlayerRef.current.play();
            }
        }
    }, []);

    const handleNextTrack = useCallback(() => {
        if (!currentTrack || playlist.length < 2) return;
        const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
        const nextIndex = (currentIndex + 1) % playlist.length;
        playTrack(playlist[nextIndex]);
    }, [currentTrack, playlist, playTrack]);

    const handlePrevTrack = useCallback(() => {
        if (!currentTrack || playlist.length < 2) return;
        const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
        const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        playTrack(playlist[prevIndex]);
    }, [currentTrack, playlist, playTrack]);

    const handlePlayPause = useCallback(() => {
        if (!currentTrack) {
            if (playlist.length > 0) {
                playTrack(playlist[0]);
            }
            return;
        }
        if (isPlaying) {
            if (currentTrack.source === 'youtube') {
                youtubePlayerRef.current?.pauseVideo();
            } else {
                audioPlayerRef.current?.pause();
            }
        } else {
            if (currentTrack.source === 'youtube') {
                youtubePlayerRef.current?.playVideo();
            } else {
                audioPlayerRef.current?.play();
            }
        }
    }, [isPlaying, currentTrack, playlist, playTrack]);

    const handleSeek = useCallback((time: number) => {
        if (!currentTrack || !isFinite(time)) return;

        if (currentTrack.source === 'youtube' && youtubePlayerRef.current?.seekTo) {
            youtubePlayerRef.current.seekTo(time, true);
        } else if (audioPlayerRef.current) {
            audioPlayerRef.current.currentTime = time;
        }
        setTrackProgress(prev => ({ ...prev, currentTime: time }));
    }, [currentTrack]);

    const handleRunCliCommand = useCallback(async (command: string): Promise<string> => {
        setCliHistory(prev => [...prev, { type: 'command', text: command }]);
    
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 800));
    
        let output = '';
        const [cmd, ...args] = command.trim().split(' ');
    
        switch (cmd.toLowerCase()) {
            case 'help':
                output = 'Available commands: ls, git status, ping <host>, echo <...text>, clear';
                break;
            case 'ls':
                output = 'README.md  package.json  src/  node_modules/  dist/';
                break;
            case 'git':
                if (args[0] === 'status') {
                    output = `On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean`;
                } else {
                    output = `git: '${args[0] || ''}' is not a git command. See 'git --help'.`;
                }
                break;
            case 'ping':
                const host = args[0] || 'google.com';
                output = `Pinging ${host}...\nReply from 8.8.8.8: bytes=32 time=10ms TTL=117\nReply from 8.8.8.8: bytes=32 time=11ms TTL=117`;
                break;
            case 'echo':
                output = args.join(' ');
                break;
            case 'clear':
                setCliHistory([{ type: 'output', text: 'Console cleared.' }]);
                return 'Console cleared.';
            default:
                output = `command not found: ${command}`;
        }
    
        setCliHistory(prev => [...prev, { type: 'output', text: output }]);
        return output;
    }, []);

    const executeToolCall = useCallback(async (fc: FunctionCall, source: 'voice' | 'chat') => {
        if (source === 'voice') setAgentStatus('executing');
        const taskId = addBackgroundTask(`Executing: ${fc.name}...`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        let result: string | object = `Successfully executed ${fc.name}.`;

        try {
            switch (fc.name) {
                 case 'saveMemory': {
                    if (!currentConversationId) {
                        result = "Error: No active conversation to save.";
                        break;
                    }
                    updateBackgroundTask(taskId, `Saving notes to long-term memory...`);
                    const summary = await generateConversationSummary(transcript);
                    await db.updateConversationSummary(currentConversationId, summary);
                    result = `Sige Boss, na-save ko na sa memory ko.`;
                    break;
                }
                case 'listPipelines':
                    result = "Available pipelines: production-deploy, staging-deploy, run-tests.";
                    break;
                case 'getPipelineStatus': {
                    const pipelineName = fc.args.pipelineName as string;
                    updateBackgroundTask(taskId, `Checking status for '${pipelineName}'...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const statuses = ['Succeeded', 'Failed', 'In Progress'];
                    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                    result = `Pipeline '${pipelineName}' last run status: ${randomStatus}.`;
                    break;
                }
                case 'triggerPipeline': {
                    const pipelineName = fc.args.pipelineName as string;
                    updateBackgroundTask(taskId, `Triggering pipeline '${pipelineName}'...`);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    updateBackgroundTask(taskId, `Pipeline '${pipelineName}' is now running.`);
                    result = `Sige Boss, I've triggered the '${pipelineName}' pipeline. I'll monitor it for you.`;

                    // Simulate the pipeline running in the background
                    setTimeout(() => {
                        const finalTaskId = addBackgroundTask(`Monitoring pipeline '${pipelineName}'...`);
                        setTimeout(() => {
                            updateBackgroundTask(finalTaskId, `Pipeline '${pipelineName}' completed successfully.`);
                            removeBackgroundTask(finalTaskId);
                        }, 5000 + Math.random() * 3000); 
                    }, 2000);
                    break;
                }
                case 'invokeCodingAgent': {
                    const task = fc.args.task as string;
                    const fileName = fc.args.fileName as string;
                    const file = projectFiles.find(f => f.name === fileName);
                    
                    if (!file) {
                        result = `Error: Project file '${fileName}' not found, Boss. Paki-upload muna sa settings.`;
                    } else {
                        updateBackgroundTask(taskId, `Coding agent analyzing '${fileName}'...`);
                        await new Promise(resolve => setTimeout(resolve, 2500));
                        updateBackgroundTask(taskId, `Agent working on: ${task}`);
                        await new Promise(resolve => setTimeout(resolve, 4000));
                        result = `Sige Boss, the coding agent has completed the task on '${fileName}'. Ready for review.`;
                    }
                    break;
                }
                case 'generateImage':
                    result = `Sige Boss, generating image based on: "${fc.args.prompt}". It will be ready in a moment.`;
                    addNotification('Simulating image generation...', 'info');
                    break;
                case 'editImage':
                    result = `Okay, editing the image "${fc.args.fileName}" with your instructions.`;
                    addNotification('Simulating image editing...', 'info');
                    break;
                case 'createSong': {
                    const prompt = fc.args.prompt as string;
                    const genre = fc.args.genre as string | undefined;
                    updateBackgroundTask(taskId, `Writing a ${genre || ''} song about "${prompt}"...`);
                    const lyrics = await generateLyrics(prompt, genre);
                    result = `Sige Boss, eto na yung sinulat kong kanta para sa'yo:\n\n${lyrics}`;
                    break;
                }
                case 'analyzeSongTone': {
                    const fileName = fc.args.fileName as string;
                    const fileToAnalyze = uploadedFiles.find(f => f.name === fileName && f.file);
                    if (!fileToAnalyze) {
                        result = `Error: Hindi ko mahanap yung file na "${fileName}", Boss. Paki-upload muna.`;
                        break;
                    }
                    updateBackgroundTask(taskId, `Analyzing the tone of "${fileName}"...`);
                    result = await analyzeAudioTone(fileToAnalyze.file!);
                    break;
                }
                case 'singLyrics': {
                    const lyrics = fc.args.lyrics as string;
                    const tone = fc.args.tone as string;
                    const singPrompt = `Sing the following lyrics in a ${tone} tone. Emphasize the emotion. Do not speak, sing.\n\nLyrics:\n${lyrics}`;
                    updateBackgroundTask(taskId, `Warming up my vocal cords...`);
                    try {
                        const audioBase64 = await synthesizeSpeech(singPrompt);
                        await playAudio(audioBase64);
                        result = `Sige Boss, kakantahin ko na. Ehem...`;
                    } catch (error) {
                        console.error("Singing failed:", error);
                        addNotification("Sorry, my voice is a bit hoarse. I couldn't sing.", "error");
                        result = "Sorry, my voice is a bit hoarse right now.";
                    }
                    break;
                }
                case 'playMusic': {
                    if (playlist.length === 0) {
                        result = "The music library is empty, Boss. Mag-add muna tayo galing YouTube.";
                        break;
                    }
                    const trackName = fc.args.trackName as string | undefined;
                    let trackToPlay: MediaItem | undefined = undefined;

                    if (trackName) {
                        trackToPlay = playlist.find(t => t.name.toLowerCase().includes(trackName.toLowerCase()));
                    } else if (currentTrack && !isPlaying) {
                        handlePlayPause();
                        result = `Sige Boss, resuming music.`;
                        break;
                    } else if (!currentTrack) {
                        trackToPlay = playlist[0];
                    }

                    if (trackToPlay) {
                        playTrack(trackToPlay);
                        result = `Now playing: "${trackToPlay.name}". Sige, Boss.`;
                    } else if (trackName) {
                        result = `I couldn't find "${trackName}" in the library, Boss.`;
                    } else {
                        result = `Music is already playing, Boss.`;
                    }
                    break;
                }
                case 'pauseMusic':
                    if (isPlaying) handlePlayPause();
                    result = "Music paused.";
                    break;
                case 'resumeMusic':
                    if (!isPlaying) handlePlayPause();
                    result = "Sige, resuming music.";
                    break;
                case 'nextTrack':
                    handleNextTrack();
                    result = `Sige, next track.`;
                    break;
                case 'previousTrack': 
                    handlePrevTrack();
                    result = `Sige, previous track.`;
                    break;
                case 'listPlaylist':
                    if (playlist.length === 0) {
                        result = "The playlist is empty, Boss.";
                    } else {
                        const trackList = playlist.map((t, i) => `${i + 1}. ${t.name}`).join('\n');
                        result = `Here's what's in the playlist:\n${trackList}`;
                    }
                    break;
                 case 'searchYouTubeAndAddToPlaylist': {
                    const query = fc.args.query as string;
                    updateBackgroundTask(taskId, `Searching YouTube for "${query}"...`);
                    const newTrack = await searchYouTube(query);
                    if (newTrack) {
                        const newMediaItem: MediaItem = {
                            id: Date.now(),
                            ...newTrack
                        } as MediaItem;
                        handleSaveMediaLibrary([...mediaLibrary, newMediaItem]);
                        result = `Sige Boss, I found "${newTrack.name}" on YouTube and added it to your playlist.`;
                    } else {
                        result = `Sorry Boss, I couldn't find anything for "${query}" on YouTube right now.`;
                    }
                    break;
                 }
                case 'listVideos': {
                    const videos = mediaLibrary.filter(item => item.type === 'video');
                    if (videos.length === 0) {
                        result = "The video library is empty, Boss.";
                    } else {
                        const videoList = videos.map((v, i) => `${i + 1}. ${v.name}`).join('\n');
                        result = `Here are the videos in the library:\n${videoList}`;
                    }
                    break;
                }
                case 'playVideo': {
                    const videoName = fc.args.videoName as string;
                    const videoToPlay = mediaLibrary.find(item => item.type === 'video' && item.name.toLowerCase().includes(videoName.toLowerCase()));
                    if (videoToPlay) {
                        setIsVideoLibraryOpen(true);
                        setVideoToPlay(videoToPlay);
                        result = `Sige Boss, playing "${videoToPlay.name}".`;
                    } else {
                        result = `Sorry Boss, I couldn't find a video named "${videoName}".`;
                    }
                    break;
                }
                case 'listFiles':
                    result = uploadedFiles.length > 0 ? `Current files: ${uploadedFiles.map(f => f.name).join(', ')}` : "No files have been uploaded yet.";
                    break;
                case 'analyzeFileContents': {
                    const fileName = fc.args.fileName as string;
                    updateBackgroundTask(taskId, `Analyzing code in "${fileName}"...`);

                    const uploadedFile = uploadedFiles.find(f => f.name === fileName);
                    if (uploadedFile?.file) {
                        try {
                            const content = await blobToBase64(uploadedFile.file);
                            result = await analyzeCode(uploadedFile.name, content);
                        } catch (e: any) {
                            result = `Error reading file ${fileName}: ${e.message}`;
                        }
                        break;
                    }
                    
                    const projectFile = projectFiles.find(f => f.name === fileName);
                    if (projectFile) {
                        result = await analyzeCode(projectFile.name, projectFile.content);
                        break;
                    }
                    
                    result = `Error: File '${fileName}' not found, Boss. Paki-upload muna sa chat o i-save sa project settings.`;
                    break;
                }
                case 'extractZipArchive':
                case 'writeFile': {
                    const fileName = fc.args.fileName as string;
                    if (!uploadedFiles.some(f => f.name === fileName)) result = `Error: File '${fileName}' not found.`;
                    else result = `Action '${fc.name}' on file '${fileName}' was successful.`;
                    break;
                }
                case 'searchWeb': {
                    const query = fc.args.query as string;
                    updateBackgroundTask(taskId, `Searching web for: "${query}"...`);
                    result = await performWebSearch(query);
                    break;
                }
                case 'cloneWebsite': {
                    const url = fc.args.url as string;
                    updateBackgroundTask(taskId, `Cloning ${url}...`);
                    setIsDevConsoleOpen(true);
                    setBrowserUrl(url); // Show the website in the dev console
                    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
                    result = `Successfully cloned ${url} to local directory. You can see the site in the Dev Console.`;
                    break;
                }
                case 'browseUrl': {
                    const url = fc.args.url as string;
                    updateBackgroundTask(taskId, `Opening browser to: ${url}...`);
                    setIsDevConsoleOpen(true);
                    setBrowserUrl(url);
                    result = `Browser is now navigating to ${url}.`;
                    break;
                }
                case 'runCliCommand': {
                    const command = fc.args.command as string;
                    updateBackgroundTask(taskId, `Running CLI command: "${command}"...`);
                    setIsDevConsoleOpen(true);
                    result = await handleRunCliCommand(command);
                    break;
                }
                case 'runBrowserAutomation': {
                    const url = fc.args.url as string;
                    const task = fc.args.task as string;
                    updateBackgroundTask(taskId, `Running browser automation on ${url}...`);
                    setIsDevConsoleOpen(true);
                    setBrowserUrl(url); // Show the page being automated
                    await new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 2000));
                    result = `Sige Boss, I've completed the browser automation task on ${url}: "${task}". The results have been saved.`;
                    break;
                }
                case 'runPythonScript': {
                     updateBackgroundTask(taskId, `Running python script...`);
                      if (!isPyodideReady) {
                        result = "Python environment is not ready. Please wait a moment and try again.";
                        addNotification("Pyodide is still initializing.", "info");
                        break;
                     }
                     try {
                        const code = fc.args.code as string;
                        result = await executePython(code);
                     } catch(e: any) {
                        result = { output: '', error: `Failed to execute Python script: ${e.message}` };
                     }
                     break;
                }
                case 'readEmails':
                    result = `Found 3 unread emails. Subject of the latest is: 'URGENT: Project Phoenix Update' from 'client@example.com'.`;
                    break;
                case 'sendEmail':
                     result = `Email to ${fc.args.to} with subject "${fc.args.subject}" has been sent successfully.`;
                     break;
                case 'executeComplexTask':
                    updateBackgroundTask(taskId, `Executing complex task: ${fc.args.description}`);
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    result = `Complex task "${fc.args.description}" completed successfully. All systems are nominal.`;
                    break;
                case 'rollbackDeployment':
                case 'runDeployment':
                    const env = fc.args.environment as string;
                    updateBackgroundTask(taskId, `${fc.name === 'runDeployment' ? 'Deploying to' : 'Rolling back'} ${env}...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    result = `Successfully completed ${fc.name} for ${env} environment.`;
                    break;
                default:
                    result = `Successfully executed ${fc.name}.`;
            }
        } catch (e: any) {
            result = `Error executing ${fc.name}: ${e.message}`;
        }


        if (typeof result === 'string' && result.startsWith('Error')) addNotification(result, 'error');
        updateBackgroundTask(taskId, typeof result === 'string' ? result : JSON.stringify(result));
        removeBackgroundTask(taskId);

        if (source === 'voice' && sessionRef.current) {
            sessionRef.current.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } });
             setAgentStatus('listening');
        } else if (source === 'chat' && chatRef.current) {
             const toolResponse = await sendChatMessage(chatRef.current, "", [{
                functionResponse: { name: fc.name, response: { result } }
            }]);
            updateTranscript('alex', toolResponse.text);
        }

        return result;
    }, [addNotification, uploadedFiles, addBackgroundTask, updateBackgroundTask, removeBackgroundTask, mediaLibrary, isPyodideReady, projectFiles, currentConversationId, transcript, playlist, currentTrack, isPlaying, playTrack, handlePlayPause, handleNextTrack, handlePrevTrack, handleSaveMediaLibrary, playAudio, updateTranscript, handleRunCliCommand]);

    const handleToolCall = useCallback(async (fc: FunctionCall, source: 'voice' | 'chat') => {
        const IMPACTFUL_TOOLS = [
            'runDeployment', 
            'rollbackDeployment', 
            'triggerPipeline', 
            'runBrowserAutomation', 
            'writeFile', 
            'cloneWebsite', 
            'sendEmail', 
            'executeComplexTask'
        ];

        if (IMPACTFUL_TOOLS.includes(fc.name)) {
            setPendingAction({ toolCall: fc, source });
            const actionDescription = fc.args.pipelineName || fc.args.task || fc.args.description || `${fc.name} on ${fc.args.environment || fc.args.url || ''}`;
            const confirmationQuestion = `Confirm ko lang Boss, ito po ang gagawin natin: "${actionDescription}". Tama po ba? Tuloy ko na?`;
            
            updateTranscript('alex', confirmationQuestion);

            if (source === 'voice') {
                try {
                    const audioBase64 = await synthesizeSpeech(confirmationQuestion);
                    await playAudio(audioBase64);
                } catch (e) {
                    console.error("Could not synthesize confirmation speech:", e);
                }
            }
            return;
        }

        await executeToolCall(fc, source);
    }, [updateTranscript, playAudio, executeToolCall]);
    
    const processConfirmation = useCallback(async (userResponse: string) => {
        if (!pendingAction) return;
        
        const positiveResponses = ['yes', 'sige', 'oo', 'go', 'confirm', 'tuloy mo'];
        const isConfirmed = positiveResponses.some(w => userResponse.toLowerCase().includes(w));
        
        const actionToExecute = pendingAction;
        setPendingAction(null);

        if (isConfirmed) {
            const confirmationMessage = "Sige Boss, executing now.";
            updateTranscript('alex', confirmationMessage);
            if (actionToExecute.source === 'voice') {
                synthesizeSpeech(confirmationMessage).then(playAudio).catch(console.error);
            }
            await executeToolCall(actionToExecute.toolCall, actionToExecute.source);
        } else {
            const cancelMsg = "Okay Boss, cancelled.";
            updateTranscript('alex', cancelMsg);
            if (actionToExecute.source === 'voice') {
                synthesizeSpeech(cancelMsg).then(playAudio).catch(console.error);
            }
            
            // Send a "cancelled" response to the model so it knows the tool call is finished.
            if (actionToExecute.source === 'voice' && sessionRef.current) {
                 sessionRef.current.sendToolResponse({ functionResponses: {
                     id: actionToExecute.toolCall.id,
                     name: actionToExecute.toolCall.name,
                     response: { result: "Action cancelled by user." }
                 }});
            } else if (actionToExecute.source === 'chat' && chatRef.current) {
                const toolResponse = await sendChatMessage(chatRef.current, "", [{
                    functionResponse: { name: actionToExecute.toolCall.name, response: { result: "Action cancelled by user." } }
                }]);
                updateTranscript('alex', toolResponse.text);
             }
        }
    }, [pendingAction, executeToolCall, updateTranscript, playAudio]);

    const startSession = useCallback(async () => {
        try {
            setAgentStatus('recalling');
            const recentConvos = conversations.slice(0, 5);
            const memoryContext = await summarizeConversationsForMemory(recentConvos);
            
            setAgentStatus('verifying');
            await new Promise(resolve => setTimeout(resolve, 1500));

            setAgentStatus('connecting');
            const { session, audioStream, toggleOutputMute, outputAudioContext, outputGainNode, inputAnalyser, outputAnalyser } = await connectToLiveSession({
                systemInstruction: systemPrompt + memoryContext,
                tools: [{ functionDeclarations: DEV_TOOLS }],
                videoElement: isVideoEnabled ? videoRef.current : null,
                history: transcript,
                onSpeaking: () => setAgentStatus('speaking'),
                onIdle: () => setAgentStatus('listening'),
                onToolCall: (fc) => handleToolCall(fc, 'voice'),
                onTranscriptionUpdate: (speaker, text) => {
                     updateTranscript(speaker, text);
                    if (speaker === 'user' && pendingAction && pendingAction.source === 'voice') {
                       processConfirmation(text);
                    }
                },
                onError: (e) => {
                    console.error("Session error:", e);
                    addNotification('An error occurred. Session closed.', 'error');
                    endSession();
                },
            });
            sessionRef.current = session;
            userAudioStreamRef.current = audioStream;
            toggleOutputMuteRef.current = toggleOutputMute;
            audioContextRef.current = { outputCtx: outputAudioContext, outputGain: outputGainNode, destinationNode: outputAudioContext.createMediaStreamDestination() };
            analyserRef.current = { input: inputAnalyser, output: outputAnalyser };
            setAgentStatus('listening');
        } catch (error) {
            console.error('Failed to start session:', error);
            addNotification('Failed to connect. Check permissions.', 'error');
            setAgentStatus('idle');
        }
    }, [addNotification, handleToolCall, updateTranscript, endSession, isVideoEnabled, transcript, systemPrompt, conversations, pendingAction, processConfirmation]);
    
    const handleToggleRecording = useCallback(() => {
        if (isRecording) {
            recorderRef.current?.stop();
            setIsRecording(false);
            addNotification('Recording stopped. Processing...', 'info');
        } else {
            if (userAudioStreamRef.current && audioContextRef.current) {
                const { outputGain, destinationNode } = audioContextRef.current;
                
                if (!destinationNode) {
                     addNotification('Cannot start recording: recording components not ready.', 'error');
                     return;
                }
                outputGain.connect(destinationNode);

                const combinedStream = new MediaStream();
                userAudioStreamRef.current.getAudioTracks().forEach(track => combinedStream.addTrack(track.clone()));
                destinationNode.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track.clone()));
                
                const recorder = new MediaRecorder(combinedStream, { mimeType: 'audio/webm;codecs=opus' });
                recorderRef.current = recorder;

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunksRef.current.push(event.data);
                    }
                };

                recorder.onstop = async () => {
                    const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm;codecs=opus' });
                    
                    if (currentConversationId) {
                        await db.uploadRecording(currentConversationId, audioBlob);
                        addNotification('Recording uploaded.', 'success');
                    }
                    
                    handleAudioAnalysis(audioBlob);

                    recordedChunksRef.current = [];
                    combinedStream.getTracks().forEach(track => track.stop());
                    if (destinationNode) outputGain.disconnect(destinationNode);
                };

                recorder.start();
                setIsRecording(true);
                addNotification('Recording started for app analysis.', 'info');
            } else {
                addNotification('Cannot start recording: session not active.', 'error');
            }
        }
    }, [isRecording, addNotification, currentConversationId, handleAudioAnalysis]);


    const handleSelectConversation = async (id: string) => {
        if (id === currentConversationId) {
            setIsSidebarOpen(false);
            return;
        }
        await endSession();
        const convo = await db.getConversation(id);
        if (convo) {
            // This update call also triggers the last_accessed_at timestamp update via the DB trigger
            await db.updateConversationTitle(convo.id, convo.title);
            setCurrentConversationId(convo.id);
            setTranscript(convo.history);
            setUploadedFiles([]);
            chatRef.current = null;
        }
        setIsSidebarOpen(false);
    };

    const handleSwitchToChat = async () => {
        await endSession();
        chatRef.current = await startChatSession(transcript, systemPrompt);
        setView('chat');
        addNotification("Switched to chat mode.");
    };

    const handleSwitchToVoice = () => {
        chatRef.current = null;
        setView('voice');
    };

    const handleSendTextMessage = async (message: string) => {
        updateTranscript('user', message);

        if (pendingAction && pendingAction.source === 'chat') {
            await processConfirmation(message);
            return;
        }

        if (!chatRef.current) {
            setAgentStatus('recalling');
            const recentConvos = conversations.slice(0, 5);
            const memoryContext = await summarizeConversationsForMemory(recentConvos);
            chatRef.current = await startChatSession(transcript, systemPrompt + memoryContext);
            setAgentStatus('idle');
        }
        
        try {
            setAgentStatus('executing');
            const response = await sendChatMessage(chatRef.current, message);
            if(response.functionCalls && response.functionCalls.length > 0){
                 for(const fc of response.functionCalls){
                    await handleToolCall(fc, 'chat');
                 }
            } else {
                updateTranscript('alex', response.text);
            }
        } catch (error) {
            console.error("Chat error:", error);
            addNotification("Failed to send message.", "error");
        } finally {
            setAgentStatus('idle');
        }
    };
    
    const handleFileUpload = (files: FileList | null) => {
        if (!files) return;

        const newFiles: UploadedFile[] = Array.from(files).map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            file: file, // Store the actual File object for later use
        }));

        setUploadedFiles(prev => [...prev, ...newFiles]);
        addNotification(`${newFiles.length} file(s) attached.`, 'success');
    };

    const handleMediaFileUpload = async (file: File) => {
        const taskId = addBackgroundTask(`Uploading ${file.name}...`);
        try {
            const newMediaItem = await db.uploadMediaFile(file);
            if (newMediaItem) {
                // Use a function for setMediaLibrary to get the latest state
                setMediaLibrary(prevLibrary => {
                    const updatedLibrary = [...prevLibrary, newMediaItem];
                    // Also update playlist and localStorage inside this updater
                    setPlaylist(updatedLibrary.filter(item => item.type === 'audio'));
                    const nonUploadedItems = updatedLibrary.filter(item => item.source !== 'upload');
                    localStorage.setItem('alex_media_library_links', JSON.stringify(nonUploadedItems));
                    return updatedLibrary;
                });
                updateBackgroundTask(taskId, `Successfully uploaded ${file.name}.`);
            } else {
                throw new Error('Upload failed to return media item.');
            }
        } catch (error) {
            console.error('Media upload failed:', error);
            addNotification(`Failed to upload ${file.name}.`, 'error');
            updateBackgroundTask(taskId, `Upload failed for ${file.name}.`);
        } finally {
            removeBackgroundTask(taskId);
        }
    };

    const handleSaveSystemPrompt = (prompt: string) => {
        setSystemPrompt(prompt);
        localStorage.setItem('alex_system_prompt', prompt);
        addNotification('System prompt updated.', 'success');
    };

    const handleSaveIntegration = (name: string, creds: any) => {
        const newIntegrations = { ...integrations, [name]: creds };
        setIntegrations(newIntegrations);
        localStorage.setItem('alex_integrations', JSON.stringify(newIntegrations));
        addNotification(`${name} integration updated.`, 'success');
    };

    const handleSaveStoryAuth = (authConfig: { enabled: boolean; key: string | null; }) => {
        const newIntegrations = { 
            ...integrations, 
            storyAuth: authConfig
        };
        setIntegrations(newIntegrations);
        localStorage.setItem('alex_integrations', JSON.stringify(newIntegrations));
        addNotification(`Story Auth settings updated.`);
    };

    const handleSaveMux = (muxConfig: { enabled: boolean; tokenId: string | null; tokenSecret: string | null; }) => {
        const newIntegrations = { 
            ...integrations, 
            mux: muxConfig
        };
        setIntegrations(newIntegrations);
        localStorage.setItem('alex_integrations', JSON.stringify(newIntegrations));
        addNotification(`Mux settings updated.`);
    };

    const runCliAgentAnalysis = useCallback(async (newFiles: ProjectFile[]) => {
        if (newFiles.length === 0) return;

        addNotification('New project files detected. CLI agent starting analysis...', 'info');
        const taskId = addBackgroundTask('CLI Agent: Initializing...');

        await new Promise(resolve => setTimeout(resolve, 1500));
        updateBackgroundTask(taskId, `CLI Agent: Creating project directory...`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        let agentReport = "#### **CLI Agent Auto-Analysis Report**\n\n";

        for (const file of newFiles) {
            updateBackgroundTask(taskId, `CLI Agent: Analyzing ${file.name}...`);
            
            const isTextFile = file.type.startsWith('text/') || 
                               ['application/javascript', 'application/json', 'application/typescript', 'application/xml', 'text/x-python'].includes(file.type) ||
                               !file.type || file.name.endsWith('.py') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.html') || file.name.endsWith('.css');

            if (isTextFile) {
                const analysisResult = await analyzeCode(file.name, file.content);
                const reportForFile = `### Analysis for \`${file.name}\`\n\n${analysisResult}\n\n---\n\n`;
                agentReport += reportForFile;
            } else {
                const nonTextReport = `### Analysis for \`${file.name}\`\n\n*Skipped analysis: File does not appear to be a text-based code file (MIME type: ${file.type}).*\n\n---\n\n`;
                agentReport += nonTextReport;
            }
        }

        updateTranscript('alex', agentReport);
        
        const summaryMessage = "Sige Boss, tapos na ang analysis ng agent. Yung detailed report, nilagay ko na sa transcript para ma-review mo.";
        updateTranscript('alex', summaryMessage);

        updateBackgroundTask(taskId, `CLI Agent: Project analysis complete.`);
        removeBackgroundTask(taskId);
        
        if (agentStatus !== 'idle' && agentStatus !== 'connecting' && agentStatus !== 'verifying' && agentStatus !== 'recalling') {
            try {
                const audioBase64 = await synthesizeSpeech(summaryMessage);
                await playAudio(audioBase64);
            } catch (error) {
                console.error("Failed to synthesize confirmation speech:", error);
            }
        }

    }, [addBackgroundTask, updateBackgroundTask, removeBackgroundTask, addNotification, updateTranscript, playAudio, agentStatus]);


    const handleSaveProjectFiles = (files: ProjectFile[]) => {
        const newlyAddedFiles = files.filter(f => !projectFiles.some(pf => pf.name === f.name));
        
        setProjectFiles(files);
        localStorage.setItem('alex_project_files', JSON.stringify(files));
        addNotification(`${files.length} project file(s) saved.`, 'success');

        if (newlyAddedFiles.length > 0) {
            runCliAgentAnalysis(newlyAddedFiles);
        }
    };
    
    // --- YouTube Player Setup ---
    const onPlayerStateChange = useCallback((event: any) => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }

        if (window.YT) {
            const { PlayerState } = window.YT;
            if (event.data === PlayerState.PLAYING) {
                setIsPlaying(true);
                progressIntervalRef.current = window.setInterval(() => {
                    if (youtubePlayerRef.current?.getCurrentTime && youtubePlayerRef.current?.getDuration) {
                        const currentTime = youtubePlayerRef.current.getCurrentTime();
                        const duration = youtubePlayerRef.current.getDuration();
                        setTrackProgress({ currentTime, duration });
                    }
                }, 500);
            } else if (event.data === PlayerState.PAUSED) {
                setIsPlaying(false);
            } else if (event.data === PlayerState.ENDED) {
                setIsPlaying(false);
                handleNextTrack();
            }
        }
    }, [handleNextTrack]);

    useEffect(() => {
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                setIsYouTubeApiReady(true);
            };
        } else if (window.YT) {
            setIsYouTubeApiReady(true);
        }

        return () => {
            if (window.onYouTubeIframeAPIReady) {
                delete window.onYouTubeIframeAPIReady;
            }
             if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isYouTubeApiReady && !youtubePlayerRef.current) {
            youtubePlayerRef.current = new window.YT.Player('youtube-player-container', {
                height: '1',
                width: '1',
                playerVars: {
                    playsinline: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                },
                events: {
                    'onReady': () => console.log("YouTube Player is ready."),
                    'onStateChange': onPlayerStateChange,
                },
            });
        }
    }, [isYouTubeApiReady, onPlayerStateChange]);
    
    // --- Audio Player Event Listeners ---
    useEffect(() => {
        const audioEl = audioPlayerRef.current;
        if (!audioEl) return;

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => handleNextTrack();
        const onTimeUpdate = () => {
            if (audioEl.duration) {
                setTrackProgress({ currentTime: audioEl.currentTime, duration: audioEl.duration });
            }
        };
        const onLoadedMetadata = () => {
             if (audioEl.duration) {
                setTrackProgress({ currentTime: audioEl.currentTime, duration: audioEl.duration });
            }
        }

        audioEl.addEventListener('play', onPlay);
        audioEl.addEventListener('pause', onPause);
        audioEl.addEventListener('ended', onEnded);
        audioEl.addEventListener('timeupdate', onTimeUpdate);
        audioEl.addEventListener('loadedmetadata', onLoadedMetadata);

        return () => {
            audioEl.removeEventListener('play', onPlay);
            audioEl.removeEventListener('pause', onPause);
            audioEl.removeEventListener('ended', onEnded);
            audioEl.removeEventListener('timeupdate', onTimeUpdate);
            audioEl.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
    }, [handleNextTrack]);

    // --- Media Session API for Background Playback ---
    useEffect(() => {
        if ('mediaSession' in navigator) {
            if (currentTrack) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: currentTrack.name,
                    artist: currentTrack.source === 'youtube' ? 'YouTube' : 'Library',
                    album: "Alex's Playlist",
                    // A placeholder artwork
                    artwork: [
                        { src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath d=%22M9 18V5l12-2v13M12 18V5%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222%22/%3E%3C/svg%3E', type: 'image/svg+xml', sizes: '512x512' },
                    ]
                });

                navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
                
                // Set up action handlers for lock screen/notification controls
                navigator.mediaSession.setActionHandler('play', handlePlayPause);
                navigator.mediaSession.setActionHandler('pause', handlePlayPause);
                navigator.mediaSession.setActionHandler('nexttrack', playlist.length > 1 ? handleNextTrack : null);
                navigator.mediaSession.setActionHandler('previoustrack', playlist.length > 1 ? handlePrevTrack : null);

            } else {
                // Clear metadata and handlers when no track is active
                navigator.mediaSession.metadata = null;
                navigator.mediaSession.playbackState = 'none';
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('nexttrack', null);
                navigator.mediaSession.setActionHandler('previoustrack', null);
            }
        }
        
        // Cleanup function
        return () => {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = null;
                navigator.mediaSession.playbackState = 'none';
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('nexttrack', null);
                navigator.mediaSession.setActionHandler('previoustrack', null);
            }
        };

    }, [currentTrack, isPlaying, playlist, handlePlayPause, handleNextTrack, handlePrevTrack]);


    const toggleSession = useCallback(() => { agentStatus !== 'idle' ? endSession() : startSession(); }, [endSession, startSession, agentStatus]);
    const handleToggleOutputMute = () => { const mute = !isOutputMuted; setIsOutputMuted(mute); toggleOutputMuteRef.current?.(mute); };
    const handleToggleVideo = () => setIsVideoEnabled(prev => !prev);
    const handleToggleScreenShare = () => { setIsScreenSharing(prev => !prev); addNotification('Screen sharing is not fully implemented yet.', 'info'); };
    const handleToggleCc = () => setShowCc(prev => !prev);

    useEffect(() => {
        if (isVideoEnabled) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => { videoStreamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; })
                .catch(err => { console.error("Error accessing camera:", err); addNotification("Camera access denied.", "error"); setIsVideoEnabled(false); });
        } else if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(track => track.stop());
            videoStreamRef.current = null;
        }
        return () => { if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(track => track.stop()); };
    }, [isVideoEnabled, addNotification]);
    
    useEffect(() => () => { endSession(); }, [endSession]);

    if (!isEnrolled) {
        return <BiometricsEnrollment onEnrollmentComplete={handleEnrollmentComplete} />;
    }

    const currentAnalyser = agentStatus === 'listening' ? analyserRef.current.input : agentStatus === 'speaking' ? analyserRef.current.output : null;

    return (
        <div className="relative flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
            <div id="youtube-player-container" className="absolute -top-96 -left-96"></div>
            <audio ref={audioPlayerRef} hidden />
             <Sidebar 
                isOpen={isSidebarOpen}
                conversations={conversations}
                currentConversationId={currentConversationId}
                onClose={() => setIsSidebarOpen(false)}
                onSelectConversation={handleSelectConversation}
                onNewConversation={() => handleNewConversation()}
            />
            {isSettingsOpen && (
                <Settings 
                    isOpen={isSettingsOpen} 
                    onClose={() => setIsSettingsOpen(false)} 
                    systemPrompt={systemPrompt}
                    onSaveSystemPrompt={handleSaveSystemPrompt}
                    integrations={integrations}
                    onSaveIntegration={handleSaveIntegration}
                    onSaveStoryAuth={handleSaveStoryAuth}
                    onSaveMux={handleSaveMux}
                    mediaLibrary={mediaLibrary}
                    onSaveMediaLibrary={handleSaveMediaLibrary}
                    onMediaFileUpload={handleMediaFileUpload}
                    projectFiles={projectFiles}
                    onSaveProjectFiles={handleSaveProjectFiles}
                />
            )}
             {isDevConsoleOpen && (
                <DevConsole
                    isOpen={isDevConsoleOpen}
                    onClose={() => setIsDevConsoleOpen(false)}
                    browserUrl={browserUrl}
                    cliHistory={cliHistory}
                    onRunCommand={handleRunCliCommand}
                />
            )}
            {isMusicStudioOpen && (
                <MusicStudio
                    isOpen={isMusicStudioOpen}
                    onClose={() => setIsMusicStudioOpen(false)}
                    addNotification={addNotification}
                    playAudio={playAudio}
                    generateLyrics={generateLyrics}
                    analyzeAudioTone={analyzeAudioTone}
                    synthesizeSpeech={synthesizeSpeech}
                />
            )}
            {isVideoLibraryOpen && (
                <VideoLibrary
                    isOpen={isVideoLibraryOpen}
                    onClose={() => setIsVideoLibraryOpen(false)}
                    videos={mediaLibrary.filter(item => item.type === 'video')}
                    videoToPlay={videoToPlay}
                    onPlaybackEnd={() => setVideoToPlay(null)}
                />
            )}
            
            {view === 'chat' && (
                <ChatView 
                    transcript={transcript} 
                    onSendMessage={handleSendTextMessage} 
                    onSwitchToVoice={handleSwitchToVoice}
                    uploadedFiles={uploadedFiles}
                    onFileUpload={(files) => handleFileUpload(files)}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                    agentStatus={agentStatus}
                />
            )}

            <div className={`transition-opacity duration-500 ease-in-out ${view === 'chat' ? 'opacity-0 pointer-events-none' : 'opacity-100'} h-full flex flex-col`}>
                <video ref={videoRef} autoPlay muted playsInline className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${isVideoEnabled ? 'opacity-30' : 'opacity-0'}`}></video>
                <div className="absolute top-0 left-0 w-full h-full bg-black/50"></div>
                
                <div className="absolute top-5 right-5 z-20 flex flex-col gap-2">
                    {notifications.map(n => (
                        <div key={n.id} className={`px-4 py-2 rounded-lg shadow-lg text-white animate-fade-in-out bg-black/50 backdrop-blur-md border border-white/10 ${n.type === 'success' ? 'border-green-500/50' : ''} ${n.type === 'error' ? 'border-red-500/50' : ''} ${n.type === 'info' ? 'border-blue-500/50' : ''}`}>
                            {n.message}
                        </div>
                    ))}
                </div>

                <header className="fixed top-4 left-4 right-4 z-10 flex items-center justify-between">
                     <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-full hover:bg-white/10 transition-all active:scale-95" aria-label="Open Conversation History">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    </button>
                    <div className="flex items-center gap-2">
                        {backgroundTasks.map(task => (
                             <div key={task.id} className="text-xs px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 animate-fade-in-out-quick">
                                {task.message}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => setIsDevConsoleOpen(true)} className="p-2 rounded-full hover:bg-white/10 transition-all active:scale-95" aria-label="Open Developer Console">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        </button>
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-white/10 transition-all active:scale-95" aria-label="Open Settings">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </button>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="w-[300px] h-[300px] flex items-center justify-center relative">
                        <button onClick={toggleSession} className="w-full h-full relative group">
                            <Luto status={agentStatus} analyserNode={currentAnalyser} />
                        </button>
                    </div>
                </main>

                {showCc && transcript.length > 0 && (
                    <div className="absolute bottom-32 left-0 right-0 p-4 text-center">
                         <p className="inline bg-black/50 p-2 rounded">{transcript[transcript.length-1].text}</p>
                    </div>
                )}
                
                <footer className="fixed bottom-0 left-0 right-0 p-4 z-20">
                     <div className="max-w-xl mx-auto flex items-center justify-center gap-1.5 bg-black/30 backdrop-blur-md rounded-full border border-white/10 p-2 shadow-lg">
                        <button onClick={handleToggleOutputMute} className={`p-3 rounded-full transition-colors ${isOutputMuted ? 'bg-red-500' : 'hover:bg-white/10'}`} aria-label={isOutputMuted ? "Unmute Output" : "Mute Output"}>
                             {isOutputMuted ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>}
                        </button>
                        <button onClick={handleToggleVideo} className={`p-3 rounded-full transition-colors ${isVideoEnabled ? 'bg-blue-500' : 'hover:bg-white/10'}`} aria-label={isVideoEnabled ? "Disable Video" : "Enable Video"}>
                             {isVideoEnabled ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>}
                        </button>
                         <button onClick={() => setIsMusicStudioOpen(true)} className="p-3 rounded-full hover:bg-white/10 transition-colors" aria-label="Open Music Studio">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        </button>
                         <button onClick={() => setIsVideoLibraryOpen(true)} className="p-3 rounded-full hover:bg-white/10 transition-colors" aria-label="Open Video Library">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                        </button>
                        <button onClick={handleToggleRecording} className={`p-3 rounded-full transition-colors ${isRecording ? 'bg-red-500 animate-pulse-record' : 'hover:bg-white/10'}`} aria-label={isRecording ? "Stop Recording" : "Start Recording Idea"}>
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button onClick={handleToggleCc} className={`p-3 rounded-full transition-colors ${showCc ? 'bg-blue-500' : 'hover:bg-white/10'}`} aria-label={showCc ? "Hide Captions" : "Show Captions"}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"></path><path d="M6 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2"></path><path d="M12 12h.01"></path><path d="M17 12h.01"></path><path d="M7 12h.01"></path></svg>
                        </button>
                         <button onClick={handleSwitchToChat} className="p-3 rounded-full hover:bg-white/10 transition-colors" aria-label="Switch to Chat Mode">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                    </div>
                </footer>
            </div>
            
            <MusicPlayer 
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                progress={trackProgress}
                onPlayPause={handlePlayPause}
                onNext={handleNextTrack}
                onPrev={handlePrevTrack}
                onSeek={handleSeek}
            />
        </div>
    );
};

export default App;