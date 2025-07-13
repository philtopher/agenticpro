// Event-driven workflow engine for automatic task progression and handoff
import { TaskService } from './services/taskService';
import { AgentService } from './services/agentService';

import { EventEmitter } from 'events';

export class WorkflowEngine extends EventEmitter {
  private interval: NodeJS.Timeout | null = null;
  constructor(private taskService: TaskService, private agentService: AgentService) {
    super();
  }

  async processTask(task: any) {
    // Example: move task to next stage and assign to next agent
    if (task.workflow && task.workflow.nextAgent) {
      const nextAgent = await this.agentService.findAgentByType(task.workflow.nextAgent);
      if (nextAgent) {
        await this.taskService.assignTask(task.id, nextAgent.id);
        await this.taskService.updateTask(task.id, {
          status: 'in_progress',
          workflow: {
            ...task.workflow,
            stage: task.workflow.nextAgent,
            history: [...(task.workflow.history || []), { agent: nextAgent.name, stage: task.workflow.nextAgent, timestamp: new Date() }],
            // Compute nextAgent for next stage if needed
          },
        });
        this.emit('taskProgressed', { taskId: task.id, agentId: nextAgent.id });
      }
    }
  }

  async run() {
    // Poll for tasks ready to progress
    const tasks = await this.taskService.getTasks();
    for (const task of tasks) {
      if (task.status === 'pending' || task.status === 'in_progress') {
        await this.processTask(task);
      }
    }
  }

  start(intervalMs = 10000) {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.run(), intervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}

// Helper to start workflow engine from main
export function startWorkflowEngine(taskService: TaskService, agentService: AgentService) {
  const engine = new WorkflowEngine(taskService, agentService);
  engine.start(10000); // 10s interval
  return engine;
}
