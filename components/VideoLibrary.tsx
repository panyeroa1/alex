
import React, { useState, useEffect, useRef } from 'react';
import { MediaItem } from '../types';

interface VideoLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    videos: MediaItem[];
    videoToPlay: MediaItem | null;
    onPlaybackEnd: () => void;
}

export const VideoLibrary: React.FC<VideoLibraryProps> = ({ isOpen, onClose, videos, videoToPlay, onPlaybackEnd }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<MediaItem | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoToPlay) {
            setSelectedVideo(videoToPlay);
            onPlaybackEnd(); // Reset the autoplay trigger in parent immediately
        }
    }, [videoToPlay, onPlaybackEnd]);
    
    useEffect(() => {
        if (selectedVideo && videoRef.current) {
            videoRef.current.play().catch(e => console.error("Autoplay failed. User interaction may be required.", e));
        }
    }, [selectedVideo]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setSelectedVideo(null); // Reset selected video on close
            setIsClosing(false);
        }, 300);
    };
    
    if (!isOpen && !isClosing) return null;

    return (
        <div className={`fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`w-full h-full max-w-6xl mx-auto bg-gray-900/90 backdrop-blur-lg border border-white/10 rounded-xl flex flex-col shadow-2xl ${isClosing ? 'animate-slide-out-bottom' : 'animate-slide-in-bottom'}`}>
                <header className="flex items-center justify-between p-2 pl-4 border-b border-white/10 flex-shrink-0 text-white/80">
                    <h2 className="text-lg font-semibold">Video Library</h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close Video Library">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <main className="flex-1 grid md:grid-cols-3 gap-px bg-white/10 overflow-hidden">
                    {/* Video Player */}
                    <div className="md:col-span-2 bg-black flex items-center justify-center p-4">
                        {selectedVideo ? (
                            <video 
                                key={selectedVideo.id} 
                                ref={videoRef} 
                                src={selectedVideo.url} 
                                controls 
                                autoPlay 
                                className="max-w-full max-h-full rounded-lg outline-none"
                            />
                        ) : (
                            <div className="text-center text-white/50 flex flex-col items-center gap-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/20"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                                <p>Select a video from the playlist to begin.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Playlist */}
                    <div className="bg-gray-900/80 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        <h3 className="text-lg font-semibold mb-4 text-white/90">Playlist</h3>
                        <div className="space-y-2">
                            {videos.length === 0 ? (
                                <p className="text-center text-white/50 text-sm py-8">No videos in your library.</p>
                            ) : videos.map(video => (
                                <button 
                                    key={video.id} 
                                    onClick={() => setSelectedVideo(video)} 
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors duration-200 ${selectedVideo?.id === video.id ? 'bg-blue-600/40' : 'hover:bg-white/10'}`}
                                >
                                    {video.thumbnailUrl ? (
                                        <img src={video.thumbnailUrl} alt={video.name} className="w-20 h-12 object-cover rounded-md flex-shrink-0 bg-gray-800" />
                                    ) : (
                                        <div className="w-20 h-12 bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                        </div>
                                    )}
                                    <div className="flex-1 truncate">
                                        <p className="font-semibold text-sm text-white/90 truncate">{video.name}</p>
                                        <p className="text-xs text-white/50 capitalize">{video.source} source</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};