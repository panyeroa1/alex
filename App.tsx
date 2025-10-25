
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, FunctionCall, Chat } from '@google/genai';
import { Luto, MiniLuto } from './components/Orb';
import { AgentStatus, Notification, ChatMessage, UploadedFile, Conversation, BackgroundTask, IntegrationCredentials, MediaItem, ProjectFile, CliHistoryItem } from './types';
import { connectToLiveSession, disconnectLiveSession, startChatSession, sendChatMessage, generateConversationTitle, type LiveSession, analyzeAudio, synthesizeSpeech, decode, decodeAudioData, analyzeCode, summarizeConversationsForMemory, generateConversationSummary, performWebSearch, searchYouTube, generateLyrics, analyzeAudioTone, blobToBase64 } from './services/geminiService';
import * as db from './services/supabaseService';
import { supabase } from './services/supabase';
import { DEFAULT_SYSTEM_PROMPT, DEV_TOOLS, INTRO_IVR_SSML } from './constants';
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
                        <p className="text-lg text-white/80 mb-4">Please say the following phrase clearly:</p>
                        <div className="bg-black/20 p-4 rounded-lg border border-white/10 mb-6">
                            <p className="text-xl font-mono text-center text-cyan-300">"{ENROLLMENT_PHRASES[currentStep]}"</p>
                        </div>
                        <button onClick={handleStartRecording} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-100 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle></svg>
                            Record Now
                        </button>
                        {progressIndicator}
                    </>
                );
            case 'recording':
                return (
                    <>
                        <p className="text-lg text-white/80 mb-4">Recording... Speak now.</p>
                        <canvas ref={canvasRef} width="300" height="100" className="rounded-lg"></canvas>
                        <p className="text-sm text-white/50 mt-4">Recording for 4 seconds.</p>
                        {progressIndicator}
                    </>
                );
            case 'processing':
                return (
                    <>
                        <div className="flex items-center gap-3 justify-center">
                            <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                            <p className="text-lg text-white/80">Processing voiceprint...</p>
                        </div>
                         {progressIndicator}
                    </>
                );
            case 'done':
                 return (
                    <>
                        <div className="flex items-center justify-center gap-3 text-green-400">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            <h2 className="text-2xl font-bold">Enrollment Complete</h2>
                        </div>
                        <p className="text-white/70 mt-2">Security protocols updated. Welcome, Master E.</p>
                    </>
                );
            case 'error':
                 return (
                    <>
                        <div className="flex items-center justify-center gap-3 text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            <h2 className="text-2xl font-bold">Enrollment Failed</h2>
                        </div>
                        <p className="text-white/70 mt-2">{errorMsg}</p>
                    </>
                );
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg mx-auto bg-gray-900/50 backdrop-blur-lg border border-white/10 rounded-xl p-8 text-center shadow-2xl animate-fade-in">
                {getStatusContent()}
            </div>
        </div>
    );
};

// --- Main App Component (Reconstructed) ---
// NOTE: The original App component was missing from the provided file due to corruption.
// This is a basic reconstruction to make the application runnable and display the
// initial enrollment flow. The main application UI will need to be restored.
const App: React.FC = () => {
    const [isEnrolled, setIsEnrolled] = useState(false); // Set to true to bypass enrollment for development
    const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                await db.signInAnonymouslyIfNeeded();
                const loadedConversations = await db.getConversations();
                setConversations(loadedConversations);
                if (loadedConversations.length > 0) {
                    setCurrentConversationId(loadedConversations[0].id);
                } else {
                    const newConvo = await db.createConversation();
                    setConversations([newConvo]);
                    setCurrentConversationId(newConvo.id);
                }
            } catch (error) {
                console.error("Initialization failed:", error);
            }
        };
        init();
        initializePyodide();
    }, []);

    if (!isEnrolled) {
        return <BiometricsEnrollment onEnrollmentComplete={() => setIsEnrolled(true)} />;
    }
    
    // The main application interface was in the original App.tsx and needs to be restored here.
    // This is a placeholder to show after enrollment.
    return (
        <div className="flex flex-col items-center justify-center h-screen text-center">
            <div className="w-64 h-64">
                <Luto status={agentStatus} analyserNode={null} />
            </div>
            <h1 className="text-2xl mt-8">Welcome, Master E.</h1>
            <p className="text-white/60 mt-2">Main application UI is missing but I am ready.</p>
        </div>
    );
};

export default App;
