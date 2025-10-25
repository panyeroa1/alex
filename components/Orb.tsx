import React, { useRef, useEffect } from 'react';
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


export const Luto: React.FC<LutoProps> = ({ status, analyserNode }) => {
    const isSpeaking = status === 'speaking';
    const isListening = status === 'listening';
    const isExecuting = status === 'executing';
    const isConnecting = status === 'connecting';
    const isVerifying = status === 'verifying';

    const getEyeClassName = () => {
        if (isSpeaking) return 'animate-luto-speak';
        if (isListening) return 'scale-y-125';
        return '';
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center">
            {/* Luto SVG Character */}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg animate-luto-float">
                <defs>
                    <radialGradient id="luto-grad" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0%" stopColor="#d1d5db" />
                        <stop offset="100%" stopColor="#6b7280" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Body */}
                <path d="M 20 50 A 30 35 0 0 1 80 50 L 80 70 A 30 35 0 0 1 20 70 Z" fill="url(#luto-grad)" filter="url(#glow)" />
                
                {/* Eyes container */}
                <g transform="translate(0, 2)">
                    {/* Left Eye */}
                    <g transform="translate(35, 50)">
                        <path d="M -10 0 a 10 12 0 1 1 20 0 a 10 12 0 1 1 -20 0" fill="#111827" />
                        <ellipse cx="0" cy="0" rx="7" ry="9" fill="#0ea5e9" className={`transition-transform duration-200 ${getEyeClassName()}`}>
                             {isExecuting && <animate attributeName="fill" values="#0ea5e9;#f59e0b;#0ea5e9" dur="1.5s" repeatCount="indefinite" />}
                        </ellipse>
                        <circle cx="0" cy="0" r="2" fill="white" className="opacity-70" />
                    </g>
                    {/* Right Eye */}
                     <g transform="translate(65, 50)">
                        <path d="M -10 0 a 10 12 0 1 1 20 0 a 10 12 0 1 1 -20 0" fill="#111827" />
                        <ellipse cx="0" cy="0" rx="7" ry="9" fill="#0ea5e9" className={`transition-transform duration-200 ${getEyeClassName()}`}>
                            {isExecuting && <animate attributeName="fill" values="#0ea5e9;#f59e0b;#0ea5e9" dur="1.5s" repeatCount="indefinite" />}
                        </ellipse>
                        <circle cx="0" cy="0" r="2" fill="white" className="opacity-70" />
                    </g>
                </g>

                 {/* Verifying/Connecting Indicator */}
                 {(isVerifying || isConnecting) && (
                     <circle cx="50" cy="55" r="3" fill="#facc15">
                        <animate attributeName="r" from="3" to="8" dur="1s" begin="0s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="1" to="0" dur="1s" begin="0s" repeatCount="indefinite" />
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