import { IStorage } from '../storage';
import { InsertCommunication, Communication } from '@shared/schema';

export class CommunicationService {
  constructor(private storage: IStorage) {}

  async createCommunication(communicationData: InsertCommunication): Promise<Communication> {
    return await this.storage.createCommunication(communicationData);
  }

  async getCommunicationsByTask(taskId: number): Promise<Communication[]> {
    return await this.storage.getCommunicationsByTask(taskId);
  }

  async getRecentCommunications(limit: number = 50): Promise<Communication[]> {
    return await this.storage.getRecentCommunications(limit);
  }

  async getAllCommunications(): Promise<Communication[]> {
    return await this.storage.getCommunications();
  }

  async parseInterAgentMessage(message: string, fromAgentId: number): Promise<{
    targetAgent: string | null;
    action: string | null;
    task: string | null;
    instructions: string;
  }> {
    const lowerMessage = message.toLowerCase();
    
    // Parse target agent
    let targetAgent = null;
    const agentNames = ['sam', 'bailey', 'dex', 'tess', 'ollie', 'sienna', 'aria', 'nova', 'emi', 'zara'];
    for (const name of agentNames) {
      if (lowerMessage.includes(name)) {
        targetAgent = name;
        break;
      }
    }
    
    // Parse action
    let action = null;
    if (lowerMessage.includes('send to') || lowerMessage.includes('forward to')) {
      action = 'forward';
    } else if (lowerMessage.includes('assign to') || lowerMessage.includes('give to')) {
      action = 'assign';
    } else if (lowerMessage.includes('review') || lowerMessage.includes('check')) {
      action = 'review';
    } else if (lowerMessage.includes('approve')) {
      action = 'approve';
    } else if (lowerMessage.includes('test')) {
      action = 'test';
    } else if (lowerMessage.includes('deploy')) {
      action = 'deploy';
    }
    
    // Parse task reference
    let task = null;
    if (lowerMessage.includes('task')) {
      const taskMatch = message.match(/task[:\s]*([^,\.\n]+)/i);
      if (taskMatch) {
        task = taskMatch[1].trim();
      }
    }
    
    return {
      targetAgent,
      action,
      task,
      instructions: message
    };
  }

  async routeInterAgentMessage(
    message: string, 
    fromAgentId: number, 
    taskId?: number
  ): Promise<Communication[]> {
    const parsed = await this.parseInterAgentMessage(message, fromAgentId);
    const communications: Communication[] = [];
    
    if (parsed.targetAgent) {
      // Get target agent
      const agents = await this.storage.getAgents();
      const targetAgent = agents.find(a => a.name.toLowerCase().includes(parsed.targetAgent!));
      
      if (targetAgent) {
        const comm = await this.createCommunication({
          fromAgentId,
          toAgentId: targetAgent.id,
          taskId: taskId || null,
          message: parsed.instructions,
          messageType: 'inter_agent',
          metadata: {
            action: parsed.action,
            parsedInstructions: parsed,
            timestamp: new Date().toISOString()
          }
        });
        
        communications.push(comm);
      }
    }
    
    return communications;
  }
}