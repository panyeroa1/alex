
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
    const bubblesRef = useRef<any[]>([]);

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
        
        const initBubbles = () => {
            const numBubbles = 30;
            bubblesRef.current = [];
            for (let i = 0; i < numBubbles; i++) {
                bubblesRef.current.push({
                    angle: Math.random() * Math.PI * 2,
                    speed: 0.005 + Math.random() * 0.01,
                    radius: 3 + Math.random() * 10,
                    distance: 0.1 + Math.random() * 0.8, 
                    opacity: 0.1 + Math.random() * 0.3,
                });
            }
        };

        if (bubblesRef.current.length === 0) {
            initBubbles();
        }


        const render = (time: number) => {
            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;
            const mainRadius = Math.min(width, height) / 3.5;

            ctx.clearRect(0, 0, width, height);
            
            let color = 'rgba(107, 114, 128, 1)'; // Idle color
            let energy = 0.1;

            switch (status) {
                case 'listening':
                    color = 'rgba(52, 211, 153, 1)'; // Green
                    energy = 0.5;
                    break;
                case 'speaking':
                    color = 'rgba(96, 165, 250, 1)'; // Blue
                    energy = 1.0;
                    break;
                case 'executing':
                    color = 'rgba(251, 191, 36, 1)'; // Amber
                    energy = 0.6;
                    break;
                case 'recalling':
                    color = 'rgba(192, 132, 252, 1)'; // Purple
                    energy = 0.4;
                    break;
                case 'connecting':
                case 'verifying':
                    color = 'rgba(250, 204, 21, 1)'; // Yellow
                     energy = 0.3;
                    break;
            }

            let audioLevel = 0;
            if (analyserNode && (status === 'listening' || status === 'speaking')) {
                analyserNode.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                audioLevel = (sum / dataArray.length) / 255;
                energy += audioLevel * 2.5;
            } else {
                 energy += Math.sin(time / 500) * 0.05;
            }

            // Draw bubbles inside the circle
            bubblesRef.current.forEach(bubble => {
                bubble.angle += bubble.speed * energy * 0.5;
                
                const r = mainRadius * bubble.distance;
                const x = centerX + Math.cos(bubble.angle) * r;
                const y = centerY + Math.sin(bubble.angle) * r;

                ctx.beginPath();
                ctx.arc(x, y, bubble.radius * (1 + audioLevel * 0.5), 0, Math.PI * 2);
                ctx.fillStyle = color.replace('1)', `${bubble.opacity * (0.5 + energy * 0.5)})`);
                ctx.fill();
            });

            // Central core glow
            const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, mainRadius * 0.9);
            coreGlow.addColorStop(0, `${color.replace('1)', '0.2)')}`);
            coreGlow.addColorStop(1, `${color.replace('1)', '0)')}`);

            ctx.fillStyle = coreGlow;
            ctx.beginPath();
            ctx.arc(centerX, centerY, mainRadius * 0.9, 0, 2 * Math.PI);
            ctx.fill();

            // Outer Ring
            ctx.beginPath();
            ctx.arc(centerX, centerY, mainRadius, 0, 2 * Math.PI, false);
            ctx.strokeStyle = color.replace('1)', '0.5)');
            ctx.lineWidth = 4;
            ctx.stroke();

            // Subtle inner glow for the ring
            ctx.beginPath();
            ctx.arc(centerX, centerY, mainRadius - 3, 0, 2 * Math.PI, false);
            ctx.strokeStyle = color.replace('1)', '0.2)');
            ctx.lineWidth = 2;
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
        </div>
    );
};


export { MiniLuto };
