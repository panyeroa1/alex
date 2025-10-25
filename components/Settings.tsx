
import React from 'react';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onManagePermissions: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onManagePermissions }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center transition-opacity duration-300 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900/90 backdrop-blur-lg border border-white/10 rounded-xl w-full max-w-md m-4 text-white shadow-2xl animate-slide-up"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <header className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close Settings">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>
                <main className="p-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white/80">Permissions</h3>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                            <div className="flex flex-col">
                                <span className="font-medium">Screen Sharing</span>
                                <span className="text-sm text-white/50">Allow Alex to view your screen.</span>
                            </div>
                            <button 
                                onClick={onManagePermissions}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-all duration-300 transform hover:scale-105"
                            >
                                Activate
                            </button>
                        </div>
                    </div>
                </main>
            </div>
            <style>
            {`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }

                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            `}
            </style>
        </div>
    );
};
