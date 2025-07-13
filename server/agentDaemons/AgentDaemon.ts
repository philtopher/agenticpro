  // Negotiation/communication protocol stub
  async negotiateWithAgent(targetAgentId: number, message: string, type: string = 'negotiate') {
    if (this.communicationService && typeof this.communicationService.sendMessage === 'function') {
      await this.communicationService.sendMessage({
        from: this.options.id,
        to: targetAgentId,
        type,
        content: message
      });
    }
  }
// Abstract base class for agent daemons with autonomous reasoning, memory, and collaboration
import { AgentMemoryService } from '../services/agentMemoryService';

export interface AgentOptions {
  id: number;
  name: string;
  role: string;
  intervalMs: number;
}

export abstract class AgentDaemon {
  protected options: AgentOptions;
  protected taskService: any;
  protected memoryService: AgentMemoryService;
  protected communicationService?: any;
  protected running: boolean = false;
  protected intervalHandle: any;

  constructor(
    options: AgentOptions,
    taskService: any,
    memoryService: AgentMemoryService,
    communicationService?: any
  ) {
    this.options = options;
    this.taskService = taskService;
    this.memoryService = memoryService;
    this.communicationService = communicationService;
  }

  // Main loop: agent thinks, plans, acts, and collaborates
  async thinkAndAct() {
    // 1. Reflect on memory and update strategy
    await this.memoryService.reflect(this.options.id);
    // 2. Perceive environment (tasks, messages)
    const tasks = await this.taskService.getTasksForAgent(this.options.id);
    // 3. Plan: decide what to do next (implement in subclass)
    await this.planAndAct(tasks);
    // 4. Collaborate: communicate with other agents if needed (implement in subclass)
    await this.collaborate();
  }

  
  // Negotiation/communication protocol stub
  async negotiateWithAgent(targetAgentId: number, message: string, type: string = 'negotiate') {
    if (this.communicationService && typeof this.communicationService.sendMessage === 'function') {
      await this.communicationService.sendMessage({
        from: this.options.id,
        to: targetAgentId,
        type,
        content: message
      });
    }
  // To be implemented by concrete agent classes
  abstract planAndAct(tasks: any[]): Promise<void>;
  abstract collaborate(): Promise<void>;

  start() {
    if (this.running) return;
    this.running = true;
    this.intervalHandle = setInterval(() => {
      this.thinkAndAct().catch(console.error);
    }, this.options.intervalMs);
  }

  stop() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    this.running = false;
  }
}
