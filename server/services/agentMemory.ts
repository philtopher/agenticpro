import { IStorage } from "@shared/schema";
import OpenAI from "openai";

export interface MemoryContext {
  taskId: number;
  agentId: number;
  outcome: string;
  lessons: string[];
  patterns: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface AgentInsight {
  type: 'success_pattern' | 'failure_pattern' | 'collaboration_insight' | 'efficiency_tip';
  content: string;
  confidence: number;
  applicability: string[];
}

export class AgentMemoryService {
  private openai: OpenAI;

  constructor(private storage: IStorage) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Phase 2: Advanced Memory Management System
   * - Contextual memory formation from task outcomes
   * - Pattern recognition across multiple tasks
   * - Collaborative memory sharing between agents
   * - Adaptive strategy refinement based on experience
   */

  async processTaskOutcome(agentId: number, taskId: number, outcome: string, details: any): Promise<void> {
    try {
      // Generate contextual insights from task outcome
      const insights = await this.generateInsights(agentId, taskId, outcome, details);
      
      // Store memory entry with rich context
      await this.storage.addAgentMemory({
        agentId,
        memory: JSON.stringify({
          taskId,
          outcome,
          insights,
          details,
          patterns: insights.patterns,
          lessons: insights.lessons
        }),
        metadata: {
          type: 'task_outcome',
          success: outcome === 'completed',
          timestamp: new Date(),
          taskType: details.taskType || 'unknown'
        },
        createdAt: new Date()
      });

      // Update agent's strategy based on insights
      await this.updateAgentStrategy(agentId, insights);
      
    } catch (error) {
      console.error('Error processing task outcome:', error);
    }
  }

  private async generateInsights(agentId: number, taskId: number, outcome: string, details: any): Promise<{
    patterns: string[];
    lessons: string[];
    recommendations: string[];
  }> {
    try {
      const agent = await this.storage.getAgent(agentId);
      const previousMemories = await this.storage.getAgentMemory(agentId);
      
      const prompt = `
        As an AI agent analysis system, analyze this task outcome and generate insights:
        
        Agent: ${agent?.name} (${agent?.type})
        Task ID: ${taskId}
        Outcome: ${outcome}
        Details: ${JSON.stringify(details)}
        
        Previous memories (last 5):
        ${previousMemories.slice(-5).map(m => m.memory).join('\n')}
        
        Generate insights in JSON format:
        {
          "patterns": ["pattern1", "pattern2"],
          "lessons": ["lesson1", "lesson2"],
          "recommendations": ["rec1", "rec2"]
        }
        
        Focus on:
        - Recurring patterns in successes/failures
        - Collaboration effectiveness
        - Task completion strategies
        - Areas for improvement
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{"patterns":[],"lessons":[],"recommendations":[]}');
    } catch (error) {
      console.error('Error generating insights:', error);
      return { patterns: [], lessons: [], recommendations: [] };
    }
  }

  private async updateAgentStrategy(agentId: number, insights: any): Promise<void> {
    try {
      const agent = await this.storage.getAgent(agentId);
      if (!agent) return;

      const currentCapabilities = typeof agent.capabilities === 'string' 
        ? JSON.parse(agent.capabilities) 
        : agent.capabilities;

      // Update agent capabilities with new insights
      const updatedCapabilities = {
        ...currentCapabilities,
        learningInsights: insights,
        adaptiveStrategies: insights.recommendations,
        lastUpdated: new Date()
      };

      await this.storage.updateAgent(agentId, {
        capabilities: JSON.stringify(updatedCapabilities)
      });
    } catch (error) {
      console.error('Error updating agent strategy:', error);
    }
  }

  async getAgentInsights(agentId: number): Promise<AgentInsight[]> {
    try {
      const memories = await this.storage.getAgentMemory(agentId);
      const agent = await this.storage.getAgent(agentId);
      
      if (!memories.length) return [];

      const prompt = `
        Analyze these agent memories and extract key insights:
        
        Agent: ${agent?.name} (${agent?.type})
        Memories: ${memories.map(m => m.memory).join('\n')}
        
        Generate insights in JSON format:
        {
          "insights": [
            {
              "type": "success_pattern",
              "content": "description",
              "confidence": 0.8,
              "applicability": ["task_type1", "task_type2"]
            }
          ]
        }
        
        Types: success_pattern, failure_pattern, collaboration_insight, efficiency_tip
        Confidence: 0.0 to 1.0
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{"insights":[]}');
      return result.insights || [];
    } catch (error) {
      console.error('Error getting agent insights:', error);
      return [];
    }
  }

  async shareMemoryBetweenAgents(sourceAgentId: number, targetAgentId: number, memoryType: string): Promise<void> {
    try {
      const sourceMemories = await this.storage.getAgentMemory(sourceAgentId);
      const relevantMemories = sourceMemories.filter(m => 
        m.metadata && m.metadata.type === memoryType
      );

      if (!relevantMemories.length) return;

      const sourceAgent = await this.storage.getAgent(sourceAgentId);
      const targetAgent = await this.storage.getAgent(targetAgentId);

      // Create collaborative memory entry
      await this.storage.addAgentMemory({
        agentId: targetAgentId,
        memory: JSON.stringify({
          type: 'shared_memory',
          source: sourceAgent?.name,
          memories: relevantMemories.map(m => m.memory),
          sharedAt: new Date()
        }),
        metadata: {
          type: 'collaborative_learning',
          source: sourceAgentId,
          memoryType
        },
        createdAt: new Date()
      });

      console.log(`🧠 Memory shared from ${sourceAgent?.name} to ${targetAgent?.name}`);
    } catch (error) {
      console.error('Error sharing memory between agents:', error);
    }
  }

  async reflectOnPerformance(agentId: number): Promise<{
    strengths: string[];
    improvements: string[];
    adaptations: string[];
  }> {
    try {
      const memories = await this.storage.getAgentMemory(agentId);
      const agent = await this.storage.getAgent(agentId);
      
      if (!memories.length) {
        return { strengths: [], improvements: [], adaptations: [] };
      }

      const prompt = `
        Conduct a performance reflection for this agent:
        
        Agent: ${agent?.name} (${agent?.type})
        Recent memories: ${memories.slice(-10).map(m => m.memory).join('\n')}
        
        Analyze performance and provide JSON response:
        {
          "strengths": ["strength1", "strength2"],
          "improvements": ["area1", "area2"],
          "adaptations": ["adaptation1", "adaptation2"]
        }
        
        Focus on:
        - What the agent excels at
        - Areas needing improvement
        - Recommended strategy adaptations
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{"strengths":[],"improvements":[],"adaptations":[]}');
      
      // Store reflection as memory
      await this.storage.addAgentMemory({
        agentId,
        memory: JSON.stringify({
          type: 'performance_reflection',
          reflection: result,
          timestamp: new Date()
        }),
        metadata: {
          type: 'self_reflection',
          timestamp: new Date()
        },
        createdAt: new Date()
      });

      return result;
    } catch (error) {
      console.error('Error reflecting on performance:', error);
      return { strengths: [], improvements: [], adaptations: [] };
    }
  }
}