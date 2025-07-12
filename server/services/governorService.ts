import { Agent, Task, Communication } from "@shared/schema";
import { IStorage } from "../storage";
import { AGENT_PROMPTS } from "./agentAI";

export interface GovernorDecision {
  action: "reassign_task" | "escalate_to_user" | "send_ping";
  from: string;
  to: string;
  taskId: string;
  reason: string;
}

export interface AgentState {
  agent: Agent;
  tasks: Task[];
  recentActivity: Communication[];
  performanceMetrics: {
    avgResponseTime: number;
    successRate: number;
    taskLoad: number;
  };
}

export class GovernorService {
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(private storage: IStorage) {}

  startGovernorService(): void {
    if (this.monitoringInterval) return;

    // Monitor agents every 10 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.monitorAgents();
    }, 10 * 60 * 1000);
  }

  stopGovernorService(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async monitorAgents(): Promise<void> {
    try {
      const agents = await this.storage.getAgents();
      const decisions: GovernorDecision[] = [];
      
      for (const agent of agents) {
        const agentDecisions = await this.analyzeAgent(agent);
        decisions.push(...agentDecisions);
      }
      
      // Execute decisions
      for (const decision of decisions) {
        await this.executeDecision(decision);
      }
    } catch (error) {
      console.error('Error monitoring agents:', error);
    }
  }

  async analyzeAgent(agent: Agent): Promise<GovernorDecision[]> {
    const prompt = AGENT_PROMPTS[agent.type];
    if (!prompt) {
      return [];
    }

    // Get agent state
    const agentState = await this.getAgentState(agent);
    
    // Analyze using governor prompt
    const decisions = await this.simulateGovernorDecision(agentState, prompt.governorPrompt);
    
    return decisions;
  }

  private async getAgentState(agent: Agent): Promise<AgentState> {
    const tasks = await this.storage.getTasksByAgent(agent.id);
    const recentComms = await this.storage.getRecentCommunications(50);
    const recentActivity = recentComms.filter(comm => 
      comm.fromAgentId === agent.id || comm.toAgentId === agent.id
    );
    
    const performanceMetrics = await this.calculatePerformanceMetrics(agent, tasks, recentActivity);
    
    return {
      agent,
      tasks,
      recentActivity,
      performanceMetrics
    };
  }

  private async calculatePerformanceMetrics(
    agent: Agent, 
    tasks: Task[], 
    recentActivity: Communication[]
  ): Promise<{ avgResponseTime: number; successRate: number; taskLoad: number }> {
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const failedTasks = tasks.filter(task => task.status === 'failed');
    const activeTasks = tasks.filter(task => 
      task.status === 'in_progress' || task.status === 'pending'
    );
    
    const successRate = tasks.length > 0 ? 
      (completedTasks.length / (completedTasks.length + failedTasks.length)) * 100 : 100;
    
    const taskLoad = (activeTasks.length / agent.maxLoad) * 100;
    
    // Calculate avg response time from recent communications
    const avgResponseTime = agent.capabilities?.avgResponseTime || 600;
    
    return {
      avgResponseTime,
      successRate,
      taskLoad
    };
  }

  private async simulateGovernorDecision(
    agentState: AgentState,
    governorPrompt: string
  ): Promise<GovernorDecision[]> {
    const decisions: GovernorDecision[] = [];
    const { agent, tasks, recentActivity, performanceMetrics } = agentState;
    
    // Check for overloaded agents
    if (performanceMetrics.taskLoad > 80) {
      const overloadedTasks = tasks.filter(task => task.status === 'pending');
      if (overloadedTasks.length > 0) {
        // Find available agent of same type or Engineering Lead
        const availableAgent = await this.findAvailableAgent(agent.type);
        if (availableAgent) {
          decisions.push({
            action: 'reassign_task',
            from: agent.name,
            to: availableAgent.name,
            taskId: overloadedTasks[0].id.toString(),
            reason: `${agent.name} is overloaded (${performanceMetrics.taskLoad}% capacity)`
          });
        }
      }
    }
    
    // Check for stuck tasks
    const stuckTasks = tasks.filter(task => {
      const isStuck = task.status === 'in_progress' && 
        task.updatedAt < new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours old
      const hasEscalation = recentActivity.some(comm => 
        comm.taskId === task.id && comm.messageType === 'escalation'
      );
      
      return isStuck && !hasEscalation;
    });
    
    for (const stuckTask of stuckTasks) {
      decisions.push({
        action: 'escalate_to_user',
        from: agent.name,
        to: 'user',
        taskId: stuckTask.id.toString(),
        reason: `Task "${stuckTask.title}" has been stuck for over 4 hours`
      });
    }
    
    // Check for low performance agents
    if (performanceMetrics.successRate < 70 && tasks.length > 2) {
      const engineeringLead = await this.storage.getAgentByType('engineering_lead');
      if (engineeringLead) {
        decisions.push({
          action: 'send_ping',
          from: 'governor',
          to: engineeringLead.name,
          taskId: 'system',
          reason: `${agent.name} has low success rate (${performanceMetrics.successRate}%)`
        });
      }
    }
    
    return decisions;
  }

  private async findAvailableAgent(preferredType: string): Promise<Agent | null> {
    const agents = await this.storage.getAgents();
    
    // First try to find same type agent with capacity
    const sameTypeAgents = agents.filter(agent => 
      agent.type === preferredType && agent.currentLoad < agent.maxLoad
    );
    
    if (sameTypeAgents.length > 0) {
      return sameTypeAgents[0];
    }
    
    // Fallback to Engineering Lead
    const engineeringLead = agents.find(agent => 
      agent.type === 'engineering_lead' && agent.currentLoad < agent.maxLoad
    );
    
    return engineeringLead || null;
  }

  private async executeDecision(decision: GovernorDecision): Promise<void> {
    try {
      switch (decision.action) {
        case 'reassign_task':
          await this.reassignTask(decision);
          break;
        case 'escalate_to_user':
          await this.escalateToUser(decision);
          break;
        case 'send_ping':
          await this.sendPing(decision);
          break;
      }
      
      console.log(`Governor decision executed: ${decision.action} for task ${decision.taskId}`);
    } catch (error) {
      console.error('Error executing governor decision:', error);
    }
  }

  private async reassignTask(decision: GovernorDecision): Promise<void> {
    const taskId = parseInt(decision.taskId);
    const newAgent = await this.storage.getAgentByType(decision.to) || 
                     await this.storage.getAgentByType('engineering_lead');
    
    if (newAgent) {
      await this.storage.assignTask(taskId, newAgent.id);
      
      // Create communication record
      await this.storage.createCommunication({
        fromAgentId: null,
        toAgentId: newAgent.id,
        taskId: taskId,
        message: `Task reassigned by Governor: ${decision.reason}`,
        messageType: 'task_reassignment',
        metadata: {
          originalAgent: decision.from,
          reason: decision.reason
        }
      });
    }
  }

  private async escalateToUser(decision: GovernorDecision): Promise<void> {
    // Create user notification
    await this.storage.createNotification({
      type: 'escalation',
      title: 'Task Escalation',
      message: `Task requires attention: ${decision.reason}`,
      recipientId: null,
      metadata: {
        taskId: decision.taskId,
        agent: decision.from,
        reason: decision.reason
      }
    });
  }

  private async sendPing(decision: GovernorDecision): Promise<void> {
    const targetAgent = await this.storage.getAgentByType(decision.to);
    if (targetAgent) {
      await this.storage.createCommunication({
        fromAgentId: null,
        toAgentId: targetAgent.id,
        taskId: null,
        message: `Governor alert: ${decision.reason}`,
        messageType: 'system_alert',
        metadata: {
          alertType: 'performance',
          reason: decision.reason
        }
      });
    }
  }
}