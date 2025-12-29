import { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { SettingsModal } from './components/SettingsModal';
import { AgentSystem } from './agents/AgentSystem';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './utils/storage';
import { Message } from './types';
import './index.css';

/**
 * MAFC 主应用组件
 * 管理应用状态、智能体系统和用户设置
 */
function App() {
    const [apiKey, setApiKey] = useState<string>('');
    const [model, setModel] = useState<string>('gemini-2.5-flash');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Single conversation state
    const [messages, setMessages] = useState<Message[]>([]);

    const [isTyping, setIsTyping] = useState(false);
    const [currentAgent, setCurrentAgent] = useState<string | null>(null);
    const [agentSystem, setAgentSystem] = useState<AgentSystem | null>(null);

    // Load settings and messages on mount
    useEffect(() => {
        const storedKey = loadFromStorage(STORAGE_KEYS.API_KEY, '');
        const storedModel = loadFromStorage(STORAGE_KEYS.MODEL, 'gemini-2.5-flash');
        if (storedKey) setApiKey(storedKey);
        if (storedModel) setModel(storedModel);

        // Load messages
        const storedMessages = loadFromStorage<Message[]>(STORAGE_KEYS.MESSAGES, []);

        if (storedMessages && storedMessages.length > 0) {
            setMessages(storedMessages);
        } else {
            // Initial welcome message
            const initialMessages: Message[] = [{
                id: 'welcome',
                role: 'agent',
                agentName: 'Profiler',
                content: "您好！我是 MAFC 影视推荐团队。为了给您更精准的推荐，能告诉我三部您最喜欢的电影吗？😊",
                timestamp: Date.now()
            }];
            setMessages(initialMessages);
        }
    }, []);


    // Save messages to storage whenever they change
    useEffect(() => {
        if (messages.length > 0) {
            saveToStorage(STORAGE_KEYS.MESSAGES, messages);
        }
    }, [messages]);

    // Initialize Agent System when API key is available
    useEffect(() => {
        if (!apiKey) {
            setAgentSystem(null);
            return;
        }

        // Create new system
        const system = new AgentSystem(
            apiKey,
            model,
            (newMessages) => {
                setMessages(currentHistory => {
                    const existingIds = new Set(currentHistory.map(m => m.id));
                    const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

                    if (uniqueNewMessages.length === 0) {
                        return currentHistory;
                    }

                    return [...currentHistory, ...uniqueNewMessages];
                });

                setIsTyping(false);
            },
            (agentName) => {
                setCurrentAgent(agentName);
                setIsTyping(true);
            }
        );

        setAgentSystem(system);

        // Sync history immediately
        if (messages.length > 0) {
            system.setHistory(messages);
        }

        return () => {
            setAgentSystem(null);
        };
    }, [apiKey, model]);

    // Sync agentSystem history when messages change
    useEffect(() => {
        if (agentSystem && messages.length > 0) {
            agentSystem.setHistory(messages);
        }
    }, [messages, agentSystem]);

    const handleSendMessage = (text: string) => {
        if (!agentSystem) {
            setIsSettingsOpen(true);
            return;
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        setIsTyping(true);

        agentSystem.setHistory(newHistory);

        agentSystem.processUserMessage(text).catch(err => {
            setIsTyping(false);
            const errorMessage = err.message || 'Unknown error occurred';

            const errorMsg: Message = {
                id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                role: 'system',
                content: `❌ 错误：${errorMessage}\n\n请检查：\n1. 您的 API Key 是否正确 (通常以 "AIza" 开头)\n2. 网络连接是否正常\n3. API Key 是否具有相应权限`,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, errorMsg]);
        });
    };

    const saveSettings = (key: string, selectedModel: string) => {
        setApiKey(key);
        setModel(selectedModel);
        saveToStorage(STORAGE_KEYS.API_KEY, key);
        saveToStorage(STORAGE_KEYS.MODEL, selectedModel);
    };

    const resetApp = () => {
        localStorage.clear();
        setApiKey('');
        setMessages([
            {
                id: 'welcome-reset',
                role: 'agent',
                agentName: 'Profiler',
                content: "系统已重置。请在设置中输入您的 Gemini API Key，然后告诉我您最喜欢的三部电影吧！",
                timestamp: Date.now()
            }
        ]);
        setAgentSystem(null);
        setIsSettingsOpen(false);
    };

    const handleClearHistory = () => {
        setMessages([
            {
                id: 'welcome-reset',
                role: 'agent',
                agentName: 'Profiler',
                content: "聊天记录已清空。😊",
                timestamp: Date.now()
            }
        ]);
        if (agentSystem) {
            agentSystem.setHistory([]);
        }
    };

    return (
        <div className="app-container">
            <Chat
                messages={messages}
                onSendMessage={handleSendMessage}
                isTyping={isTyping}
                currentAgent={currentAgent}
                onOpenSettings={() => setIsSettingsOpen(true)}
                hasApiKey={!!apiKey}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                apiKey={apiKey}
                model={model}
                onSave={saveSettings}
                onReset={resetApp}
                onClearHistory={handleClearHistory}
            />
        </div>
    );
}

export default App;
