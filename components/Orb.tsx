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
            case 'recalling':
                return 'bg-purple-400 animate-pulse-mini';
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
    const isRecalling = status === 'recalling';

    const getGlowClass = () => {
        if (isConnecting || isVerifying) return 'alex-glow-yellow';
        if (isRecalling) return 'alex-glow-purple';
        return '';
    };
    
    return (
        <div className="w-full h-full relative flex items-center justify-center">
            {/* Alex SVG Character */}
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg animate-alex-hover">
                <defs>
                    <radialGradient id="alex-skin-grad" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#fce4d6" />
                        <stop offset="100%" stopColor="#f8c6b1" />
                    </radialGradient>
                    <linearGradient id="alex-sweater-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#5B9BD5" />
                        <stop offset="100%" stopColor="#3A6B9B" />
                    </linearGradient>
                     <filter id="alex-inner-shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feComponentTransfer in="SourceAlpha">
                           <feFuncA type="table" tableValues="1 0" />
                        </feComponentTransfer>
                        <feGaussianBlur stdDeviation="2"/>
                        <feOffset dx="0" dy="3" result="offsetblur"/>
                        <feFlood floodColor="rgba(0,0,0,0.25)" result="color"/>
                        <feComposite in2="offsetblur" operator="in"/>
                        <feComposite in2="SourceAlpha" operator="in" />
                        <feMerge>
                           <feMergeNode in="SourceGraphic" />
                           <feMergeNode />
                        </feMerge>
                    </filter>
                </defs>

                <g className={getGlowClass()}>
                    {/* Main Body */}
                    <circle cx="100" cy="100" r="80" fill="url(#alex-skin-grad)" />
                    <path d="M 20 130 C 40 180, 160 180, 180 130 L 180 180 L 20 180 Z" fill="url(#alex-sweater-grad)" />
                    <path d="M 55 25 C 20 40, 30 80, 80 60 C 100 50, 150 50, 150 70 C 180 80, 180 40, 145 25 Z" fill="#2E231F" />

                    {/* Face features */}
                    <g>
                        {/* Eyebrows */}
                        <path d="M 60 70 Q 75 60, 90 70" stroke="#2E231F" strokeWidth="5" fill="none" strokeLinecap="round" />
                        <path d="M 110 70 Q 125 60, 140 70" stroke="#2E231F" strokeWidth="5" fill="none" strokeLinecap="round" />
                        
                        {/* Eyes */}
                        <g className={`${isListening ? 'animate-alex-pupil-listen' : ''} animate-alex-blink`}>
                            <circle cx="75" cy="85" r="10" fill="white" />
                            <circle cx="75" cy="85" r="5" fill="#2E231F" className="pupil" />
                            <circle cx="125" cy="85" r="10" fill="white" />
                            <circle cx="125" cy="85" r="5" fill="#2E231F" className="pupil" />
                        </g>

                        {/* Nose */}
                        <path d="M 100 90 C 95 105, 105 105, 100 90" fill="#E8BBAA" opacity="0.7"/>

                        {/* Mouth */}
                        <path d="M 80 120 Q 100 130, 120 120" stroke="#8B5742" strokeWidth="4" fill="none" strokeLinecap="round" className={isSpeaking ? 'animate-alex-mouth-speak' : ''} />
                    </g>
                    
                     {/* Name Tag */}
                     <g filter="url(#alex-inner-shadow)">
                        <path d="M 80 140 C 60 150, 60 180, 80 180 L 120 180 C 140 180, 140 150, 120 140 Z" fill="#795548" />
                        <rect x="70" y="155" width="60" height="25" rx="5" fill="#F5F5F5" stroke="#AAA" strokeWidth="0.5" />
                        <text x="100" y="173" fontFamily="Roboto, sans-serif" fontSize="14" fontWeight="bold" fill="#222" textAnchor="middle">Alex</text>
                    </g>
                </g>

                {/* Shades for executing */}
                <g className={isExecuting ? 'animate-alex-shades-drop' : 'opacity-0'} style={{ transformOrigin: 'center 75px', pointerEvents: isExecuting ? 'auto' : 'none' }}>
                     <path d="M 55 75 L 145 75 A 10 10 0 0 1 145 85 L 155 100 L 45 100 L 55 85 A 10 10 0 0 1 55 75 Z" fill="url(#luto-visor-grad)" stroke="#111" strokeWidth="2" />
                </g>
            </svg>
            
            {status === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 bg-blue-500 rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-300 flex items-center justify-center">
                         <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
                    </div>
                </div>
            )}
        </div>
    );
};

export { MiniLuto };