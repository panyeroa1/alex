import React from 'react';
import type { AgentStatus } from '../types';

interface OrbProps {
    status: AgentStatus;
}

const OrbGraphics: React.FC<{ status: AgentStatus }> = ({ status }) => {
    const isVerifying = status === 'verifying';
    const isConnecting = status === 'connecting';
    const isExecuting = status === 'executing';
    const isSpeaking = status === 'speaking';
    const isListening = status === 'listening';
    const isActive = isListening || isSpeaking;
    const isIdle = status === 'idle';

    return (
        <div className="absolute inset-0 flex items-center justify-center">
            {/* Outer Glows */}
            <div className={`absolute w-full h-full rounded-full bg-amber-500/50 transition-all duration-500 ${isActive ? 'animate-glow-slow' : 'opacity-0 scale-90'}`}></div>
            <div className={`absolute w-full h-full rounded-full bg-orange-400/30 transition-all duration-500 ${isActive ? 'animate-glow-medium' : 'opacity-0 scale-90'}`}></div>

            {/* Verifying Pulse */}
            {isVerifying && (
                <div className="absolute w-full h-full rounded-full bg-red-800/50 animate-pulse-slow"></div>
            )}
            
            {/* Loading/Executing Spinner */}
            {(isConnecting || isExecuting) && (
                <div className="absolute w-full h-full rounded-full border-t-2 border-b-2 border-white/50 animate-spin"></div>
            )}
            
            {/* Core Orb */}
            <div className={`w-full h-full rounded-full overflow-hidden transition-all duration-500 ease-in-out shadow-2xl shadow-black ${isListening ? 'scale-105' : ''} ${isSpeaking ? 'scale-110' : ''}`}>
                 <div className={`w-full h-full bg-black ${isIdle ? 'animate-plasma-idle' : 'animate-plasma'}`} style={{ 
                     backgroundSize: '200% 200%', 
                     backgroundImage: 'radial-gradient(circle at 40% 50%, #E4C7B8 0%, #B5654D 35%, #2E2522 70%)' 
                 }}></div>
            </div>

            {/* Status Text */}
            {isVerifying && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                    <span className="text-sm font-bold tracking-wider">VERIFYING IDENTITY</span>
                    <span className="text-xs text-white/70">Master E Only</span>
                </div>
            )}
        </div>
    );
};

export const Orb: React.FC<OrbProps> = ({ status }) => {
    return (
        <div className="w-full h-full relative">
            <style>
                {`
                @keyframes glow-slow {
                    0%, 100% { transform: scale(1.1); opacity: 0.3; }
                    50% { transform: scale(1.25); opacity: 0.5; }
                }
                .animate-glow-slow { animation: glow-slow 4s ease-in-out infinite; }

                @keyframes glow-medium {
                    0%, 100% { transform: scale(1.3); opacity: 0.2; }
                    50% { transform: scale(1.5); opacity: 0.3; }
                }
                .animate-glow-medium { animation: glow-medium 4s ease-in-out infinite; animation-delay: 1s; }
                
                @keyframes plasma {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-plasma { animation: plasma 20s ease infinite; }

                @keyframes plasma-idle {
                    0%   { background-position: 49% 51%; }
                    25%  { background-position: 51% 51%; }
                    50%  { background-position: 51% 49%; }
                    75%  { background-position: 49% 49%; }
                    100% { background-position: 49% 51%; }
                }
                .animate-plasma-idle { animation: plasma-idle 90s linear infinite; }

                @keyframes pulse-slow {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 0.7; }
                }
                .animate-pulse-slow { animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

                @keyframes fade-in-out {
                  0% { opacity: 0; transform: translateY(-10px); }
                  10% { opacity: 1; transform: translateY(0); }
                  90% { opacity: 1; transform: translateY(0); }
                  100% { opacity: 0; transform: translateY(-10px); }
                }
                .animate-fade-in-out { animation: fade-in-out 5s ease-in-out forwards; }
                `}
            </style>
            <OrbGraphics status={status} />
        </div>
    );
};