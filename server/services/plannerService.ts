import { Agent, Task, Communication } from "@shared/schema";
import { IStorage } from "../storage";
import { AGENT_PROMPTS } from "./agentAI";

export interface PlannerAction {
  taskId: string;
  action: "work" | "complete" | "request_help" | "defer";
  details: string;
  targetAgent?: string;
  reminderAt?: string;
}

export interface AgentMemoryState {
  beliefs: string[];
  inbox: Communication[];
  tasks: Task[];
}

export class PlannerService {
  constructor(private storage: IStorage) {}

  async generatePlan(agent: Agent): Promise<PlannerAction[]> {
    const prompt = AGENT_PROMPTS[agent.type];
    if (!prompt) {
      throw new Error(`No prompt found for agent type: ${agent.type}`);
    }

    // Get agent memory state
    const memoryState = await this.getAgentMemoryState(agent.id);
    
    // Simulate AI planning decision
    const plan = await this.simulatePlannerDecision(agent, memoryState, prompt.plannerPrompt);
    
    return plan;
  }

  private async getAgentMemoryState(agentId: number): Promise<AgentMemoryState> {
    // Get agent's tasks
    const tasks = await this.storage.getTasksByAgent(agentId);
    
    // Get recent communications (inbox)
    const recentComms = await this.storage.getRecentCommunications(20);
    const inbox = recentComms.filter(comm => 
      comm.toAgentId === agentId || comm.fromAgentId === agentId
    );
    
    // Get agent beliefs (from previous task history)
    const beliefs = await this.extractAgentBeliefs(agentId);
    
    return {
      beliefs,
      inbox,
      tasks
    };
  }

  private async extractAgentBeliefs(agentId: number): Promise<string[]> {
    // In a real system, this would extract learned patterns from agent history
    // For now, we'll return basic beliefs based on agent type
    const agent = await this.storage.getAgent(agentId);
    if (!agent) return [];

    const agentPrompt = AGENT_PROMPTS[agent.type];
    return agentPrompt.responsibilities.map(resp => 
      `I am responsible for: ${resp}`
    );
  }

  private async simulatePlannerDecision(
    agent: Agent, 
    memoryState: AgentMemoryState, 
    plannerPrompt: string
  ): Promise<PlannerAction[]> {
    // Simulate AI decision making for planning
    const activeTasks = memoryState.tasks.filter(task => 
      task.status === 'in_progress' || task.status === 'pending'
    );
    
    const actions: PlannerAction[] = [];
    
    // For each active task, decide what to do
    for (const task of activeTasks.slice(0, 3)) { // Limit to 3 tasks for performance
      const action = this.determineTaskAction(agent, task, memoryState);
      actions.push(action);
    }
    
    // If no active tasks, look for new work
    if (actions.length === 0) {
      const pendingTasks = await this.storage.getTasksByStatus('pending');
      const availableTask = pendingTasks.find(task => !task.assignedToId);
      
      if (availableTask) {
        actions.push({
          taskId: availableTask.id.toString(),
          action: 'work',
          details: `Start working on: ${availableTask.title}`
        });
      }
    }
    
    return actions;
  }

  private determineTaskAction(agent: Agent, task: Task, memoryState: AgentMemoryState): PlannerAction {
    // Check if task needs help based on communications
    const taskComms = memoryState.inbox.filter(comm => comm.taskId === task.id);
    const hasRecentBlocker = taskComms.some(comm => 
      comm.messageType === 'escalation' || comm.message.includes('blocked')
    );
    
    if (hasRecentBlocker) {
      return {
        taskId: task.id.toString(),
        action: 'request_help',
        details: 'Task appears blocked, requesting assistance',
        targetAgent: 'engineering_lead'
      };
    }
    
    // Check if task is ready for completion
    if (task.status === 'in_progress') {
      const workDone = taskComms.filter(comm => comm.messageType === 'task_progress').length;
      if (workDone >= 2) { // Simulate completion criteria
        return {
          taskId: task.id.toString(),
          action: 'complete',
          details: 'Task appears ready for completion'
        };
      }
    }
    
    // Default to working on the task
    return {
      taskId: task.id.toString(),
      action: 'work',
      details: `Continue working on: ${task.title}`
    };
  }
}