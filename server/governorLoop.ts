// Active governor/overseer for real-time monitoring and intervention
import { GovernorService } from './services/governorService';
import { AgentService } from './services/agentService';
import { TaskService } from './services/taskService';

import { CommunicationService } from './services/communicationService';

export class GovernorLoop {
  private interval: NodeJS.Timeout | null = null;
  private interventions: any[] = [];
  constructor(
    private governorService: GovernorService,
    private agentService: AgentService,
    private taskService: TaskService,
    private communicationService: CommunicationService
  ) {}

  start(intervalMs = 10000) {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.run(), intervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async run() {
    // Monitor agent health and load
    const agents = await this.agentService.getAllAgents();
    for (const agent of agents) {
      const health = agent.healthScore;
      if (health < 50) {
        // Escalate or reassign tasks
        const tasks = await this.taskService.getTasksForAgent(agent.id);
        for (const task of tasks) {
          // Example: reassign to another healthy agent
          const candidates = agents.filter((a: any) => a.id !== agent.id && a.healthScore > 80);
          if (candidates.length > 0) {
            await this.taskService.assignTask(task.id, candidates[0].id);
            // Log intervention
            const intervention = {
              type: 'reassignment',
              fromAgent: agent.id,
              toAgent: candidates[0].id,
              taskId: task.id,
              timestamp: new Date().toISOString(),
            };
            this.interventions.push(intervention);
            await this.communicationService.createCommunication({
              fromAgentId: null,
              toAgentId: candidates[0].id,
              taskId: task.id,
              message: `Governor reassigned task ${task.id} from agent ${agent.id} to agent ${candidates[0].id} due to low health.`,
              messageType: 'governor_intervention',
              metadata: intervention,
            });
          }
        }
      }
    }
  }

  getRecentInterventions() {
    return this.interventions.slice(-50);
  }
}

// Helper to start governor loop from main
export function startGovernorLoop(agentService: AgentService, healthService: any, taskService?: TaskService) {
  const { GovernorService } = require('./services/governorService');
  const { CommunicationService } = require('./services/communicationService');
  const governorService = new GovernorService(agentService.storage);
  const communicationService = new CommunicationService(agentService.storage);
  const loop = new GovernorLoop(governorService, agentService, taskService!, communicationService);
  loop.start(10000);
  return loop;
}
