import React from 'react';
import type { AgentStatus } from '../types';

interface LutoProps {
    status: AgentStatus;
    analyserNode: AnalyserNode | null;
}

const MiniLuto: React.FC<{ status: AgentStatus }> = ({ status }) => {
    const getStatusClasses = () => {
        switch (status) {
            case 'listening':
                return 'bg-green-400 animate-pulse-mini';
            case 'speaking':
                return 'bg-blue-400 animate-pulse-mini-fast';
            case 'executing':
                 return 'bg-amber-400 animate-pulse-mini-fast';
            case 'connecting':
            case 'verifying':
                return 'bg-yellow-400 animate-pulse-mini';
            default:
                return 'bg-gray-500';
        }
    };
    // A simple representation of Luto for the header
    return (
        <div className="flex items-center justify-center w-4 h-4">
             <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${getStatusClasses()}`}></div>
        </div>
    );
};


export const Luto: React.FC<LutoProps> = ({ status }) => {
    const isSpeaking = status === 'speaking';
    const isListening = status === 'listening';
    const isExecuting = status === 'executing';
    const isConnecting = status === 'connecting';
    const isVerifying = status === 'verifying';

    const getEyeClass = () => {
        if (isListening) return 'animate-luto-eye-listen';
        if (isExecuting) return 'animate-luto-eye-execute';
        return '';
    };

    const getMouthClass = () => {
        if (isSpeaking) return 'animate-luto-mouth-speak';
        return 'opacity-0';
    };
    
    return (
        <div className="w-full h-full relative flex items-center justify-center">
            {/* Luto SVG Character */}
            <svg viewBox="0 0 150 150" className="w-full h-full drop-shadow-lg animate-luto-hover">
                <defs>
                    <radialGradient id="luto-body-grad" cx="50%" cy="0%" r="100%">
                        <stop offset="0%" stopColor="#AAB5C4" />
                        <stop offset="100%" stopColor="#4A5568" />
                    </radialGradient>
                     <linearGradient id="luto-visor-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2D3748" />
                        <stop offset="100%" stopColor="#1A202C" />
                    </linearGradient>
                    <filter id="luto-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <clipPath id="visor-clip">
                        <path d="M 40 55 C 40 40, 110 40, 110 55 L 110 85 C 110 100, 40 100, 40 85 Z" />
                    </clipPath>
                </defs>

                {/* Main Body */}
                <g>
                    {/* Head */}
                    <path d="M 50 25 C 25 25, 25 75, 50 75 L 100 75 C 125 75, 125 25, 100 25 Z" fill="url(#luto-body-grad)" />
                    {/* Body */}
                    <path d="M 55 70 C 40 70, 40 120, 55 120 L 95 120 C 110 120, 110 70, 95 70 Z" fill="#4A5568" />
                    {/* Neck */}
                     <rect x="65" y="65" width="20" height="10" fill="#3A4454" />
                </g>

                {/* Visor */}
                <g>
                    <path d="M 40 55 C 40 40, 110 40, 110 55 L 110 85 C 110 100, 40 100, 40 85 Z" fill="url(#luto-visor-grad)" />
                    { isExecuting && <path d="M 40 55 C 40 40, 110 40, 110 55 L 110 85 C 110 100, 40 100, 40 85 Z" fill="#F59E0B" className="opacity-0 animate-luto-visor-flash" /> }
                </g>

                {/* Eyes & Mouth */}
                <g clipPath="url(#visor-clip)">
                    {/* Eyes */}
                    <g className={getEyeClass()}>
                        <rect x="50" y="60" width="15" height="20" rx="7.5" fill="#38BDF8" filter="url(#luto-glow)" />
                        <rect x="85" y="60" width="15" height="20" rx="7.5" fill="#38BDF8" filter="url(#luto-glow)" />
                    </g>
                    {/* Mouth */}
                    <rect x="60" y="90" width="30" height="5" rx="2.5" fill="#38BDF8" filter="url(#luto-glow)" className={`transition-opacity duration-200 ${getMouthClass()}`} />
                </g>

                 {/* Antenna */}
                <g className={isListening ? 'animate-luto-antenna-twitch' : ''}>
                    <line x1="100" y1="25" x2="110" y2="15" stroke="#AAB5C4" strokeWidth="3" />
                    <circle cx="110" cy="15" r="3" fill="#38BDF8" />
                </g>

                 {/* Chest Light (Connecting/Verifying) */}
                 {(isVerifying || isConnecting) && (
                     <circle cx="75" cy="95" r="5" fill="#facc15" filter="url(#luto-glow)">
                        <animate attributeName="r" from="5" to="12" dur="1.2s" begin="0s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="1" to="0" dur="1.2s" begin="0s" repeatCount="indefinite" />
                     </circle>
                 )}
            </svg>
            
            {status === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 bg-blue-500 rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-300 flex items-center justify-center">
                         <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
                    </div>
                </div>
            )}
        </div>
    );
};

export { MiniLuto };