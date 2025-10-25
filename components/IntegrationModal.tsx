import React, { useState } from 'react';

interface IntegrationModalProps {
    integrationName: string;
    currentCredentials: any;
    onClose: () => void;
    onSave: (credentials: any) => void;
}

export const IntegrationModal: React.FC<IntegrationModalProps> = ({ integrationName, currentCredentials, onClose, onSave }) => {
    const [creds, setCreds] = useState(currentCredentials);

    const handleSave = () => {
        onSave(creds);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCreds({ ...creds, [e.target.name]: e.target.value });
    };

    const renderFields = () => {
        switch (integrationName) {
            case 'GitHub':
                return (
                    <div>
                        <label htmlFor="token" className="block text-sm font-medium text-white/70 mb-1">Personal Access Token</label>
                        <input type="password" name="token" id="token" value={creds.token || ''} onChange={handleChange} className="w-full bg-black/30 text-white/90 p-2 rounded-md border border-white/20 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                        <p className="text-xs text-white/50 mt-2">Required scopes: `repo`, `admin:repo_hook`.</p>
                    </div>
                );
            case 'Jira':
                return (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="instanceUrl" className="block text-sm font-medium text-white/70 mb-1">Instance URL</label>
                            <input type="text" name="instanceUrl" id="instanceUrl" placeholder="https://your-company.atlassian.net" value={creds.instanceUrl || ''} onChange={handleChange} className="w-full bg-black/30 text-white/90 p-2 rounded-md border border-white/20 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1">Email Address</label>
                            <input type="email" name="email" id="email" placeholder="you@example.com" value={creds.email || ''} onChange={handleChange} className="w-full bg-black/30 text-white/90 p-2 rounded-md border border-white/20 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label htmlFor="apiToken" className="block text-sm font-medium text-white/70 mb-1">API Token</label>
                            <input type="password" name="apiToken" id="apiToken" value={creds.apiToken || ''} onChange={handleChange} className="w-full bg-black/30 text-white/90 p-2 rounded-md border border-white/20 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                        </div>
                    </div>
                );
            case 'Slack':
                return (
                    <div>
                        <label htmlFor="botToken" className="block text-sm font-medium text-white/70 mb-1">Bot User OAuth Token</label>
                        <input type="password" name="botToken" id="botToken" placeholder="xoxb-..." value={creds.botToken || ''} onChange={handleChange} className="w-full bg-black/30 text-white/90 p-2 rounded-md border border-white/20 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                         <p className="text-xs text-white/50 mt-2">Find this in your Slack App's settings under "OAuth & Permissions".</p>
                    </div>
                );
            default:
                return <p>Integration not configured.</p>;
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center transition-opacity duration-300 animate-fade-in p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900/90 backdrop-blur-lg border border-white/10 rounded-xl w-full max-w-md text-white shadow-2xl animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold">Connect to {integrationName}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-95" aria-label="Close Modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>
                <main className="p-6">
                    {renderFields()}
                </main>
                <footer className="flex justify-end gap-4 p-4 bg-white/5 rounded-b-xl">
                     <button 
                        onClick={onClose}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-100"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-100"
                    >
                        Save
                    </button>
                </footer>
            </div>
        </div>
    );
};