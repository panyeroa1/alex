import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, FunctionCall, Chat } from '@google/genai';
import { Luto, MiniLuto } from './components/Orb';
import { AgentStatus, Notification, ChatMessage, UploadedFile, Conversation, BackgroundTask, IntegrationCredentials, MediaItem, ProjectFile } from './types';
import { connectToLiveSession, disconnectLiveSession, startChatSession, sendChatMessage, generateConversationTitle, type LiveSession, analyzeAudio, synthesizeSpeech, decode, decodeAudioData, analyzeCode, summarizeConversationsForMemory, generateConversationSummary, performWebSearch } from './services/geminiService';
import * as db from './services/supabaseService';
import { DEFAULT_SYSTEM_PROMPT, DEV_TOOLS } from './constants';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';

// --- Python Execution Service (using Pyodide) ---
declare global {
    interface Window {
        loadPyodide: (config?: { indexURL: string }) => Promise<any>;
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

const BiometricsEnrollment: React.FC<{ onEnrollmentComplete: () => void; }> = ({ onEnrollmentComplete }) => {
    const [status, setStatus] = useState<'idle' | 'prompting' | 'recording' | 'processing' | 'done'>('idle');
    const [countdown, setCountdown] = useState(3);
    const timerRef = useRef<number | null>(null);

    const startRecording = () => {
        setStatus('prompting');
        timerRef.current = window.setInterval(() => {
            setCountdown(prev => {
                if (prev === 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setStatus('recording');
                    setTimeout(() => {
                        setStatus('processing');
                        setTimeout(() => {
                           setStatus('done');
                           setTimeout(onEnrollmentComplete, 2000);
                        }, 2500);
                    }, 5000);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };
    
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const getStatusContent = () => {
        switch (status) {
            case 'idle':
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-2">Voice Biometrics Enrollment</h2>
                        <p className="text-white/70 mb-6">For your security, Master E, we need to enroll your voiceprint.</p>
                        <button onClick={startRecording} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-100">
                            Start Enrollment
                        </button>
                    </>
                );
            case 'prompting':
                return <p className="text-4xl font-bold animate-pulse">Recording in {countdown}...</p>;
            case 'recording':
                return (
                    <>
                        <p className="text-2xl font-bold text-red-500 mb-4 animate-pulse">RECORDING</p>
                        <p className="text-lg text-white/80">Please say:</p>
                        <p className="text-xl font-medium mt-2">"Alex, you have access to all my systems."</p>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-6 overflow-hidden">
                           <div className="bg-red-600 h-2.5 rounded-full animate-progress"></div>
                        </div>
                    </>
                );
            case 'processing':
                 return <p className="text-2xl font-bold animate-pulse">Processing Voiceprint...</p>;
            case 'done':
                return <p className="text-2xl font-bold text-green-400">Enrollment Complete. Welcome, Master E.</p>;
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
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
    const [integrations, setIntegrations] = useState<IntegrationCredentials>({
        storyAuth: { enabled: false, key: null }
    });
    const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
    const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
    const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
    const [isPyodideReady, setIsPyodideReady] = useState(false);
    
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
    
    const toggleOutputMuteRef = useRef<((mute: boolean) => void) | null>(null);
    const isSavingRef = useRef(false);

    const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    }, []);

    const handleNewConversation = useCallback(async (closeSidebar = true) => {
        if (sessionRef.current) await endSession();
        const newConvo = await db.createConversation();
        const allConvos = await db.getConversations();
        setConversations(allConvos);
        setCurrentConversationId(newConvo.id);
        setTranscript([]);
        setUploadedFiles([]);
        chatRef.current = null;
        if(closeSidebar) setIsSidebarOpen(false);
    }, []); // Dependencies will be complex, for now let's keep it simple as it's a fix


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
        
        const savedLibrary = localStorage.getItem('alex_media_library');
        if (savedLibrary) setMediaLibrary(JSON.parse(savedLibrary));

        const savedProjectFiles = localStorage.getItem('alex_project_files');
        if(savedProjectFiles) setProjectFiles(JSON.parse(savedProjectFiles));

        const initializeApp = async () => {
            try {
                await db.signInAnonymouslyIfNeeded();
                const convos = await db.getConversations();
                setConversations(convos);
                if (convos.length > 0) {
                    const latestConvo = convos[0];
                    setCurrentConversationId(latestConvo.id);
                    setTranscript(latestConvo.history);
                } else {
                    await handleNewConversation(false);
                }
            } catch (error) {
                console.error("Initialization failed:", error);
                addNotification("Failed to initialize the app.", "error");
            }
        };

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
    }, [isEnrolled, addNotification, handleNewConversation]);

    useEffect(() => {
        if (currentConversationId && transcript.length > 0 && !isSavingRef.current) {
            isSavingRef.current = true;
            db.saveConversationHistory(currentConversationId, transcript).finally(() => {
                isSavingRef.current = false;
            });
        }
    }, [transcript, currentConversationId]);

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
        if (currentConvo && currentConvo.title === 'New Conversation' && newHistory.length >= 2) {
             const title = await generateConversationTitle(newHistory);
             if (currentConversationId) {
                 await db.updateConversationTitle(currentConversationId, title);
                 setConversations(convos => convos.map(c => c.id === currentConversationId ? {...c, title} : c));
             }
        }
    }, [conversations, currentConversationId]);

    const updateTranscript = useCallback((speaker: 'user' | 'alex', text: string) => {
        if (!text) return;
        setTranscript(prev => {
            let newHistory;
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.speaker === speaker && !lastMessage.text.endsWith(' ')) {
                newHistory = [...prev.slice(0, -1), { ...lastMessage, text: lastMessage.text + text }];
            } else {
                newHistory = [...prev, { id: Date.now(), speaker, text }];
            }
            checkAndGenerateTitle(newHistory);
            return newHistory;
        });
    }, [checkAndGenerateTitle]);

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

    const handleToolCall = useCallback(async (fc: FunctionCall, source: 'voice' | 'chat') => {
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
                case 'createMusic':
                    result = `Got it, creating a new music track for you.`;
                    addNotification('Simulating music creation...', 'info');
                    break;
                case 'playMusic':
                    if (!audioPlayerRef.current) {
                        result = "Sorry Boss, the audio player isn't ready.";
                    } else {
                        const audioLibrary = mediaLibrary.filter(item => item.type === 'audio');
                        if (audioLibrary.length === 0) {
                            result = "The music library is empty, Boss. Add some tracks in the settings.";
                            break;
                        }
                        const trackName = fc.args.trackName as string | undefined;
                        let trackToPlay = trackName ? audioLibrary.find(t => t.name.toLowerCase() === trackName.toLowerCase()) : audioLibrary[Math.floor(Math.random() * audioLibrary.length)];
                        
                        if (!trackToPlay) {
                             result = `I couldn't find "${trackName}" in the library, Boss.`;
                        } else {
                            const volume = fc.args.volume as number | undefined;
                            audioPlayerRef.current.src = trackToPlay.url;
                            audioPlayerRef.current.volume = volume ?? 0.5;
                            audioPlayerRef.current.play();
                            result = `Playing "${trackToPlay.name}". Sige, Boss.`;
                        }
                    }
                    break;
                case 'listFiles':
                    result = uploadedFiles.length > 0 ? `Current files: ${uploadedFiles.map(f => f.name).join(', ')}` : "No files have been uploaded yet.";
                    break;
                case 'analyzeFileContents':
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
                    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
                    result = `Successfully cloned ${url} to local directory.`;
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
        }
        return result;
    }, [addNotification, uploadedFiles, addBackgroundTask, updateBackgroundTask, removeBackgroundTask, mediaLibrary, isPyodideReady, projectFiles, currentConversationId, transcript]);

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
                onTranscriptionUpdate: updateTranscript,
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
    }, [addNotification, handleToolCall, updateTranscript, endSession, isVideoEnabled, transcript, systemPrompt, conversations]);
    
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
        if (!chatRef.current) {
            setAgentStatus('recalling');
            const recentConvos = conversations.slice(0, 5);
            const memoryContext = await summarizeConversationsForMemory(recentConvos);
            chatRef.current = await startChatSession(transcript, systemPrompt + memoryContext);
            setAgentStatus('idle');
        }
        updateTranscript('user', message);
        
        try {
            setAgentStatus('executing');
            const response = await sendChatMessage(chatRef.current, message);
            if(response.functionCalls && response.functionCalls.length > 0){
                 for(const fc of response.functionCalls){
                    const result = await handleToolCall(fc, 'chat');
                    const toolResponse = await sendChatMessage(chatRef.current, "", [{
                        functionResponse: { name: fc.name, response: { result } }
                    }]);
                    updateTranscript('alex', toolResponse.text);
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
        const audioFiles: File[] = [];
        const otherFiles: UploadedFile[] = [];
        Array.from(files).forEach(file => {
            if (file.type.startsWith('audio/')) audioFiles.push(file);
            else otherFiles.push({ name: file.name, type: file.type, size: file.size });
        });
        if (otherFiles.length > 0) {
            setUploadedFiles(prev => [...prev, ...otherFiles]);
            addNotification(`${otherFiles.length} file(s) attached.`, 'success');
        }
        audioFiles.forEach(async (file) => handleAudioAnalysis(new Blob([file], { type: file.type }), file.name));
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
        addNotification('Story Auth settings updated.', 'success');
    };

    const handleSaveMediaLibrary = (library: MediaItem[]) => {
        setMediaLibrary(library);
        localStorage.setItem('alex_media_library', JSON.stringify(library));
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
                    mediaLibrary={mediaLibrary}
                    onSaveMediaLibrary={handleSaveMediaLibrary}
                    projectFiles={projectFiles}
                    onSaveProjectFiles={handleSaveProjectFiles}
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
                    <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                        {backgroundTasks.map(task => (
                             <div key={task.id} className="text-xs px-3 py-1 bg-black/40 text-white/80 rounded-full animate-fade-in-out-quick backdrop-blur-sm">
                                {task.message}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <button onClick={handleToggleCc} className={`p-2 transition-all active:scale-95 ${showCc ? 'text-blue-400' : 'hover:text-white'}`} aria-label="Toggle Closed Captions">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.8 7.2c.8-1.6 2-3 3.5-4 1.5-1 3.3-1.4 5.2-1.2 1.9.2 3.6.9 5 2.1 1.4 1.2 2.5 2.8 3 4.7.5 1.9.5 3.9.1 5.8s-1.2 3.6-2.4 5c-1.2 1.4-2.8 2.5-4.7 3s-3.9.5-5.8.1-3.6-1.2-5-2.4-2.5-2.8-3-4.7c-.5-1.9-.5-4 .1-5.9zM10 12c.3-1.3 1.4-2 3-2 1.6 0 2.9.8 3 2.2.1 1.2-.6 2.2-2 2.8"/><path d="M10 16c.3-1.3 1.4-2 3-2 1.6 0 2.9.8 3 2.2.1 1.2-.6 2.2-2 2.8"/></svg>
                        </button>
                        <button onClick={handleToggleOutputMute} className={`p-2 transition-all active:scale-95 ${isOutputMuted ? 'text-red-500' : 'hover:text-white'}`} aria-label="Toggle Speaker">
                            {isOutputMuted ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" x2="17" y1="9" y2="15"></line><line x1="17" x2="23" y1="9" y2="15"></line></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>}
                        </button>
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 transition-all hover:text-white active:scale-95" aria-label="Open Settings">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </button>
                    </div>
                </header>

                <main className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 md:w-80 md:h-80 z-10">
                        <button onClick={toggleSession} disabled={agentStatus === 'connecting' || agentStatus === 'verifying' || agentStatus === 'recalling'} className="w-full h-full rounded-full transition-transform duration-300 ease-in-out hover:scale-105 focus:outline-none relative disabled:opacity-50 disabled:scale-100 group" aria-label={sessionRef.current ? 'Interaction in progress' : 'Start Session'}>
                            <Luto status={agentStatus} analyserNode={currentAnalyser} />
                        </button>
                    </div>
                    {showCc && (
                        <div className="absolute bottom-28 md:bottom-32 left-4 right-4 z-20 h-32 md:h-48 bg-black/30 backdrop-blur-sm rounded-lg p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                            {transcript.map((msg) => (
                                <div key={msg.id} className="text-left mb-2">
                                    <span className={`font-bold ${msg.speaker === 'alex' ? 'text-blue-300' : 'text-green-300'}`}>{msg.speaker === 'alex' ? 'Alex' : 'You'}: </span>
                                    <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}></span>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
                
                <footer className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-10">
                    <div className="flex justify-around items-center max-w-xs md:max-w-sm mx-auto bg-black/20 backdrop-blur-md p-2 rounded-full">
                        <button onClick={handleToggleVideo} className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full text-white transition-all hover:scale-110 active:scale-100 ${isVideoEnabled ? 'bg-blue-500/50 hover:bg-blue-500/70' : 'bg-white/10 hover:bg-white/20'}`} aria-label={isVideoEnabled ? "Turn off Video" : "Turn on Video"}>
                            {isVideoEnabled ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.6 11.6L22 7v10l-6.4-4.6Z"/><path d="m2 5 1-1h10l1 1v10l-1 1H3l-1-1Z"/><path d="m2 14 3-3 2 2 3-3 2 2"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.6 11.6L22 7v10l-6.4-4.6Z"/><path d="M2 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/></svg>}
                        </button>
                        <button onClick={handleToggleScreenShare} className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full text-white transition-all hover:scale-110 active:scale-100 disabled:opacity-30 disabled:pointer-events-none ${isScreenSharing ? 'bg-blue-500/50 hover:bg-blue-500/70' : 'bg-white/10 hover:bg-white/20'}`} aria-label={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}>
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 17a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16z"/><path d="M12 11v-4"/><path d="m9 10 3-3 3 3"/></svg>
                        </button>
                        <button onClick={handleToggleRecording} disabled={agentStatus === 'idle' || agentStatus === 'connecting' || agentStatus === 'verifying'} className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full text-white transition-all hover:scale-110 active:scale-100 disabled:opacity-30 disabled:pointer-events-none ${isRecording ? 'bg-red-600/80 animate-pulse-record' : 'bg-white/10 hover:bg-white/20'}`} aria-label={isRecording ? "Stop Recording" : "Start Recording"}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor" className="text-white"><circle cx="12" cy="12" r="10"></circle></svg>
                        </button>
                        <button onClick={handleSwitchToChat} className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-all hover:scale-110 active:scale-100" aria-label="Switch to Chat Mode">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default App;