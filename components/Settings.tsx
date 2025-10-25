import React, { useState } from 'react';
import { IntegrationCredentials } from '../types';
import { IntegrationModal } from './IntegrationModal';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    systemPrompt: string;
    onSaveSystemPrompt: (prompt: string) => void;
    integrations: IntegrationCredentials;
    onSaveIntegration: (name: string, creds: any) => void;
}

type Tab = 'prompt' | 'integrations' | 'permissions';
const INTEGRATION_LIST = ['GitHub', 'Jira', 'Slack'];

export const Settings: React.FC<SettingsProps> = ({ 
    isOpen, 
    onClose, 
    systemPrompt, 
    onSaveSystemPrompt,
    integrations,
    onSaveIntegration
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('prompt');
    const [promptDraft, setPromptDraft] = useState(systemPrompt);
    const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState('');

    if (!isOpen) return null;

    const handleSavePrompt = () => {
        onSaveSystemPrompt(promptDraft);
        onClose();
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

    const renderTabContent = () => {
        switch(activeTab) {
            case 'prompt':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white/80">Edit System Prompt</h3>
                        <p className="text-sm text-white/60">Modify the core instructions that define Alex's personality and objectives. Changes will apply to new sessions.</p>
                        <textarea
                            value={promptDraft}
                            onChange={(e) => setPromptDraft(e.target.value)}
                            className="w-full h-64 bg-black/30 text-white/90 p-3 rounded-lg border border-white/20 focus:ring-2 focus:ring-blue-500 focus:outline-none scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
                        />
                        <div className="flex justify-end">
                            <button 
                                onClick={handleSavePrompt}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-100"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                );
            case 'integrations':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white/80">Connect Integrations</h3>
                        <p className="text-sm text-white/60">Provide credentials to allow Alex to interact with third-party services.</p>
                        {INTEGRATION_LIST.map(name => {
                            const isConnected = !!integrations[name.toLowerCase()];
                            return (
                                <div key={name} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <span className="font-medium">{name}</span>
                                        {isConnected && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">Connected</span>}
                                    </div>
                                    <button 
                                        onClick={() => handleOpenIntegrationModal(name)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-100 text-sm"
                                    >
                                        {isConnected ? 'Manage' : 'Connect'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'permissions':
                 return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white/80">Permissions</h3>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                            <div className="flex flex-col">
                                <span className="font-medium">Screen Sharing</span>
                                <span className="text-sm text-white/50">Manage screen sharing in your browser/OS settings.</span>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <>
            <div 
                className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center transition-opacity duration-300 animate-fade-in p-4"
                onClick={onClose}
            >
                <div 
                    className="bg-gray-900/90 backdrop-blur-lg border border-white/10 rounded-xl w-full max-w-lg text-white shadow-2xl animate-slide-up flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                        <h2 className="text-xl font-bold">Settings</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-95" aria-label="Close Settings">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </header>
                    <div className="border-b border-white/10 px-4 flex-shrink-0">
                        <nav className="flex space-x-4">
                            <button onClick={() => setActiveTab('prompt')} className={`py-3 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'prompt' ? 'border-blue-500 text-white' : 'border-transparent text-white/60 hover:text-white'}`}>System Prompt</button>
                            <button onClick={() => setActiveTab('integrations')} className={`py-3 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'integrations' ? 'border-blue-500 text-white' : 'border-transparent text-white/60 hover:text-white'}`}>Integrations</button>
                            <button onClick={() => setActiveTab('permissions')} className={`py-3 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'permissions' ? 'border-blue-500 text-white' : 'border-transparent text-white/60 hover:text-white'}`}>Permissions</button>
                        </nav>
                    </div>
                    <main className="p-6 overflow-y-auto">
                        {renderTabContent()}
                    </main>
                </div>
            </div>
            {isIntegrationModalOpen && (
                <IntegrationModal 
                    integrationName={selectedIntegration}
                    currentCredentials={integrations[selectedIntegration.toLowerCase()] || {}}
                    onClose={() => setIsIntegrationModalOpen(false)}
                    onSave={handleSaveIntegrationCreds}
                />
            )}
        </>
    );
};