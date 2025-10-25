import React, { useState, useEffect } from 'react';
import { IntegrationCredentials, MediaItem } from '../types';
import { IntegrationModal } from './IntegrationModal';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    systemPrompt: string;
    onSaveSystemPrompt: (prompt: string) => void;
    integrations: IntegrationCredentials;
    onSaveIntegration: (name: string, creds: any) => void;
    mediaLibrary: MediaItem[];
    onSaveMediaLibrary: (library: MediaItem[]) => void;
}

type Tab = 'prompt' | 'integrations' | 'permissions' | 'library';
const INTEGRATION_LIST = ['GitHub', 'Jira', 'Slack', 'Gmail'];

export const Settings: React.FC<SettingsProps> = ({ 
    isOpen, 
    onClose, 
    systemPrompt, 
    onSaveSystemPrompt,
    integrations,
    onSaveIntegration,
    mediaLibrary,
    onSaveMediaLibrary,
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('prompt');
    const [promptDraft, setPromptDraft] = useState(systemPrompt);
    const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState('');
    const [newMediaItem, setNewMediaItem] = useState({ name: '', url: '', type: 'audio' as 'audio' | 'video' });
    
    // Add a state for the closing animation
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Reset prompt draft if the main prompt changes (e.g., from an external source)
        setPromptDraft(systemPrompt);
    }, [systemPrompt]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Match animation duration
    };

    const handleSavePrompt = () => {
        onSaveSystemPrompt(promptDraft);
        handleClose();
    };
    
    const handleOpenIntegrationModal = (name: string) => {
        setSelectedIntegration(name);
        setIsIntegrationModalOpen(true);
    };

    const handleSaveIntegrationCreds = (creds: any) => {
        onSaveIntegration(selectedIntegration.toLowerCase(), creds);
        setIsIntegrationModalOpen(false);
        setSelectedIntegration('');
    };

    const handleAddMediaItem = () => {
        if (newMediaItem.name.trim() && newMediaItem.url.trim()) {
            const newItem: MediaItem = { ...newMediaItem, id: Date.now() };
            onSaveMediaLibrary([...mediaLibrary, newItem]);
            setNewMediaItem({ name: '', url: '', type: 'audio' });
        }
    };

    const handleRemoveMediaItem = (id: number) => {
        onSaveMediaLibrary(mediaLibrary.filter(item => item.id !== id));
    };
    
    if (!isOpen && !isClosing) return null;

    const renderTabContent = () => {
        switch(activeTab) {
            case 'prompt':
                return (
                     <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-white/90">System Prompt</h3>
                        <p className="text-sm text-white/60">Modify the core instructions that define Alex's personality and objectives. Changes will apply to new sessions.</p>
                        <textarea
                            value={promptDraft}
                            onChange={(e) => setPromptDraft(e.target.value)}
                            className="w-full h-96 bg-black/30 text-white/90 p-3 rounded-lg border border-white/20 focus:ring-2 focus:ring-blue-500 focus:outline-none scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
                        />
                    </div>
                );
            case 'integrations':
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-white/90">Connect Integrations</h3>
                        <p className="text-sm text-white/60">Provide credentials to allow Alex to interact with third-party services.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {INTEGRATION_LIST.map(name => {
                                const isConnected = !!integrations[name.toLowerCase()];
                                return (
                                    <div key={name} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium">{name}</span>
                                            {isConnected && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">Connected</span>}
                                        </div>
                                        <button 
                                            onClick={() => handleOpenIntegrationModal(name)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-all text-sm"
                                        >
                                            {isConnected ? 'Manage' : 'Connect'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'library':
                 return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-semibold text-white/90">Media Library</h3>
                            <p className="text-sm text-white/60">Add audio/video URLs for Alex to use with the `playMusic` function.</p>
                        </div>
                        <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                             <input type="text" placeholder="Track Name" value={newMediaItem.name} onChange={(e) => setNewMediaItem(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-black/30 text-white/90 p-2 rounded-md border border-white/20 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                             <input type="text" placeholder="Media URL" value={newMediaItem.url} onChange={(e) => setNewMediaItem(prev => ({ ...prev, url: e.target.value }))} className="w-full bg-black/30 text-white/90 p-2 rounded-md border border-white/20 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                             <select value={newMediaItem.type} onChange={(e) => setNewMediaItem(prev => ({ ...prev, type: e.target.value as 'audio' | 'video' }))} className="w-full bg-black/30 text-white/90 p-2 rounded-md border border-white/20 focus:ring-1 focus:ring-blue-500 focus:outline-none">
                                <option value="audio">Audio</option>
                                <option value="video">Video</option>
                             </select>
                             <button onClick={handleAddMediaItem} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-all text-sm">Add to Library</button>
                        </div>
                        <div className="space-y-2">
                           {mediaLibrary.length === 0 && <p className="text-center text-white/50 text-sm">Your library is empty.</p>}
                           {mediaLibrary.map(item => (
                               <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg text-sm">
                                   <div className='truncate mr-4'>
                                       <span className="font-semibold">{item.name}</span>
                                       <span className="text-white/50 ml-2 truncate">{item.url}</span>
                                   </div>
                                   <button onClick={() => handleRemoveMediaItem(item.id)} className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-white/10 text-xs flex-shrink-0">Remove</button>
                               </div>
                           ))}
                        </div>
                    </div>
                );
            case 'permissions':
                 return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-white/90">Permissions</h3>
                        <p className="text-sm text-white/60">Manage browser permissions required for Alex to function correctly.</p>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                             <div className="flex flex-col">
                                <span className="font-medium">Microphone & Camera</span>
                                <span className="text-sm text-white/50">Required for voice and video sessions. Manage access in your browser's site settings.</span>
                            </div>
                        </div>
                         <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                             <div className="flex flex-col">
                                <span className="font-medium">Screen Sharing</span>
                                <span className="text-sm text-white/50">Required for screen sharing functionality. Manage access in your browser/OS settings.</span>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={`fixed inset-0 bg-black z-40 flex flex-col transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                <h2 className="text-xl font-bold">Settings</h2>
                <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close Settings">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <nav className="w-56 flex-shrink-0 border-r border-white/10 p-4">
                    <ul className="space-y-2">
                        <li><button onClick={() => setActiveTab('prompt')} className={`w-full text-left py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'prompt' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>System Prompt</button></li>
                        <li><button onClick={() => setActiveTab('integrations')} className={`w-full text-left py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'integrations' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>Integrations</button></li>
                        <li><button onClick={() => setActiveTab('library')} className={`w-full text-left py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'library' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>Library</button></li>
                        <li><button onClick={() => setActiveTab('permissions')} className={`w-full text-left py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'permissions' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>Permissions</button></li>
                    </ul>
                </nav>

                <main className="flex-1 p-6 overflow-y-auto">
                    {renderTabContent()}
                </main>
            </div>
             {activeTab === 'prompt' && (
                <footer className="flex justify-end p-4 border-t border-white/10 flex-shrink-0 bg-gray-900/50">
                    <button 
                        onClick={handleSavePrompt}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition-all"
                    >
                        Save & Close
                    </button>
                </footer>
            )}

            {isIntegrationModalOpen && (
                <IntegrationModal 
                    integrationName={selectedIntegration}
                    currentCredentials={integrations[selectedIntegration.toLowerCase()] || {}}
                    onClose={() => setIsIntegrationModalOpen(false)}
                    onSave={handleSaveIntegrationCreds}
                />
            )}
        </div>
    );
};