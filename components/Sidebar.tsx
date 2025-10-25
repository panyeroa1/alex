import React from 'react';
import { Conversation } from '../types';

interface SidebarProps {
    isOpen: boolean;
    conversations: Conversation[];
    currentConversationId: string | null;
    onClose: () => void;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    isOpen, 
    conversations, 
    currentConversationId, 
    onClose, 
    onSelectConversation, 
    onNewConversation 
}) => {
    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={onClose}
            ></div>
            <aside className={`fixed top-0 left-0 h-full w-full sm:w-72 bg-gray-900/90 backdrop-blur-lg border-r border-white/10 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold">Conversations</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-2">
                    <button 
                        onClick={onNewConversation} 
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        New Conversation
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    <ul>
                        {conversations.map(convo => (
                            <li key={convo.id}>
                                <a 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); onSelectConversation(convo.id); }}
                                    className={`block w-full text-left px-3 py-2.5 rounded-md truncate transition-colors ${currentConversationId === convo.id ? 'bg-white/20' : 'hover:bg-white/10'}`}
                                >
                                    {convo.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
        </>
    );
};