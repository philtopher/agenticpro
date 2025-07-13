import { IStorage } from "../storage";
import { Task, InsertTask, Agent, Communication } from "@shared/schema";
import { AgentAI } from "./agentAI";
import { CommunicationService } from "./communicationService";
import { WebSocketServer } from "ws";

export class TaskService {
  private communicationService: CommunicationService;
  private agentAI: AgentAI;
  private wss: WebSocketServer | null = null;

  constructor(private storage: IStorage) {
    this.communicationService = new CommunicationService(storage);
    this.agentAI = new AgentAI(storage);
  }

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const task = await this.storage.createTask(taskData);
    
    // Automatically start task processing if assigned to an agent
    if (task.assignedToId) {
      // Use setTimeout to avoid blocking the response
      setTimeout(() => {
        this.startAutomaticTaskProcessing(task.id);
      }, 1000);
    }
    
    return task;
  }

  async startAutomaticTaskProcessing(taskId: number): Promise<void> {
    try {
      const task = await this.storage.getTask(taskId);
      if (!task || !task.assignedToId) {
        return;
      }

      const agent = await this.storage.getAgent(task.assignedToId);
      if (!agent) {
        return;
      }

      // Update agent status to busy
      await this.storage.updateAgentStatus(agent.id, 'busy');

      // Process the task with AI
      const result = await this.agentAI.processTask(agent, task);
      
      // Create communication record
      const communication = await this.communicationService.createCommunication({
        fromAgentId: agent.id,
        toAgentId: null,
        taskId: task.id,
        message: result.response,
        messageType: 'task_response',
        metadata: {
          artifacts: result.artifacts,
          nextAgent: result.nextAgent,
          timestamp: new Date().toISOString()
        }
      });

      // Update task with progress
      await this.storage.updateTask(task.id, {
        workflow: {
          ...task.workflow,
          history: [...(task.workflow?.history || []), {
            agent: agent.name,
            action: 'processed',
            timestamp: new Date().toISOString(),
            response: result.response
          }]
        }
      });

      // Parse and execute complex instructions
      await this.parseAndExecuteInstructions(task, agent, result.response);

      // Broadcast updates via WebSocket
      this.broadcastUpdate('task_processed', { task, agent, communication });

      // If there's a next agent, continue the workflow
      if (result.nextAgent) {
        await this.handoffToNextAgent(task, result.nextAgent);
      }

      // Update agent status back to active
      await this.storage.updateAgentStatus(agent.id, 'active');

    } catch (error) {
      console.error(`Error processing task ${taskId}:`, error);
      
      // Update agent status back to active on error
      const task = await this.storage.getTask(taskId);
      if (task?.assignedToId) {
        await this.storage.updateAgentStatus(task.assignedToId, 'active');
      }
    }
  }

  private async parseAndExecuteInstructions(task: Task, agent: Agent, response: string): Promise<void> {
    const instructions = task.description.toLowerCase();
    
    // Check for multi-step instructions
    if (instructions.includes('when finished send') || instructions.includes('tell') || instructions.includes('send to')) {
      // Extract target agents and actions
      const targetAgents = this.extractTargetAgents(instructions);
      
      for (const targetAgent of targetAgents) {
        const targetAgentData = await this.storage.getAgentByType(targetAgent);
        if (targetAgentData) {
          // Create communication to target agent
          await this.communicationService.createCommunication({
            fromAgentId: agent.id,
            toAgentId: targetAgentData.id,
            taskId: task.id,
            message: `Task completion notification: ${response}`,
            messageType: 'agent_handoff',
            metadata: {
              originalTask: task.title,
              instruction: 'forwarded_completion',
              timestamp: new Date().toISOString()
            }
          });

          // If instruction includes "tell [agent] to send to [another agent]"
          if (instructions.includes('tell') && instructions.includes('send the completed task to')) {
            const finalAgent = this.extractFinalAgent(instructions);
            if (finalAgent) {
              const finalAgentData = await this.storage.getAgentByType(finalAgent);
              if (finalAgentData) {
                // Create a follow-up communication
                setTimeout(async () => {
                  await this.communicationService.createCommunication({
                    fromAgentId: targetAgentData.id,
                    toAgentId: finalAgentData.id,
                    taskId: task.id,
                    message: `Forwarding completed task: ${task.title}`,
                    messageType: 'task_forward',
                    metadata: {
                      originalResponse: response,
                      forwardedBy: targetAgentData.name,
                      timestamp: new Date().toISOString()
                    }
                  });
                }, 2000);
              }
            }
          }
        }
      }

      // Check for "get back to me" instructions
      if (instructions.includes('get back to me') || instructions.includes('send me a message')) {
        setTimeout(async () => {
          await this.communicationService.createCommunication({
            fromAgentId: agent.id,
            toAgentId: null,
            taskId: task.id,
            message: `Task "${task.title}" has been completed and forwarded as requested. All instructions have been executed.`,
            messageType: 'user_notification',
            metadata: {
              completionStatus: 'full_workflow_complete',
              timestamp: new Date().toISOString()
            }
          });
        }, 4000);
      }
    }
  }

  private extractTargetAgents(instructions: string): string[] {
    const agents = [];
    
    if (instructions.includes('product owner')) {
      agents.push('product_owner');
    }
    if (instructions.includes('product manager')) {
      agents.push('product_manager');
    }
    if (instructions.includes('business analyst')) {
      agents.push('business_analyst');
    }
    if (instructions.includes('developer')) {
      agents.push('developer');
    }
    if (instructions.includes('qa engineer') || instructions.includes('tester')) {
      agents.push('qa_engineer');
    }
    if (instructions.includes('engineering lead')) {
      agents.push('engineering_lead');
    }
    
    return agents;
  }

  private extractFinalAgent(instructions: string): string | null {
    const match = instructions.match(/send the completed task to (.+?)(?:\.|$)/);
    if (match) {
      const agentName = match[1].trim().toLowerCase();
      if (agentName.includes('product manager')) return 'product_manager';
      if (agentName.includes('product owner')) return 'product_owner';
      if (agentName.includes('business analyst')) return 'business_analyst';
      if (agentName.includes('developer')) return 'developer';
      if (agentName.includes('qa engineer')) return 'qa_engineer';
      if (agentName.includes('engineering lead')) return 'engineering_lead';
    }
    return null;
  }

  private async handoffToNextAgent(task: Task, nextAgentType: string): Promise<void> {
    const nextAgent = await this.storage.getAgentByType(nextAgentType);
    if (nextAgent) {
      await this.storage.assignTask(task.id, nextAgent.id);
      
      // Start processing with the next agent
      setTimeout(() => {
        this.startAutomaticTaskProcessing(task.id);
      }, 1000);
    }
  }

  private broadcastUpdate(type: string, data: any): void {
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({ type, data }));
        }
      });
    }
  }

  async pauseAgent(agentId: number): Promise<void> {
    await this.storage.updateAgentStatus(agentId, 'paused');
  }

  async resumeAgent(agentId: number): Promise<void> {
    await this.storage.updateAgentStatus(agentId, 'active');
  }

  async getTaskCommunications(taskId: number): Promise<Communication[]> {
    return await this.storage.getCommunicationsByTask(taskId);
  }

  async updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
    return await this.storage.updateTask(taskId, updates);
  }

  async assignTask(taskId: number, agentId: number): Promise<void> {
    await this.storage.assignTask(taskId, agentId);
    
    // Automatically start processing the newly assigned task
    setTimeout(() => {
      this.startAutomaticTaskProcessing(taskId);
    }, 1000);
  }

  async getTasksForAgent(agentId: number) {
    return this.storage.getTasks({ assignedToId: agentId });
  }

  async getTasks() {
    return this.storage.getTasks({});
  }
}