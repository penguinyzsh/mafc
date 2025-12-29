/**
 * 消息接口定义
 */
export interface Message {
    /** 消息唯一标识 */
    id: string;
    /** 消息角色：用户、智能体或系统 */
    role: 'user' | 'agent' | 'system';
    /** 消息内容 */
    content: string;
    /** 智能体名称（可选，仅用于智能体消息） */
    agentName?: string;
    /** 消息时间戳 */
    timestamp: number;
}
