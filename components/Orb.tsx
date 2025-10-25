import React, { useRef, useEffect } from 'react';
import type { AgentStatus } from '../types';

interface OrbProps {
    status: AgentStatus;
    analyserNode: AnalyserNode | null;
}

const AudioVisualizer: React.FC<{ analyser: AnalyserNode }> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        analyser.fftSize = 128;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(centerX, centerY) * 0.55;
            const bars = bufferLength * 0.8; 
            const barWidth = 2;

            for (let i = 0; i < bars; i++) {
                const barHeight = Math.pow(dataArray[i] / 255, 2) * 60;
                const angle = (i / bars) * 2 * Math.PI;

                const startX = centerX + Math.cos(angle) * radius;
                const startY = centerY + Math.sin(angle) * radius;
                const endX = centerX + Math.cos(angle) * (radius + barHeight);
                const endY = centerY + Math.sin(angle) * (radius + barHeight);

                canvasCtx.beginPath();
                canvasCtx.strokeStyle = `rgba(255, 204, 153, ${0.2 + (barHeight / 60) * 0.8})`;
                canvasCtx.lineWidth = barWidth;
                canvasCtx.moveTo(startX, startY);
                canvasCtx.lineTo(endX, endY);
                canvasCtx.stroke();
            }
        };

        draw();

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [analyser]);

    return <canvas ref={canvasRef} width="320" height="320" className="absolute inset-0 w-full h-full" />;
};

const MiniOrb: React.FC<{ status: AgentStatus }> = ({ status }) => {
    const statusClasses = () => {
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
    return <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${statusClasses()}`}></div>;
};


const OrbGraphics: React.FC<{ status: AgentStatus; analyserNode: AnalyserNode | null; }> = ({ status, analyserNode }) => {
    const isVerifying = status === 'verifying';
    const isConnecting = status === 'connecting';
    const isExecuting = status === 'executing';
    const isSpeaking = status === 'speaking';
    const isListening = status === 'listening';
    const isActive = isListening || isSpeaking || isExecuting;
    const isIdle = status === 'idle';

    const plasmaAnimationClass = () => {
        switch (status) {
            case 'speaking': return 'animate-plasma-fast';
            case 'listening':
            case 'executing':
                return 'animate-plasma-medium';
            default:
                return 'animate-plasma-slow';
        }
    };
    
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            {/* Outer Glows */}
            <div className={`absolute w-full h-full rounded-full bg-amber-500/50 transition-all duration-500 ${isActive ? 'animate-glow-slow' : 'opacity-0 scale-90'}`}></div>
            <div className={`absolute w-full h-full rounded-full bg-orange-400/30 transition-all duration-500 ${isActive ? 'animate-glow-medium' : 'opacity-0 scale-90'}`}></div>

            {/* Verifying Pulse */}
            {isVerifying && (
                <div className="absolute w-full h-full rounded-full bg-red-800/50 animate-pulse-slow"></div>
            )}
            
            {/* Loading/Connecting Spinner */}
            {isConnecting && (
                <div className="absolute w-full h-full rounded-full border-t-2 border-b-2 border-white/50 animate-spin"></div>
            )}
            
            {/* Core Orb */}
            <div className={`w-full h-full rounded-full overflow-hidden transition-all duration-500 ease-in-out shadow-2xl shadow-black relative ${isListening ? 'scale-105' : ''} ${isSpeaking ? 'scale-110' : ''}`}>
                 <div className={`w-full h-full bg-black bg-gradient-radial from-[#E4C7B8] via-[#B5654D] to-[#2E2522] ${plasmaAnimationClass()}`}></div>
                 
                 {/* Executing Scanner Effect */}
                 {isExecuting && <div className="absolute inset-0 w-full h-full animate-scanner"></div>}
            </div>

            {/* Audio Visualizer */}
            {analyserNode && <AudioVisualizer analyser={analyserNode} />}

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

export const Orb: React.FC<OrbProps> = ({ status, analyserNode }) => {
    return (
        <div className="w-full h-full relative">
            <OrbGraphics status={status} analyserNode={analyserNode} />
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

export { MiniOrb };