import { Agent, Task } from "@shared/schema";
import { IStorage } from "../storage";
import { PlannerAction } from "./plannerService";

export interface DiagramData {
  agents: Agent[];
  tasks: Task[];
  plannerActions: PlannerAction[];
}

export class DiagramService {
  constructor(private storage: IStorage) {}

  async generateWorkflowDiagram(): Promise<string> {
    const agents = await this.storage.getAgents();
    const tasks = await this.storage.getTasksByStatus('in_progress');
    
    return this.generateMermaidDiagram(agents, tasks);
  }

  async generateTaskFlowDiagram(taskId: number): Promise<string> {
    const task = await this.storage.getTask(taskId);
    const communications = await this.storage.getCommunicationsByTask(taskId);
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    return this.generateTaskFlowMermaid(task, communications);
  }

  async generateAgentLoadDiagram(): Promise<string> {
    const agents = await this.storage.getAgents();
    const allTasks = await this.storage.getTasks();
    
    return this.generateAgentLoadMermaid(agents, allTasks);
  }

  private generateMermaidDiagram(agents: Agent[], tasks: Task[]): string {
    let diagram = "```mermaid\ngraph TD\n";
    
    // Add agents
    agents.forEach(agent => {
      const agentId = `Agent${agent.id}`;
      const status = agent.status === 'healthy' ? '✓' : '⚠️';
      diagram += `  ${agentId}["${agent.name} ${status}"]\n`;
    });
    
    // Add tasks and connections
    tasks.forEach(task => {
      const taskId = `Task${task.id}`;
      const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      diagram += `  ${taskId}["${task.title} ${priority}"]\n`;
      
      if (task.assignedToId) {
        diagram += `  Agent${task.assignedToId} --> ${taskId}\n`;
      }
    });
    
    diagram += "```";
    return diagram;
  }

  private generateTaskFlowMermaid(task: Task, communications: any[]): string {
    let diagram = "```mermaid\nflowchart TD\n";
    
    // Start node
    diagram += `  Start([Task Created: ${task.title}])\n`;
    
    // Add workflow stages
    const stages = ['requirements', 'analysis', 'development', 'testing', 'approval'];
    const currentStage = task.workflow?.stage || 'requirements';
    
    stages.forEach((stage, index) => {
      const stageId = `Stage${index}`;
      const isActive = stage === currentStage;
      const symbol = isActive ? '🔄' : '✓';
      diagram += `  ${stageId}[${stage.toUpperCase()} ${symbol}]\n`;
      
      if (index > 0) {
        diagram += `  Stage${index - 1} --> ${stageId}\n`;
      } else {
        diagram += `  Start --> ${stageId}\n`;
      }
    });
    
    // Add communications
    communications.forEach((comm, index) => {
      const commId = `Comm${index}`;
      diagram += `  ${commId}["${comm.messageType}: ${comm.message.substring(0, 50)}..."]\n`;
    });
    
    diagram += "```";
    return diagram;
  }

  private generateAgentLoadMermaid(agents: Agent[], allTasks: Task[]): string {
    let diagram = "```mermaid\ngantt\n";
    diagram += "  title Agent Task Load\n";
    diagram += "  dateFormat  YYYY-MM-DD\n";
    diagram += "  axisFormat  %d\n\n";
    
    agents.forEach(agent => {
      const agentTasks = allTasks.filter(task => task.assignedToId === agent.id);
      diagram += `  section ${agent.name}\n`;
      
      if (agentTasks.length === 0) {
        diagram += `  Available : 2025-01-01, 2025-01-02\n`;
      } else {
        agentTasks.forEach((task, index) => {
          const status = task.status === 'completed' ? 'done' : 
                        task.status === 'in_progress' ? 'active' : 'crit';
          diagram += `  ${task.title.substring(0, 20)} : ${status}, 2025-01-${index + 1}, 1d\n`;
        });
      }
    });
    
    diagram += "```";
    return diagram;
  }

  async generatePlannerDiagram(plannerActions: PlannerAction[]): Promise<string> {
    let diagram = "```mermaid\nflowchart LR\n";
    
    // Group actions by type
    const actionGroups = {
      work: plannerActions.filter(a => a.action === 'work'),
      complete: plannerActions.filter(a => a.action === 'complete'),
      request_help: plannerActions.filter(a => a.action === 'request_help'),
      defer: plannerActions.filter(a => a.action === 'defer')
    };
    
    // Add nodes for each action type
    Object.entries(actionGroups).forEach(([actionType, actions]) => {
      if (actions.length > 0) {
        const typeId = actionType.toUpperCase();
        diagram += `  ${typeId}[${actionType.replace('_', ' ').toUpperCase()}]\n`;
        
        actions.forEach((action, index) => {
          const actionId = `${typeId}${index}`;
          diagram += `  ${actionId}["${action.details.substring(0, 30)}..."]\n`;
          diagram += `  ${typeId} --> ${actionId}\n`;
        });
      }
    });
    
    diagram += "```";
    return diagram;
  }
}