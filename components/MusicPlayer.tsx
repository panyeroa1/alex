import React from 'react';
import { MediaItem } from '../types';

interface MusicPlayerProps {
    currentTrack: MediaItem | null;
    isPlaying: boolean;
    progress: { currentTime: number, duration: number };
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (time: number) => void;
}

const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) {
        return '00:00';
    }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ currentTrack, isPlaying, progress, onPlayPause, onNext, onPrev, onSeek }) => {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        if (currentTrack && !isVisible) {
            setIsVisible(true);
        }
    }, [currentTrack, isVisible]);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progress.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = e.currentTarget.clientWidth;
        const seekTime = (clickX / width) * progress.duration;
        onSeek(seekTime);
    };
    
    if (!currentTrack) return null;

    const progressPercentage = (progress.currentTime / progress.duration) * 100 || 0;

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-30 ${isVisible ? 'animate-slide-in-bottom' : 'animate-slide-out-bottom'}`}>
            <div className="max-w-4xl mx-auto p-4">
                <div className="bg-black/50 backdrop-blur-lg border border-white/10 rounded-xl p-3 flex flex-col gap-2 shadow-2xl">
                    <div className="flex items-center gap-4">
                        {currentTrack.thumbnailUrl ? (
                            <img src={currentTrack.thumbnailUrl} alt={currentTrack.name} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-12 h-12 bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                            </div>
                        )}
                        <div className="flex-1 truncate">
                            <p className="text-white font-semibold truncate">{currentTrack.name}</p>
                            <p className="text-white/60 text-sm">{currentTrack.source === 'youtube' ? 'From YouTube' : 'From Library'}</p>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            <button onClick={onPrev} className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-95" aria-label="Previous Track">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
                            </button>
                            <button 
                                onClick={onPlayPause} 
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors active:scale-95" 
                                aria-label={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? (
                                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                )}
                            </button>
                            <button onClick={onNext} className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-95" aria-label="Next Track">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                            </button>
                        </div>
                    </div>
                     <div className="flex items-center gap-3 text-white/70">
                        <span className="text-xs w-12 text-center font-mono">{formatTime(progress.currentTime)}</span>
                        <div 
                            className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer group"
                            onClick={handleProgressClick}
                        >
                            <div 
                                className="h-full bg-white rounded-full relative" 
                                style={{ width: `${progressPercentage}%` }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        </div>
                        <span className="text-xs w-12 text-center font-mono">{formatTime(progress.duration)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};