import React, { useRef, useEffect, useState } from 'react';
import { Send, Bot, User, Loader2, Settings } from 'lucide-react';
import { Message } from '../types';

/**
 * 聊天组件的属性接口
 */
interface ChatProps {
    /** 消息列表 */
    messages: Message[];
    /** 发送消息的回调函数 */
    onSendMessage: (text: string) => void;
    /** 是否正在输入中 */
    isTyping: boolean;
    /** 当前活跃的智能体名称 */
    currentAgent: string | null;
    /** 打开设置的回调函数 */
    onOpenSettings: () => void;
    /** 是否已配置 API Key */
    hasApiKey: boolean;
}

/**
 * 聊天窗口组件
 * 显示消息历史、输入框和发送功能
 */

export const Chat: React.FC<ChatProps> = ({
    messages,
    onSendMessage,
    isTyping,
    currentAgent,
    onOpenSettings,
    hasApiKey
}) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const formatMessage = (text: string) => {
        return text
            .split('\n')
            .map((line, i) => {
                const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} style={{ marginBottom: line.trim() === '' ? '0.5em' : '0.2em' }} />;
            });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;
        if (!hasApiKey) {
            onOpenSettings();
            return;
        }

        onSendMessage(input);
        setInput('');
        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    };

    return (
        <div className="chat-window">
            <div className="chat-header">
                <div className="chat-header-title">
                    MAFC
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {!hasApiKey && (
                        <div style={{ color: 'orange', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            ⚠️ 缺失 API Key
                        </div>
                    )}
                    <button
                        onClick={onOpenSettings}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            color: '#666'
                        }}
                        title="设置"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            <div className="chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                        <div className="message-avatar" style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: msg.role === 'user' ? '#ddd' : 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: msg.role === 'user' ? '#555' : 'white',
                            fontSize: '12px',
                            flexShrink: 0
                        }}>
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div>
                            {msg.role !== 'user' && (
                                <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px', marginLeft: '2px' }}>
                                    {msg.agentName || '智能体'}
                                </div>
                            )}
                            <div className={`message-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                                {formatMessage(msg.content)}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="message-row assistant">
                        <div className="message-avatar" style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: '#ccc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Bot size={16} />
                        </div>
                        <div className="message-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Loader2 size={14} className="animate-spin" />
                            <span>{currentAgent || '智能体'} 正在思考...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
                <div className="input-box-container">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder={hasApiKey ? "输入消息..." : "请先在设置中配置 API Key"}
                        className="chat-input"
                        rows={1}
                    />
                    <button
                        onClick={() => handleSubmit()}
                        disabled={!input.trim() || isTyping}
                        className="send-btn"
                    >
                        <Send size={16} />
                    </button>
                </div>
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#999', marginTop: '10px' }}>
                    AI 生成内容可能不准确。
                </div>
            </div>
        </div>
    );
};
