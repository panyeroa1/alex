import React, { useState, useRef } from 'react';
import { analyzeAudioTone, generateLyrics, synthesizeSpeech } from '../services/geminiService';
import { Notification } from '../types';

interface MusicStudioProps {
    isOpen: boolean;
    onClose: () => void;
    addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
    playAudio: (base64Audio: string) => Promise<void>;
    generateLyrics: (prompt: string, genre?: string) => Promise<string>;
    analyzeAudioTone: (audioBlob: File) => Promise<string>;
    synthesizeSpeech: (text: string) => Promise<string>;
}

const LoadingSpinner: React.FC = () => (
    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
);

export const MusicStudio: React.FC<MusicStudioProps> = ({
    isOpen,
    onClose,
    addNotification,
    playAudio,
}) => {
    const [isClosing, setIsClosing] = useState(false);
    
    // Lyric Studio State
    const [lyricPrompt, setLyricPrompt] = useState('');
    const [lyricGenre, setLyricGenre] = useState('');
    const [lyrics, setLyrics] = useState('');
    const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
    const [isSinging, setIsSinging] = useState(false);
    
    // Tone Analyzer State
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    const handleGenerateLyrics = async () => {
        if (!lyricPrompt.trim()) {
            addNotification('Boss, kailangan ng prompt para makapagsulat ako.', 'error');
            return;
        }
        setIsGeneratingLyrics(true);
        try {
            const result = await generateLyrics(lyricPrompt, lyricGenre);
            setLyrics(result);
            addNotification('Eto na, Boss. Freshly written lyrics.', 'success');
        } catch (error) {
            console.error("Failed to generate lyrics:", error);
            addNotification('Sorry, Boss. Na-writer\'s block ako.', 'error');
        } finally {
            setIsGeneratingLyrics(false);
        }
    };

    const handleSing = async () => {
        if (!lyrics.trim()) {
            addNotification('Boss, walang lyrics para kantahin.', 'error');
            return;
        }
        setIsSinging(true);
        try {
            const singPrompt = `Sing the following lyrics clearly and with emotion. Do not speak, only sing.\n\n${lyrics}`;
            const audioBase64 = await synthesizeSpeech(singPrompt);
            await playAudio(audioBase64);
            addNotification('Nag-perform na ako, Boss.', 'info');
        } catch (error) {
            console.error("Failed to sing:", error);
            addNotification('Sorry, Boss. Paos ako ngayon.', 'error');
        } finally {
            setIsSinging(false);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 25 * 1024 * 1024) { // 25MB limit
                addNotification('Boss, masyadong malaki yung file. Max 25MB lang.', 'error');
                return;
            }
            setAudioFile(file);
            setAnalysisResult('');
        }
    };

    const handleAnalyze = async () => {
        if (!audioFile) {
            addNotification('Boss, kailangan ng audio file.', 'error');
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult('');
        try {
            const result = await analyzeAudioTone(audioFile);
            setAnalysisResult(result);
            addNotification('Analysis complete, Boss.', 'success');
        } catch (error) {
            console.error("Failed to analyze audio:", error);
            addNotification('Sorry, Boss. Hindi ko ma-analyze yan.', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const renderAnalysisResult = (text: string) => {
        return text
            .replace(/\*\*(.*?):\*\*/g, '<h4 class="text-sm font-semibold text-blue-300 mt-3 mb-1">$1</h4>')
            .replace(/\n/g, '<br />');
    };
    
    if (!isOpen && !isClosing) return null;

    return (
        <div className={`fixed inset-0 bg-black/80 z-40 flex flex-col p-4 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`w-full max-w-5xl mx-auto bg-gray-900/80 backdrop-blur-lg border border-white/10 rounded-xl flex flex-col h-full animate-slide-up`}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="text-xl font-bold">Music Studio</h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close Music Studio">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <main className="flex-1 grid md:grid-cols-2 gap-px bg-white/10 overflow-hidden">
                    {/* Lyric Studio */}
                    <div className="bg-gray-900/80 p-6 flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        <h3 className="text-lg font-semibold text-white/90">Lyric Studio</h3>
                        <div className='flex-1 flex flex-col gap-4'>
                            <input
                                type="text"
                                value={lyricPrompt}
                                onChange={(e) => setLyricPrompt(e.target.value)}
                                placeholder="Prompt (e.g., kanta tungkol sa loyalty)"
                                className="w-full bg-black/30 text-white/90 p-2 rounded-md border border-white/20 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                             <input
                                type="text"
                                value={lyricGenre}
                                onChange={(e) => setLyricGenre(e.target.value)}
                                placeholder="Genre (optional, e.g., rock, pop)"
                                className="w-full bg-black/30 text-white/90 p-2 rounded-md border border-white/20 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                            <button onClick={handleGenerateLyrics} disabled={isGeneratingLyrics} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-full transition-all flex items-center justify-center gap-2">
                                {isGeneratingLyrics ? <LoadingSpinner /> : 'Generate Lyrics'}
                            </button>
                             <textarea
                                value={lyrics}
                                onChange={(e) => setLyrics(e.target.value)}
                                placeholder="Your lyrics will appear here..."
                                className="w-full flex-1 bg-black/30 text-white/90 p-3 rounded-lg border border-white/20 focus:ring-2 focus:ring-blue-500 focus:outline-none scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent min-h-[200px]"
                            />
                             <button onClick={handleSing} disabled={isSinging || !lyrics} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-full transition-all flex items-center justify-center gap-2">
                                {isSinging ? <LoadingSpinner /> : 'Sing Lyrics'}
                            </button>
                        </div>
                    </div>

                    {/* Tone Analyzer */}
                    <div className="bg-gray-900/80 p-6 flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        <h3 className="text-lg font-semibold text-white/90">Tone Analyzer</h3>
                        <div className='flex-1 flex flex-col gap-4'>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full text-center py-3 px-4 border-2 border-dashed border-white/20 rounded-lg hover:bg-white/5 hover:border-white/40 transition-colors">
                                <span className="text-blue-400 font-semibold">{audioFile ? audioFile.name : 'Select Audio File'}</span>
                            </button>
                            <button onClick={handleAnalyze} disabled={isAnalyzing || !audioFile} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-full transition-all flex items-center justify-center gap-2">
                                {isAnalyzing ? <LoadingSpinner /> : 'Analyze Tone'}
                            </button>
                            <div className="flex-1 bg-black/30 p-4 rounded-lg border border-white/20 min-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                                {isAnalyzing && (
                                    <div className="flex flex-col items-center justify-center h-full text-white/60 gap-3">
                                        <LoadingSpinner />
                                        <p className="animate-pulse">Analyzing the track, Boss...</p>
                                    </div>
                                )}
                                {analysisResult && (
                                    <div
                                        className="text-white/90 font-sans text-sm leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: renderAnalysisResult(analysisResult) }}
                                    />
                                )}
                                {!analysisResult && !isAnalyzing && (
                                    <div className="flex items-center justify-center h-full text-white/50">
                                        <p>Analysis results will appear here.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};