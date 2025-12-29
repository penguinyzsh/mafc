import { Message } from '../types';
import { callGemini } from '../services/llm';
import { PROMPTS } from './Prompts';

/**
 * 智能体角色类型
 * PROFILER - 用户画像师：收集用户偏好
 * SPECIALIST - 类型专家：确定具体需求
 * CRITIC - 影评专家：分析并推荐电影
 * HOST - 主持人：呈现推荐结果
 */
export type AgentRole = 'PROFILER' | 'SPECIALIST' | 'CRITIC' | 'HOST';

/** 智能体系统状态 */
interface AgentState {
    currentRole: AgentRole;
    userProfile: string;
    currentDemand: string;
    recommendations: string;
    history: Message[];
    stateHistory: AgentRole[];
}

/** 多智能体电影推荐系统 */
export class AgentSystem {
    private state: AgentState;
    private apiKey: string;
    private model: string;
    private onMessageUpdate: (msgs: Message[]) => void;
    private onAgentChange: (agent: string) => void;

    constructor(apiKey: string, model: string, onMessageUpdate: (msgs: Message[]) => void, onAgentChange: (agent: string) => void) {
        this.apiKey = apiKey;
        this.model = model;
        this.onMessageUpdate = onMessageUpdate;
        this.onAgentChange = onAgentChange;

        this.state = {
            currentRole: 'PROFILER',
            userProfile: '',
            currentDemand: '',
            recommendations: '',
            history: [],
            stateHistory: ['PROFILER'] // Initialize with starting state
        };
    }

    public setHistory(history: Message[]) {
        this.state.history = history;
    }

    private isBackwardRequest(text: string): boolean {
        const backwardKeywords = ['返回', '上一步', '回去', '退回', '重新', '重来'];
        return backwardKeywords.some(keyword => text.includes(keyword));
    }

    /** 转换到新的智能体角色 */
    private transitionTo(newRole: AgentRole) {
        this.state.stateHistory.push(newRole);
        this.state.currentRole = newRole;
    }

    private goBack(): boolean {
        if (this.state.stateHistory.length <= 1) {
            this.addAgentMessage("System", "已经是第一步了，无法返回更早的阶段。");
            return false;
        }

        // Remove current state
        this.state.stateHistory.pop();
        // Get previous state
        const previousRole = this.state.stateHistory[this.state.stateHistory.length - 1];
        this.state.currentRole = previousRole;

        // Clear dependent data when going back
        if (previousRole === 'PROFILER') {
            this.state.userProfile = '';
            this.state.currentDemand = '';
            this.state.recommendations = '';
            this.addAgentMessage("Profiler", "好的，让我们重新开始。请告诉我您最喜欢的三部电影？");
        } else if (previousRole === 'SPECIALIST') {
            this.state.currentDemand = '';
            this.state.recommendations = '';
            this.addAgentMessage("Genre Specialist", "明白，让我们重新确认。您今天想看什么类型的电影？刺激的、感动的还是轻松的？");
        } else if (previousRole === 'HOST') {
            this.addAgentMessage("Host", "好的，有什么需要我重新推荐的吗？");
        }

        return true;
    }

    public async processUserMessage(userText: string) {
        // Check for backward navigation
        if (this.isBackwardRequest(userText)) {
            this.goBack();
            return;
        }

        this.onAgentChange(this.getAgentName(this.state.currentRole));

        try {
            switch (this.state.currentRole) {
                case 'PROFILER':
                    await this.runProfiler(userText);
                    break;
                case 'SPECIALIST':
                    await this.runSpecialist(userText);
                    break;
                case 'CRITIC':
                    break;
                case 'HOST':
                    await this.runHost(userText);
                    break;
            }
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.addSystemMessage(`错误: ${errorMsg}。请检查您的 API Key 和网络连接。`);
            throw error;
        }
    }

    private async runProfiler(userInput: string) {
        const context = this.buildContext(5);
        const prompt = `
      User Input: "${userInput}"
      Conversation History:
      ${context}
      
      CRITICAL: You must ALWAYS output the ||PROFILE_READY|| marker after analyzing user's response!
      Format: First provide your response, then on a new line add: ||PROFILE_READY|| [keywords]
      
      Example output:
      Your analysis and question...
      
      ||PROFILE_READY|| keyword1, keyword2, keyword3
    `;

        const response = await callGemini(this.apiKey, this.model, prompt, PROMPTS.PROFILER);

        if (response.includes("||PROFILE_READY||")) {
            const markerIndex = response.indexOf("||PROFILE_READY||");
            const reply = response.substring(0, markerIndex).trim();
            const profileData = response.substring(markerIndex + "||PROFILE_READY||".length).trim();

            this.state.userProfile = profileData;
            this.addAgentMessage("Profiler", reply);
            this.transitionTo('SPECIALIST');
        } else {
            this.addAgentMessage("Profiler", response);
        }
    }

    private async runSpecialist(userInput: string) {
        const context = this.buildContext(5);
        const prompt = `
        User Profile (Known): ${this.state.userProfile}
        Current Input: "${userInput}"
        History: ${context}
      `;

        const response = await callGemini(this.apiKey, this.model, prompt, PROMPTS.SPECIALIST);

        if (response.includes("||DEMAND_LOCKED||")) {
            const markerIndex = response.indexOf("||DEMAND_LOCKED||");
            const reply = response.substring(0, markerIndex).trim();
            const demandData = response.substring(markerIndex + "||DEMAND_LOCKED||".length).trim();

            this.state.currentDemand = demandData;
            this.addAgentMessage("Genre Specialist", reply);

            this.transitionTo('CRITIC');
            this.runCriticAndHost();
        } else {
            this.addAgentMessage("Genre Specialist", response);
        }
    }

    private async runCriticAndHost() {
        this.onAgentChange("Critic Agent");

        // 1. Critic Step
        const criticPrompt = `
          User Profile: ${this.state.userProfile}
          Current Request: ${this.state.currentDemand}
          
          Analyze and recommend 2 perfect movies. Return ONLY the JSON-like format as specified in your instructions.
      `;

        const criticResponse = await callGemini(this.apiKey, this.model, criticPrompt, PROMPTS.CRITIC);
        this.state.recommendations = criticResponse;

        // 2. Host Step
        this.transitionTo('HOST');
        this.onAgentChange("Host Agent");

        const hostPrompt = `
        Critic Recommendations:
        ${this.state.recommendations}
        
        User Profile: ${this.state.userProfile}
        User Request: ${this.state.currentDemand}
        
        Present these to the user warmly.
      `;

        const hostResponse = await callGemini(this.apiKey, this.model, hostPrompt, PROMPTS.HOST);
        this.addAgentMessage("Host", hostResponse);
    }

    private async runHost(userInput: string) {
        const context = this.buildContext(5);
        const prompt = `
         User Input: ${userInput}
         History: ${context}
         Previous Recommendations: ${this.state.recommendations}
         
         Continue chatting, answer questions about the recommendation, or recommend something else if they hate it.
      `;

        const response = await callGemini(this.apiKey, this.model, prompt, PROMPTS.HOST);
        this.addAgentMessage("Host", response);
    }

    private buildContext(limit: number): string {
        return this.state.history.slice(-limit).map(m => `${m.role}: ${m.content}`).join('\n');
    }

    private addAgentMessage(name: string, content: string) {
        const msg: Message = {
            id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'agent',
            agentName: name,
            content: content,
            timestamp: Date.now()
        };
        this.state.history.push(msg);

        this.onMessageUpdate([msg]);
    }

    private addSystemMessage(text: string) {
        this.addAgentMessage("System", text);
    }

    private getAgentName(role: AgentRole): string {
        switch (role) {
            case 'PROFILER': return "Profiler";
            case 'SPECIALIST': return "Genre Specialist";
            case 'CRITIC': return "Critic";
            case 'HOST': return "Host";
            default: return "Agent";
        }
    }
}
