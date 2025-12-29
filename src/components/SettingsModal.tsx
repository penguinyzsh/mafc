import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';

/**
 * 设置模态框的属性接口
 */
interface SettingsModalProps {
    /** 是否打开模态框 */
    isOpen: boolean;
    /** 关闭模态框的回调 */
    onClose: () => void;
    /** 当前 API Key */
    apiKey: string;
    /** 当前模型名称 */
    model: string;
    /** 保存设置的回调 */
    onSave: (key: string, model: string) => void;
    /** 重置应用的回调 */
    onReset: () => void;
    /** 清空历史的回调 */
    onClearHistory: () => void;
}

/**
 * 设置模态框组件
 * 用于配置 API Key 和模型，以及管理应用数据
 */

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, apiKey, model, onSave, onReset, onClearHistory }) => {
    const [localKey, setLocalKey] = useState(apiKey);
    const [localModel, setLocalModel] = useState(model);
    const [shouldRender, setShouldRender] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    // Handle mount/unmount for animation
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setLocalKey(apiKey);
            setLocalModel(model);
            setError(null);
            // Delay adding the 'open' class to ensure the mount happens first (opacity: 0)
            // then the transition triggers
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300); // Match CSS transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen, apiKey, model]);

    if (!shouldRender) return null;

    const handleSave = () => {
        // Validate API key format
        const trimmedKey = localKey.trim();
        const trimmedModel = localModel.trim();

        if (!trimmedKey) {
            setError('请输入 API Key');
            return;
        }

        if (!trimmedModel) {
            setError('请输入模型名称');
            return;
        }

        if (!trimmedKey.startsWith('AIza')) {
            if (!confirm(
                '警告：Gemini API Key 通常以 "AIza" 开头。您的 Key 以 "' +
                trimmedKey.substring(0, 4) + '..." 开头。\n\n确定要继续吗？'
            )) {
                return;
            }
        }

        onSave(trimmedKey, trimmedModel);
        onClose();
    };

    const handleClearHistory = () => {
        if (confirm("确定要清空聊天记录吗？API Key 和设置将保留。")) {
            onClearHistory();
            onClose();
        }
    }

    const handleReset = () => {
        if (confirm("确定吗？这将删除所有对话历史和设置 (重置应用)。")) {
            onReset();
        }
    }

    return (
        <div className={`modal-overlay ${isVisible ? 'open' : ''}`}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2 className="modal-title">设置</h2>
                    <button onClick={onClose} className="icon-btn">
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div style={{
                        padding: '10px',
                        background: '#fee2e2',
                        color: '#b91c1c',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Google Gemini API Key</label>
                    <input
                        type="password"
                        className="form-input"
                        value={localKey}
                        onChange={(e) => { setLocalKey(e.target.value); setError(null); }}
                        placeholder="AIza..."
                        style={error && !localKey ? { borderColor: 'red' } : {}}
                    />
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                        用于访问 Google Gemini 模型。仅存储在本地。
                    </p>
                </div>

                <div className="form-group">
                    <label className="form-label">模型名称</label>
                    <input
                        type="text"
                        className="form-input"
                        value={localModel}
                        onChange={(e) => { setLocalModel(e.target.value); setError(null); }}
                        placeholder="gemini-2.5-flash"
                        style={error && !localModel ? { borderColor: 'red' } : {}}
                    />
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                        输入 Gemini 模型名称 (例如 gemini-2.5-pro, gemini-2.5-flash)
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '3px' }}>
                        API 端点：https://generativelanguage.googleapis.com/v1beta/models/[model]
                    </p>
                </div>

                <div className="settings-actions" style={{ flexDirection: 'column', gap: '10px' }}>
                    <button
                        onClick={handleSave}
                        className="settings-btn settings-btn-primary"
                        style={{ width: '100%', padding: '12px' }}
                    >
                        <Save size={16} /> 保存更改
                    </button>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                            onClick={handleClearHistory}
                            className="settings-btn settings-btn-warning"
                        >
                            <Trash2 size={16} /> 清空记录
                        </button>
                        <button
                            onClick={handleReset}
                            className="settings-btn settings-btn-danger"
                        >
                            <Trash2 size={16} /> 重置应用
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

