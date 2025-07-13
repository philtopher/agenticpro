import { AgentDaemon, AgentOptions } from './AgentDaemon';
import { AgentMemoryService } from '../services/agentMemoryService';

export class TessAgentDaemon extends AgentDaemon {
  constructor(options: AgentOptions, taskService: any, memoryService: AgentMemoryService, communicationService?: any) {
    super(options, taskService, memoryService, communicationService);
  }

  async planAndAct(tasks: any[]): Promise<void> {
    // Example: Generate test cases for development tasks
    for (const task of tasks) {
      if (task.status === 'pending' && task.workflow.stage === 'development') {
        await this.taskService.createTask({
          title: 'Generate test cases',
          description: 'Tess generates test cases for development tasks.',
          assignedToId: this.options.id,
          status: 'pending',
          tags: ['testing', 'QA'],
          createdById: String(this.options.id),
          priority: 'medium',
          workflow: { stage: 'testing', history: [], nextAgent: 'product_owner' }
        });
        await this.memoryService.logEpisodic(this.options.id, 'Generated test cases for development task');
      }
    }
  }

  async collaborate(): Promise<void> {
    // Negotiate with Ollie for review handoff
    await this.negotiateWithAgent(5, 'Tests ready for review.');
  }
}
