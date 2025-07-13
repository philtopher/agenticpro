import { IStorage } from "@shared/schema";
import OpenAI from "openai";
import { AgentMemoryService } from "./agentMemory";

export interface LearningPattern {
  id: string;
  type: 'performance' | 'collaboration' | 'efficiency' | 'error';
  pattern: string;
  frequency: number;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface AdaptationStrategy {
  agentId: number;
  strategy: string;
  reasoning: string;
  expectedOutcome: string;
  implementedAt: Date;
  effectiveness?: number;
}

export class ContinuousLearningEngine {
  private openai: OpenAI;
  private learningPatterns: Map<string, LearningPattern> = new Map();
  private adaptationStrategies: Map<number, AdaptationStrategy[]> = new Map();

  constructor(
    private storage: IStorage,
    private memoryService: AgentMemoryService
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.startLearningCycle();
  }

  /**
   * Phase 5: Continuous Learning and Adaptation
   * - Pattern recognition across all agent interactions
   * - Adaptive strategy refinement based on outcomes
   * - System-wide optimization through learning
   * - Predictive improvement suggestions
   */

  private startLearningCycle(): void {
    // Run learning analysis every 10 minutes
    setInterval(async () => {
      await this.performLearningCycle();
    }, 10 * 60 * 1000);
  }

  private async performLearningCycle(): Promise<void> {
    try {
      console.log('🧠 Starting continuous learning cycle...');
      
      // 1. Analyze recent patterns
      await this.analyzeRecentPatterns();
      
      // 2. Identify optimization opportunities
      await this.identifyOptimizationOpportunities();
      
      // 3. Generate adaptation strategies
      await this.generateAdaptationStrategies();
      
      // 4. Apply successful patterns system-wide
      await this.propagateSuccessfulPatterns();
      
      console.log('✅ Continuous learning cycle completed');
    } catch (error) {
      console.error('Error in learning cycle:', error);
    }
  }

  private async analyzeRecentPatterns(): Promise<void> {
    try {
      const agents = await this.storage.getAgents();
      const recentTasks = await this.storage.getTasks({ 
        limit: 50, 
        orderBy: 'createdAt', 
        order: 'desc' 
      });
      
      for (const agent of agents) {
        const agentTasks = recentTasks.filter(task => task.assignedAgentId === agent.id);
        if (agentTasks.length === 0) continue;
        
        const patterns = await this.extractPatternsFromTasks(agent.id, agentTasks);
        
        for (const pattern of patterns) {
          this.learningPatterns.set(pattern.id, pattern);
        }
      }
    } catch (error) {
      console.error('Error analyzing recent patterns:', error);
    }
  }

  private async extractPatternsFromTasks(agentId: number, tasks: any[]): Promise<LearningPattern[]> {
    try {
      const agent = await this.storage.getAgent(agentId);
      
      const prompt = `
        Analyze these tasks for learning patterns:
        
        Agent: ${agent?.name} (${agent?.type})
        Tasks: ${tasks.map(t => `${t.title} (${t.status}) - ${t.description}`).join('\n')}
        
        Identify patterns in:
        - Task completion efficiency
        - Common challenges or errors
        - Collaboration effectiveness
        - Quality of outputs
        
        Return JSON:
        {
          "patterns": [
            {
              "type": "performance|collaboration|efficiency|error",
              "pattern": "description",
              "frequency": number,
              "confidence": 0.0-1.0,
              "impact": "low|medium|high",
              "recommendations": ["rec1", "rec2"]
            }
          ]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{"patterns":[]}');
      
      return result.patterns.map((p: any, index: number) => ({
        id: `${agentId}_${Date.now()}_${index}`,
        type: p.type,
        pattern: p.pattern,
        frequency: p.frequency,
        confidence: p.confidence,
        impact: p.impact,
        recommendations: p.recommendations
      }));
    } catch (error) {
      console.error('Error extracting patterns:', error);
      return [];
    }
  }

  private async identifyOptimizationOpportunities(): Promise<void> {
    try {
      const highImpactPatterns = Array.from(this.learningPatterns.values())
        .filter(p => p.impact === 'high' && p.confidence > 0.7);
      
      for (const pattern of highImpactPatterns) {
        const optimization = await this.generateOptimizationStrategy(pattern);
        if (optimization) {
          await this.implementOptimization(optimization);
        }
      }
    } catch (error) {
      console.error('Error identifying optimization opportunities:', error);
    }
  }

  private async generateOptimizationStrategy(pattern: LearningPattern): Promise<string | null> {
    try {
      const prompt = `
        Generate an optimization strategy for this pattern:
        
        Pattern: ${pattern.pattern}
        Type: ${pattern.type}
        Impact: ${pattern.impact}
        Recommendations: ${pattern.recommendations.join(', ')}
        
        Create a specific, actionable optimization strategy that can be implemented system-wide.
        Focus on practical improvements that will enhance agent performance.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an AI system optimization expert. Generate practical, implementable strategies."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating optimization strategy:', error);
      return null;
    }
  }

  private async implementOptimization(strategy: string): Promise<void> {
    try {
      // Store optimization strategy
      await this.storage.createCommunication({
        taskId: 0,
        fromAgentId: 0,
        toAgentId: 0,
        type: 'system_optimization',
        content: strategy,
        metadata: {
          type: 'continuous_learning',
          implementedAt: new Date()
        }
      });
      
      console.log('🔧 Optimization strategy implemented:', strategy.substring(0, 100) + '...');
    } catch (error) {
      console.error('Error implementing optimization:', error);
    }
  }

  private async generateAdaptationStrategies(): Promise<void> {
    try {
      const agents = await this.storage.getAgents();
      
      for (const agent of agents) {
        const agentPatterns = Array.from(this.learningPatterns.values())
          .filter(p => p.id.startsWith(`${agent.id}_`));
        
        if (agentPatterns.length === 0) continue;
        
        const adaptations = await this.createAdaptationStrategies(agent.id, agentPatterns);
        this.adaptationStrategies.set(agent.id, adaptations);
        
        // Apply most promising adaptation
        const bestAdaptation = adaptations.find(a => a.expectedOutcome.includes('high'));
        if (bestAdaptation) {
          await this.applyAdaptationStrategy(bestAdaptation);
        }
      }
    } catch (error) {
      console.error('Error generating adaptation strategies:', error);
    }
  }

  private async createAdaptationStrategies(agentId: number, patterns: LearningPattern[]): Promise<AdaptationStrategy[]> {
    try {
      const agent = await this.storage.getAgent(agentId);
      
      const prompt = `
        Create adaptation strategies for this agent:
        
        Agent: ${agent?.name} (${agent?.type})
        Patterns: ${patterns.map(p => `${p.type}: ${p.pattern}`).join('\n')}
        
        Generate 2-3 specific adaptation strategies that will improve performance.
        
        Return JSON:
        {
          "strategies": [
            {
              "strategy": "specific strategy",
              "reasoning": "why this will help",
              "expectedOutcome": "predicted improvement"
            }
          ]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{"strategies":[]}');
      
      return result.strategies.map((s: any) => ({
        agentId,
        strategy: s.strategy,
        reasoning: s.reasoning,
        expectedOutcome: s.expectedOutcome,
        implementedAt: new Date()
      }));
    } catch (error) {
      console.error('Error creating adaptation strategies:', error);
      return [];
    }
  }

  private async applyAdaptationStrategy(adaptation: AdaptationStrategy): Promise<void> {
    try {
      const agent = await this.storage.getAgent(adaptation.agentId);
      if (!agent) return;
      
      const currentCapabilities = typeof agent.capabilities === 'string' 
        ? JSON.parse(agent.capabilities) 
        : agent.capabilities;
      
      const updatedCapabilities = {
        ...currentCapabilities,
        adaptations: [
          ...(currentCapabilities.adaptations || []),
          {
            strategy: adaptation.strategy,
            reasoning: adaptation.reasoning,
            implementedAt: adaptation.implementedAt
          }
        ],
        lastAdaptation: new Date()
      };
      
      await this.storage.updateAgent(adaptation.agentId, {
        capabilities: JSON.stringify(updatedCapabilities)
      });
      
      console.log(`🎯 Adaptation applied to ${agent.name}: ${adaptation.strategy.substring(0, 50)}...`);
    } catch (error) {
      console.error('Error applying adaptation strategy:', error);
    }
  }

  private async propagateSuccessfulPatterns(): Promise<void> {
    try {
      const successfulPatterns = Array.from(this.learningPatterns.values())
        .filter(p => p.type === 'performance' && p.confidence > 0.8);
      
      for (const pattern of successfulPatterns) {
        await this.sharePatternWithAllAgents(pattern);
      }
    } catch (error) {
      console.error('Error propagating successful patterns:', error);
    }
  }

  private async sharePatternWithAllAgents(pattern: LearningPattern): Promise<void> {
    try {
      const agents = await this.storage.getAgents();
      
      for (const agent of agents) {
        // Share pattern as memory
        await this.memoryService.shareMemoryBetweenAgents(
          parseInt(pattern.id.split('_')[0]), // Source agent ID
          agent.id,
          'performance'
        );
        
        // Add pattern to agent's memory
        await this.storage.addAgentMemory({
          agentId: agent.id,
          memory: JSON.stringify({
            type: 'shared_pattern',
            pattern: pattern.pattern,
            recommendations: pattern.recommendations,
            confidence: pattern.confidence
          }),
          metadata: {
            type: 'continuous_learning',
            sourcePattern: pattern.id
          },
          createdAt: new Date()
        });
      }
      
      console.log(`📡 Pattern propagated to all agents: ${pattern.pattern.substring(0, 50)}...`);
    } catch (error) {
      console.error('Error sharing pattern with agents:', error);
    }
  }

  async generateSystemInsights(): Promise<{
    systemHealth: number;
    improvementAreas: string[];
    successMetrics: any;
    recommendations: string[];
  }> {
    try {
      const agents = await this.storage.getAgents();
      const recentTasks = await this.storage.getTasks({ limit: 100 });
      const patterns = Array.from(this.learningPatterns.values());
      
      const prompt = `
        Generate system-wide insights:
        
        Agents: ${agents.length} active
        Recent Tasks: ${recentTasks.length}
        Learning Patterns: ${patterns.length}
        
        Agent Performance: ${agents.map(a => `${a.name}: ${a.healthScore}/100`).join(', ')}
        Task Success Rate: ${recentTasks.filter(t => t.status === 'completed').length}/${recentTasks.length}
        
        Provide JSON response:
        {
          "systemHealth": 0-100,
          "improvementAreas": ["area1", "area2"],
          "successMetrics": {
            "taskCompletionRate": 0.0-1.0,
            "averageResponseTime": "time",
            "collaborationEfficiency": 0.0-1.0
          },
          "recommendations": ["rec1", "rec2"]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error generating system insights:', error);
      return {
        systemHealth: 0,
        improvementAreas: [],
        successMetrics: {},
        recommendations: []
      };
    }
  }

  getLearningPatterns(): LearningPattern[] {
    return Array.from(this.learningPatterns.values());
  }

  getAdaptationStrategies(): Map<number, AdaptationStrategy[]> {
    return this.adaptationStrategies;
  }
}