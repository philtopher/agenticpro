import { AgentMemoryService } from './agentMemoryService';
import { AgentCommunicationProtocol } from './agentCommunicationProtocol';
import * as storage from '../storage';

interface PerformanceMetrics {
  agentId: number;
  tasksCompleted: number;
  tasksSuccessful: number;
  tasksFailed: number;
  averageCompletionTime: number;
  successRate: number;
  responseTime: number;
  collaborationScore: number;
  learningRate: number;
  adaptabilityScore: number;
  lastUpdated: string;
}

interface HealthCheck {
  agentId: number;
  status: 'healthy' | 'degraded' | 'critical' | 'stuck';
  issues: Issue[];
  recommendations: string[];
  lastCheck: string;
  nextCheck: string;
}

interface Issue {
  type: 'performance' | 'communication' | 'resource' | 'logic' | 'dependency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  suggestedAction: string;
  detectedAt: string;
}

interface ExplanationContext {
  agentId: number;
  action: string;
  timestamp: string;
  inputs: any;
  outputs: any;
  reasoning: string;
  confidence: number;
  alternativeActions: string[];
  influencingFactors: string[];
}

interface CausalChain {
  id: string;
  agentId: number;
  outcome: string;
  events: CausalEvent[];
  confidence: number;
  generatedAt: string;
}

interface CausalEvent {
  id: string;
  type: 'thought' | 'action' | 'external_event' | 'memory_recall';
  description: string;
  timestamp: string;
  causedBy?: string;
  influences: string[];
  importance: number;
}

export class AgentSelfMonitoringService {
  private memoryService: AgentMemoryService;
  private communicationProtocol: AgentCommunicationProtocol;
  private storage: any;
  private performanceMetrics: Map<number, PerformanceMetrics> = new Map();
  private healthStatuses: Map<number, HealthCheck> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    memoryService: AgentMemoryService,
    communicationProtocol: AgentCommunicationProtocol,
    storage: any
  ) {
    this.memoryService = memoryService;
    this.communicationProtocol = communicationProtocol;
    this.storage = storage;
  }

  async startMonitoring(intervalMs: number = 60000): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const agents = await this.storage.getAgents();
        for (const agent of agents) {
          await this.performHealthCheck(agent.id);
          await this.updatePerformanceMetrics(agent.id);
        }
      } catch (error) {
        console.error('Error in self-monitoring:', error);
      }
    }, intervalMs);

    console.log('Agent self-monitoring started');
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Agent self-monitoring stopped');
  }

  private async performHealthCheck(agentId: number): Promise<HealthCheck> {
    const issues: Issue[] = [];
    const recommendations: string[] = [];

    // Check recent memory for signs of problems
    const recentMemory = await this.memoryService.getAgentMemory(agentId, {
      limit: 50,
      since: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // Last 2 hours
    });

    // Check for performance issues
    const performanceIssues = await this.checkPerformanceIssues(agentId, recentMemory);
    issues.push(...performanceIssues);

    // Check for communication issues
    const communicationIssues = await this.checkCommunicationIssues(agentId, recentMemory);
    issues.push(...communicationIssues);

    // Check for stuck state
    const stuckIssues = await this.checkForStuckState(agentId, recentMemory);
    issues.push(...stuckIssues);

    // Check for resource constraints
    const resourceIssues = await this.checkResourceConstraints(agentId);
    issues.push(...resourceIssues);

    // Generate recommendations
    if (issues.length > 0) {
      recommendations.push(...this.generateRecommendations(issues));
    }

    // Determine overall health status
    const status = this.determineHealthStatus(issues);

    const healthCheck: HealthCheck = {
      agentId,
      status,
      issues,
      recommendations,
      lastCheck: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 60000).toISOString()
    };

    this.healthStatuses.set(agentId, healthCheck);

    // Log health check
    await this.memoryService.logAgentMemory(agentId, {
      type: 'reflection',
      content: `Health check completed: ${status}. ${issues.length} issues found.`,
      details: healthCheck,
      timestamp: new Date().toISOString()
    });

    // If critical issues, escalate
    if (status === 'critical') {
      await this.escalateIssues(agentId, issues);
    }

    return healthCheck;
  }

  private async checkPerformanceIssues(agentId: number, recentMemory: any[]): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    const actions = recentMemory.filter(m => m.type === 'action');
    const failures = recentMemory.filter(m => 
      m.content.toLowerCase().includes('fail') || 
      m.content.toLowerCase().includes('error')
    );

    // Check failure rate
    if (failures.length > 0 && actions.length > 0) {
      const failureRate = failures.length / actions.length;
      if (failureRate > 0.3) {
        issues.push({
          type: 'performance',
          severity: failureRate > 0.5 ? 'high' : 'medium',
          description: `High failure rate: ${(failureRate * 100).toFixed(1)}% of recent actions failed`,
          impact: 'Reduced agent effectiveness and potential task delays',
          suggestedAction: 'Review recent failures and adjust strategy',
          detectedAt: new Date().toISOString()
        });
      }
    }

    // Check for slow response times
    const responseEntries = recentMemory.filter(m => m.details?.responseTime);
    if (responseEntries.length > 0) {
      const avgResponseTime = responseEntries.reduce((sum, entry) => 
        sum + (entry.details.responseTime || 0), 0) / responseEntries.length;
      
      if (avgResponseTime > 5000) { // 5 seconds
        issues.push({
          type: 'performance',
          severity: avgResponseTime > 10000 ? 'high' : 'medium',
          description: `Slow response time: ${avgResponseTime.toFixed(0)}ms average`,
          impact: 'Delayed task execution and reduced system responsiveness',
          suggestedAction: 'Optimize processing or reduce workload',
          detectedAt: new Date().toISOString()
        });
      }
    }

    return issues;
  }

  private async checkCommunicationIssues(agentId: number, recentMemory: any[]): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    const messages = await this.communicationProtocol.getMessages(agentId);
    const unreadMessages = messages.filter(m => !m.data?.read);
    
    // Check for unread messages
    if (unreadMessages.length > 10) {
      issues.push({
        type: 'communication',
        severity: unreadMessages.length > 20 ? 'high' : 'medium',
        description: `High number of unread messages: ${unreadMessages.length}`,
        impact: 'Missed collaboration opportunities and delayed responses',
        suggestedAction: 'Process message queue and respond to important messages',
        detectedAt: new Date().toISOString()
      });
    }

    // Check for failed communications
    const failedComms = recentMemory.filter(m => 
      m.type === 'event' && m.content.includes('communication') && m.content.includes('failed')
    );
    
    if (failedComms.length > 3) {
      issues.push({
        type: 'communication',
        severity: 'medium',
        description: `Multiple communication failures: ${failedComms.length} in recent period`,
        impact: 'Reduced collaboration effectiveness',
        suggestedAction: 'Check communication protocols and network connectivity',
        detectedAt: new Date().toISOString()
      });
    }

    return issues;
  }

  private async checkForStuckState(agentId: number, recentMemory: any[]): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    // Check for lack of recent activity
    const recentActions = recentMemory.filter(m => 
      m.type === 'action' && 
      new Date(m.timestamp).getTime() > Date.now() - 30 * 60 * 1000 // Last 30 minutes
    );

    if (recentActions.length === 0) {
      issues.push({
        type: 'logic',
        severity: 'high',
        description: 'No recent actions detected - agent may be stuck',
        impact: 'Agent is not contributing to system progress',
        suggestedAction: 'Restart agent reasoning cycle or check for blocking conditions',
        detectedAt: new Date().toISOString()
      });
    }

    // Check for repetitive actions
    const actionCounts = recentActions.reduce((counts, action) => {
      const key = action.content.substring(0, 50); // First 50 chars as key
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const repetitiveActions = Object.entries(actionCounts).filter(([, count]) => (count as number) > 5);
    if (repetitiveActions.length > 0) {
      issues.push({
        type: 'logic',
        severity: 'medium',
        description: `Repetitive action patterns detected: ${repetitiveActions.map(([action]) => action).join(', ')}`,
        impact: 'Agent may be stuck in a loop',
        suggestedAction: 'Review action logic and add variation or exit conditions',
        detectedAt: new Date().toISOString()
      });
    }

    return issues;
  }

  private async checkResourceConstraints(agentId: number): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    // Check task load
    const allTasks = await this.storage.getTasks();
    const agentTasks = allTasks.filter((t: any) => t.assignedToId === agentId && t.status !== 'completed');
    
    if (agentTasks.length > 8) {
      issues.push({
        type: 'resource',
        severity: agentTasks.length > 12 ? 'high' : 'medium',
        description: `High task load: ${agentTasks.length} active tasks`,
        impact: 'Potential for task delays and reduced quality',
        suggestedAction: 'Delegate tasks or request additional resources',
        detectedAt: new Date().toISOString()
      });
    }

    // Check memory usage (simplified)
    const memoryEntries = await this.memoryService.getAgentMemory(agentId);
    if (memoryEntries.length > 1000) {
      issues.push({
        type: 'resource',
        severity: 'low',
        description: `Large memory footprint: ${memoryEntries.length} entries`,
        impact: 'Potential for slower memory operations',
        suggestedAction: 'Consider memory cleanup or archiving old entries',
        detectedAt: new Date().toISOString()
      });
    }

    return issues;
  }

  private generateRecommendations(issues: Issue[]): string[] {
    const recommendations: string[] = [];
    
    // Add general recommendations based on issue types
    const issueTypes = Array.from(new Set(issues.map(i => i.type)));
    
    if (issueTypes.includes('performance')) {
      recommendations.push('Consider performance optimization or workload balancing');
    }
    if (issueTypes.includes('communication')) {
      recommendations.push('Improve communication protocols and message processing');
    }
    if (issueTypes.includes('logic')) {
      recommendations.push('Review reasoning logic and add error handling');
    }
    if (issueTypes.includes('resource')) {
      recommendations.push('Optimize resource usage or request additional capacity');
    }

    // Add severity-based recommendations
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Immediate attention required for critical issues');
    }

    return recommendations;
  }

  private determineHealthStatus(issues: Issue[]): 'healthy' | 'degraded' | 'critical' | 'stuck' {
    if (issues.length === 0) return 'healthy';
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) return 'critical';
    
    const stuckIssues = issues.filter(i => i.type === 'logic' && i.severity === 'high');
    if (stuckIssues.length > 0) return 'stuck';
    
    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) return 'degraded';
    
    return 'degraded';
  }

  private async escalateIssues(agentId: number, issues: Issue[]): Promise<void> {
    // Escalate to admin/supervisor agents
    const adminAgents = await this.storage.getAgents();
    const supervisors = adminAgents.filter((a: any) => 
      a.role && a.role.toLowerCase().includes('admin') || 
      a.role.toLowerCase().includes('supervisor')
    );

    for (const supervisor of supervisors) {
      await this.communicationProtocol.sendMessage({
        fromAgentId: agentId,
        toAgentId: supervisor.id,
        type: 'request',
        content: `Critical health issues detected requiring immediate attention`,
        data: { issues, agentId, escalationType: 'health_critical' },
        priority: 10,
        requiresResponse: true
      });
    }
  }

  async updatePerformanceMetrics(agentId: number): Promise<PerformanceMetrics> {
    const allTasks = await this.storage.getTasks();
    const agentTasks = allTasks.filter((t: any) => t.assignedToId === agentId);
    
    const completedTasks = agentTasks.filter((t: any) => t.status === 'completed');
    const failedTasks = agentTasks.filter((t: any) => t.status === 'failed' || t.status === 'error');
    
    const tasksCompleted = completedTasks.length;
    const tasksSuccessful = completedTasks.filter((t: any) => !t.errors || t.errors.length === 0).length;
    const tasksFailed = failedTasks.length;
    
    const successRate = tasksCompleted > 0 ? tasksSuccessful / tasksCompleted : 0;
    
    // Calculate average completion time
    const completionTimes = completedTasks
      .filter((t: any) => t.createdAt && t.completedAt)
      .map((t: any) => {
        const start = new Date(t.createdAt).getTime();
        const end = new Date(t.completedAt).getTime();
        return end - start;
      });
    
    const averageCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum: number, time: number) => sum + time, 0) / completionTimes.length 
      : 0;

    // Calculate collaboration score
    const collaborationScore = await this.calculateCollaborationScore(agentId);
    
    // Calculate learning rate
    const learningRate = await this.calculateLearningRate(agentId);
    
    // Calculate adaptability score
    const adaptabilityScore = await this.calculateAdaptabilityScore(agentId);

    const metrics: PerformanceMetrics = {
      agentId,
      tasksCompleted,
      tasksSuccessful,
      tasksFailed,
      averageCompletionTime,
      successRate,
      responseTime: 0, // Would need to implement response time tracking
      collaborationScore,
      learningRate,
      adaptabilityScore,
      lastUpdated: new Date().toISOString()
    };

    this.performanceMetrics.set(agentId, metrics);
    
    // Log metrics update
    await this.memoryService.logAgentMemory(agentId, {
      type: 'reflection',
      content: `Performance metrics updated: ${tasksCompleted} tasks completed, ${(successRate * 100).toFixed(1)}% success rate`,
      details: metrics,
      timestamp: new Date().toISOString()
    });

    return metrics;
  }

  private async calculateCollaborationScore(agentId: number): Promise<number> {
    const messages = await this.communicationProtocol.getMessages(agentId);
    const sentMessages = messages.filter(m => m.fromAgentId === agentId);
    const receivedMessages = messages.filter(m => m.toAgentId === agentId);
    
    // Simple scoring: more communication = higher score
    const collaborationScore = Math.min(1.0, (sentMessages.length + receivedMessages.length) / 100);
    return collaborationScore;
  }

  private async calculateLearningRate(agentId: number): Promise<number> {
    const recentLearnings = await this.memoryService.getAgentMemory(agentId, {
      type: 'learning',
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days
    });
    
    // Simple scoring: more learning entries = higher rate
    const learningRate = Math.min(1.0, recentLearnings.length / 20);
    return learningRate;
  }

  private async calculateAdaptabilityScore(agentId: number): Promise<number> {
    const recentStrategies = await this.memoryService.getAgentMemory(agentId, {
      type: 'strategy',
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    // Simple scoring: strategy changes indicate adaptability
    const adaptabilityScore = Math.min(1.0, recentStrategies.length / 10);
    return adaptabilityScore;
  }

  async explainAction(agentId: number, action: string, context: any): Promise<ExplanationContext> {
    const recentMemory = await this.memoryService.getAgentMemory(agentId, {
      limit: 20,
      since: new Date(Date.now() - 60 * 60 * 1000).toISOString() // Last hour
    });

    // Find relevant thoughts and memories that influenced this action
    const relevantThoughts = recentMemory.filter(m => 
      m.type === 'thought' && m.timestamp < context.timestamp
    );

    const relevantMemories = recentMemory.filter(m => 
      m.type === 'learning' || m.type === 'strategy'
    );

    // Generate reasoning explanation
    const reasoning = this.generateReasoningExplanation(action, relevantThoughts, relevantMemories);
    
    // Calculate confidence based on available information
    const confidence = this.calculateActionConfidence(action, recentMemory);
    
    // Generate alternative actions
    const alternativeActions = this.generateAlternativeActions(action, context);
    
    // Identify influencing factors
    const influencingFactors = this.identifyInfluencingFactors(action, recentMemory, context);

    const explanation: ExplanationContext = {
      agentId,
      action,
      timestamp: new Date().toISOString(),
      inputs: context.inputs || {},
      outputs: context.outputs || {},
      reasoning,
      confidence,
      alternativeActions,
      influencingFactors
    };

    // Log explanation
    await this.memoryService.logAgentMemory(agentId, {
      type: 'reflection',
      content: `Generated explanation for action: ${action}`,
      details: explanation,
      timestamp: new Date().toISOString()
    });

    return explanation;
  }

  private generateReasoningExplanation(action: string, thoughts: any[], memories: any[]): string {
    let reasoning = `I decided to ${action} because `;
    
    // Add reasoning based on recent thoughts
    if (thoughts.length > 0) {
      const lastThought = thoughts[thoughts.length - 1];
      reasoning += `I was thinking about ${lastThought.content}. `;
    }
    
    // Add reasoning based on relevant memories
    const relevantLearnings = memories.filter(m => m.type === 'learning');
    if (relevantLearnings.length > 0) {
      reasoning += `Based on my past experience: ${relevantLearnings[0].content}. `;
    }
    
    // Add reasoning based on strategies
    const relevantStrategies = memories.filter(m => m.type === 'strategy');
    if (relevantStrategies.length > 0) {
      reasoning += `My current strategy is: ${relevantStrategies[0].content}. `;
    }
    
    return reasoning.trim();
  }

  private calculateActionConfidence(action: string, recentMemory: any[]): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on successful similar actions
    const similarActions = recentMemory.filter(m => 
      m.type === 'action' && m.content.includes(action.split(' ')[0])
    );
    
    const successfulSimilar = similarActions.filter(a => 
      !a.content.toLowerCase().includes('fail')
    );
    
    if (similarActions.length > 0) {
      confidence += (successfulSimilar.length / similarActions.length) * 0.3;
    }
    
    // Increase confidence based on relevant learning
    const relevantLearnings = recentMemory.filter(m => 
      m.type === 'learning' && m.content.toLowerCase().includes('success')
    );
    
    confidence += Math.min(0.2, relevantLearnings.length * 0.05);
    
    return Math.min(1.0, confidence);
  }

  private generateAlternativeActions(action: string, context: any): string[] {
    const alternatives = [];
    
    // Generate contextual alternatives
    if (action.includes('assign')) {
      alternatives.push('delegate to another agent', 'request help from team', 'decompose into subtasks');
    } else if (action.includes('complete')) {
      alternatives.push('request more time', 'ask for clarification', 'collaborate with others');
    } else if (action.includes('communicate')) {
      alternatives.push('send direct message', 'broadcast to team', 'schedule meeting');
    } else {
      alternatives.push('take different approach', 'seek advice', 'pause and reflect');
    }
    
    return alternatives;
  }

  private identifyInfluencingFactors(action: string, recentMemory: any[], context: any): string[] {
    const factors = [];
    
    // Add memory-based factors
    if (recentMemory.some(m => m.type === 'learning')) {
      factors.push('past learning experiences');
    }
    
    if (recentMemory.some(m => m.type === 'strategy')) {
      factors.push('current strategy');
    }
    
    // Add context-based factors
    if (context.taskPriority) {
      factors.push(`task priority: ${context.taskPriority}`);
    }
    
    if (context.workload) {
      factors.push(`current workload: ${context.workload}`);
    }
    
    if (context.teamStatus) {
      factors.push(`team status: ${context.teamStatus}`);
    }
    
    return factors;
  }

  async generateCausalChain(agentId: number, outcome: string): Promise<CausalChain> {
    const recentMemory = await this.memoryService.getAgentMemory(agentId, {
      limit: 50,
      since: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // Last 2 hours
    });

    const events: CausalEvent[] = [];
    
    // Convert memory entries to causal events
    recentMemory.forEach((memory, index) => {
      const event: CausalEvent = {
        id: `event_${index}`,
        type: memory.type as any,
        description: memory.content,
        timestamp: memory.timestamp,
        influences: [],
        importance: memory.importance || 5
      };
      
      // Find what caused this event
      if (index > 0) {
        const previousEvent = recentMemory[index - 1];
        if (this.isLikelyCause(previousEvent, memory)) {
          event.causedBy = `event_${index - 1}`;
        }
      }
      
      events.push(event);
    });

    // Calculate influences
    events.forEach(event => {
      event.influences = events
        .filter(e => e.causedBy === event.id)
        .map(e => e.id);
    });

    const causalChain: CausalChain = {
      id: `chain_${agentId}_${Date.now()}`,
      agentId,
      outcome,
      events,
      confidence: this.calculateChainConfidence(events),
      generatedAt: new Date().toISOString()
    };

    return causalChain;
  }

  private isLikelyCause(previousEvent: any, currentEvent: any): boolean {
    // Simple heuristic: if events are close in time and related in content
    const timeDiff = new Date(currentEvent.timestamp).getTime() - new Date(previousEvent.timestamp).getTime();
    const isCloseInTime = timeDiff < 5 * 60 * 1000; // 5 minutes
    
    const contentSimilarity = this.calculateContentSimilarity(
      previousEvent.content, 
      currentEvent.content
    );
    
    return isCloseInTime && contentSimilarity > 0.3;
  }

  private calculateContentSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = Array.from(new Set([...words1, ...words2]));
    
    return intersection.length / union.length;
  }

  private calculateChainConfidence(events: CausalEvent[]): number {
    if (events.length === 0) return 0;
    
    const eventsWithCauses = events.filter(e => e.causedBy);
    const causalityRatio = eventsWithCauses.length / events.length;
    
    // Higher confidence if more events have clear causes
    return Math.min(1.0, causalityRatio * 1.2);
  }

  // Public accessors
  async getPerformanceMetrics(agentId: number): Promise<PerformanceMetrics | null> {
    return this.performanceMetrics.get(agentId) || null;
  }

  async getHealthStatus(agentId: number): Promise<HealthCheck | null> {
    return this.healthStatuses.get(agentId) || null;
  }

  async getAllPerformanceMetrics(): Promise<PerformanceMetrics[]> {
    return Array.from(this.performanceMetrics.values());
  }

  async getAllHealthStatuses(): Promise<HealthCheck[]> {
    return Array.from(this.healthStatuses.values());
  }
}
