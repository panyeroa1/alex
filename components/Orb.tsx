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


export const Luto: React.FC<LutoProps> = ({ status, analyserNode }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const resizeCanvas = () => {
            const size = Math.min(container.clientWidth, container.clientHeight);
            canvas.width = size;
            canvas.height = size;
        };
        
        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(container);
        resizeCanvas();

        const dataArray = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : new Uint8Array(0);

        const render = (time: number) => {
            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 4;

            ctx.clearRect(0, 0, width, height);
            
            let color = 'rgba(107, 114, 128, 1)'; // Idle color
            let basePulse = 0;
            let barMultiplier = 1;

            switch (status) {
                case 'listening':
                    color = 'rgba(52, 211, 153, 1)'; // Green
                    barMultiplier = 1.2;
                    break;
                case 'speaking':
                    color = 'rgba(96, 165, 250, 1)'; // Blue
                    barMultiplier = 1.5;
                    break;
                case 'executing':
                    color = 'rgba(251, 191, 36, 1)'; // Amber
                    basePulse = Math.sin(time / 150) * 8 + 10;
                    break;
                case 'recalling':
                    color = 'rgba(192, 132, 252, 1)'; // Purple
                    basePulse = Math.sin(time / 200) * 5 + 5;
                    break;
                case 'connecting':
                case 'verifying':
                    color = 'rgba(250, 204, 21, 1)'; // Yellow
                    basePulse = Math.sin(time / 200) * 5 + 5;
                    break;
                case 'idle':
                    basePulse = Math.sin(time / 500) * 2 + 2;
                    break;
            }

            if (analyserNode && (status === 'listening' || status === 'speaking')) {
                analyserNode.getByteFrequencyData(dataArray);
            }

            const numBars = 128;
            ctx.lineWidth = 2.5;

            // Outer ring visualizer
            for (let i = 0; i < numBars; i++) {
                const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
                
                let barHeight = basePulse;
                 if (analyserNode && (status === 'listening' || status === 'speaking')) {
                    const index = Math.floor((i / numBars) * (dataArray.length * 0.4)); // Use lower frequencies
                    const value = dataArray[index];
                    barHeight = (value / 255) * (radius * barMultiplier);
                }

                const startRadius = radius * 1.2;
                const endRadius = radius * 1.2 + barHeight;

                const startX = centerX + Math.cos(angle) * startRadius;
                const startY = centerY + Math.sin(angle) * startRadius;
                const endX = centerX + Math.cos(angle) * endRadius;
                const endY = centerY + Math.sin(angle) * endRadius;
                
                const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
                gradient.addColorStop(0, `${color.replace('1)', '0.1)')}`);
                gradient.addColorStop(1, `${color.replace('1)', '1)')}`);

                ctx.strokeStyle = gradient;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }

            // Central core glow
            const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            coreGlow.addColorStop(0, `${color.replace('1)', '0.3)')}`);
            coreGlow.addColorStop(1, `${color.replace('1)', '0)')}`);

            ctx.fillStyle = coreGlow;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();

            // Inner circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.8, 0, 2 * Math.PI, false);
            ctx.strokeStyle = color.replace('1)', '0.4)');
            ctx.lineWidth = 1;
            ctx.stroke();
            

            animationFrameId = requestAnimationFrame(render);
        };

        render(0);

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
        };
    }, [status, analyserNode]);

    return (
        <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
            <canvas ref={canvasRef}></canvas>
            {status === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-100 opacity-50 transition-opacity duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
                </div>
            )}
        </div>
    );
};


export { MiniLuto };
