
import React, { useState, useEffect, useRef } from 'react';
import { CliHistoryItem } from '../types';

interface DevConsoleProps {
    isOpen: boolean;
    onClose: () => void;
    browserUrl: string;
    cliHistory: CliHistoryItem[];
    onRunCommand: (command: string) => Promise<string>;
}

export const DevConsole: React.FC<DevConsoleProps> = ({ 
    isOpen, 
    onClose, 
    browserUrl,
    cliHistory,
    onRunCommand
}) => {
    const [isClosing, setIsClosing] = useState(false);
    const [commandInput, setCommandInput] = useState('');
    const terminalEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [cliHistory]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };
    
    const handleCommandSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (commandInput.trim()) {
            await onRunCommand(commandInput.trim());
            setCommandInput('');
        }
    };
    
    if (!isOpen && !isClosing) return null;

    return (
        <div className={`fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`w-full h-full max-w-6xl mx-auto bg-gray-900/90 backdrop-blur-lg border border-white/10 rounded-xl flex flex-col shadow-2xl ${isClosing ? 'animate-slide-out-bottom' : 'animate-slide-in-bottom'}`}>
                <header className="flex items-center justify-between p-2 border-b border-white/10 flex-shrink-0 text-white/80">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5 pl-2">
                           <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                           <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                           <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        </div>
                        <h2 className="text-sm font-semibold">Developer Console</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close Developer Console">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <main className="flex-1 grid md:grid-cols-2 gap-px bg-white/10 overflow-hidden">
                    {/* Browser View */}
                    <div className="bg-gray-900 flex flex-col">
                        <div className="bg-black/20 p-2 flex items-center gap-2 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            <input
                                type="text"
                                readOnly
                                value={browserUrl}
                                className="flex-1 bg-white/5 text-white/80 text-sm p-1.5 rounded-md focus:outline-none"
                            />
                        </div>
                        <div className="flex-1 bg-white">
                            <iframe
                                src={browserUrl}
                                title="Developer Console Browser"
                                className="w-full h-full border-none"
                                sandbox="allow-scripts allow-same-origin allow-forms"
                            ></iframe>
                        </div>
                    </div>
                    
                    {/* Terminal View */}
                    <div className="bg-black text-white flex flex-col font-mono text-sm" onClick={() => inputRef.current?.focus()}>
                        <div className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                            {cliHistory.map((item, index) => (
                                <div key={index} className="whitespace-pre-wrap">
                                    {item.type === 'command' && (
                                        <div className="flex gap-2">
                                            <span className="text-green-400">alex@local:~$</span>
                                            <span>{item.text}</span>
                                        </div>
                                    )}
                                    {item.type === 'output' && (
                                        <p className="text-white/90">{item.text}</p>
                                    )}
                                </div>
                            ))}
                            <div ref={terminalEndRef} />
                        </div>
                        <form onSubmit={handleCommandSubmit} className="flex gap-2 p-2 border-t border-gray-700">
                             <span className="text-green-400">alex@local:~$</span>
                             <input
                                ref={inputRef}
                                type="text"
                                value={commandInput}
                                onChange={(e) => setCommandInput(e.target.value)}
                                className="flex-1 bg-transparent text-white focus:outline-none"
                                spellCheck="false"
                                autoComplete="off"
                             />
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
};
