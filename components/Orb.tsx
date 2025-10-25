
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
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
    const containerRef = useRef<HTMLDivElement>(null);
    const threeRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        particleSystem: THREE.Points;
        material: THREE.PointsMaterial;
        clock: THREE.Clock;
    } | null>(null);

    // Effect for initializing the Three.js scene
    useEffect(() => {
        const container = containerRef.current;
        if (!container || threeRef.current) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 3.5;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        
        const particleCount = 10000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const radius = 1.5;

        for (let i = 0; i < particleCount; i++) {
            const phi = Math.acos(-1 + (2 * i) / particleCount);
            const theta = Math.sqrt(particleCount * Math.PI) * phi;
            const x = radius * Math.cos(theta) * Math.sin(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(phi);
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0x6b7280,
            size: 0.02,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        const particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);

        threeRef.current = { scene, camera, renderer, particleSystem, material, clock: new THREE.Clock() };

        const resizeObserver = new ResizeObserver(() => {
            if (!threeRef.current || !container) return;
            const { camera, renderer } = threeRef.current;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            if (container) {
                container.removeChild(renderer.domElement);
            }
            material.dispose();
            geometry.dispose();
            renderer.dispose();
        };
    }, []);

    // Effect for the animation loop
    useEffect(() => {
        if (!threeRef.current) return;
        
        const { scene, camera, renderer, particleSystem, material, clock } = threeRef.current;
        let animationFrameId: number;
        
        const dataArray = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();

            let color: THREE.ColorRepresentation = '#6b7280';
            let energy = 0.1;
            let baseSize = 0.02;
    
            switch (status) {
                case 'idle':
                    color = '#00ffff'; // Cyan for standby
                    const pulse = (Math.sin(elapsedTime * 1.5) + 1) / 2; // Slow pulse from 0 to 1
                    energy = 0.2 + pulse * 0.3; // Energy pulsates gently (0.2 to 0.5 for opacity)
                    baseSize = 0.025 + pulse * 0.015; // Size pulsates (0.025 to 0.04)
                    break;
                case 'listening': color = '#34d399'; energy = 0.5; baseSize = 0.03; break;
                case 'speaking': color = '#60a5fa'; energy = 1.0; baseSize = 0.035; break;
                case 'executing': color = '#fbbf24'; energy = 0.7; baseSize = 0.03; break; // Fixed typo
                case 'recalling': color = '#c084fc'; energy = 0.4; break;
                case 'connecting': case 'verifying': color = '#facc15'; energy = 0.3; break;
            }
            
            let audioLevel = 0;
            if (analyserNode && dataArray && (status === 'listening' || status === 'speaking')) {
                analyserNode.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                audioLevel = (sum / dataArray.length) / 128.0; // Normalize
                energy += audioLevel * 1.5;
                baseSize += audioLevel * 0.05;
            } else if (status !== 'idle') {
                 // Keep other non-audio states animated with a gentle pulse
                 energy += Math.sin(elapsedTime * 2) * 0.05;
            }
            
            material.color.set(color);
            material.size = Math.max(0.01, baseSize);
            material.opacity = Math.min(1.0, energy);
            
            particleSystem.rotation.y = elapsedTime * 0.1;
            particleSystem.rotation.x = elapsedTime * 0.05;
            
            renderer.render(scene, camera);
        };
        
        animate();
        
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [status, analyserNode]);

    return (
        <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
            {/* The canvas is now managed by Three.js and will be appended here */}
        </div>
    );
};


export { MiniLuto };