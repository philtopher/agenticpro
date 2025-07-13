// Agent background loop for independent reasoning and planning
import { AgentService } from './services/agentService';
import { AgentMemoryService } from './services/agentMemoryService';
import { TaskService } from './services/taskService';

import { AgentAI } from './services/agentAI';
import { CommunicationService } from './services/communicationService';

export class AgentBackgroundLoop {
  private agentIntervals: Record<number, NodeJS.Timeout> = {};

  constructor(
    private agentService: AgentService,
    private memoryService: AgentMemoryService,
    private taskService: TaskService,
    private communicationService: CommunicationService,
    private agentAI: AgentAI
  ) {}

  startAllAgentsLoop(intervalMs = 10000) {
    this.stopAllAgentsLoop();
    this.agentService.getAllAgents().then(agents => {
      for (const agent of agents) {
        this.startAgentLoop(agent.id, intervalMs);
      }
    });
  }

  startAgentLoop(agentId: number, intervalMs = 10000) {
    if (this.agentIntervals[agentId]) clearInterval(this.agentIntervals[agentId]);
    this.agentIntervals[agentId] = setInterval(() => this.agentStep(agentId), intervalMs);
  }

  stopAllAgentsLoop() {
    for (const id in this.agentIntervals) {
      clearInterval(this.agentIntervals[id]);
    }
    this.agentIntervals = {};
  }

  async agentStep(agentId: number) {
    const agent = await this.agentService.storage.getAgent(agentId);
    if (!agent || agent.status !== 'active') return;

    // 1. Recall memory
    const memories = await this.memoryService.getMemory(agentId);
    // 2. Check for new tasks
    const tasks = await this.taskService.getTasksForAgent(agentId);
    // 3. Reason/plan/act
    if (tasks.length > 0) {
      // Log thought process
      await this.memoryService.addMemory(agentId, `I have ${tasks.length} tasks to process.`, { taskIds: tasks.map((t: any) => t.id) });
      // For each task, reason and act
      for (const task of tasks) {
        // Generate reasoning/plan
        const context = { memories, task };
        const reasoning = await this.agentAI.generateChatResponse(agent, `What should I do next for this task?`, context);
        await this.memoryService.addMemory(agentId, `Reasoning for task ${task.id}: ${reasoning}`, { taskId: task.id });
        // Optionally, act (e.g., update task, communicate, etc.)
        // Example: mark task as in progress if not already
        if (task.status !== 'in_progress') {
          await this.taskService.storage.updateTask(task.id, { status: 'in_progress' });
        }
        // Example: communicate progress
        await this.communicationService.createCommunication({
          fromAgentId: agentId,
          toAgentId: null,
          taskId: task.id,
          message: `Agent ${agent.name} is working on task ${task.id}: ${reasoning}`,
          messageType: 'agent_update',
          metadata: { timestamp: new Date().toISOString() },
        });
      }
    } else {
      // Idle log
      await this.memoryService.addMemory(agentId, `No tasks to process.`, {});
    }
  }
}

// Helper to start all agent loops from main
export function startAgentBackgroundLoop(agentService: AgentService, taskService: TaskService) {
  const memoryService = new AgentMemoryService();
  const communicationService = new CommunicationService(agentService.storage);
  const agentAI = new AgentAI(agentService.storage);
  const loop = new AgentBackgroundLoop(agentService, memoryService, taskService, communicationService, agentAI);
  loop.startAllAgentsLoop(10000); // 10s interval per agent
  return loop;
}
