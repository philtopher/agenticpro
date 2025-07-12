import { IStorage, Agent, InsertAgent } from "@shared/schema";

export class AgentService {
  constructor(private storage: IStorage) {}

  async initializeAgents(): Promise<void> {
    const existingAgents = await this.storage.getAgents();
    
    if (existingAgents.length === 0) {
      // Initialize default agents
      const defaultAgents: InsertAgent[] = [
        {
          type: "product_manager",
          name: "Product Manager",
          capabilities: {
            skills: ["requirements_clarification", "scope_management", "acceptance_criteria"],
            maxConcurrentTasks: 5,
            avgResponseTime: 300 // 5 minutes
          },
          status: "active",
          maxLoad: 5
        },
        {
          type: "business_analyst",
          name: "Business Analyst",
          capabilities: {
            skills: ["user_story_creation", "workflow_analysis", "documentation"],
            maxConcurrentTasks: 8,
            avgResponseTime: 450 // 7.5 minutes
          },
          status: "active",
          maxLoad: 8
        },
        {
          type: "developer",
          name: "Developer",
          capabilities: {
            skills: ["coding", "architecture", "code_review", "testing"],
            maxConcurrentTasks: 3,
            avgResponseTime: 1800 // 30 minutes
          },
          status: "active",
          maxLoad: 3
        },
        {
          type: "qa_engineer",
          name: "QA Engineer",
          capabilities: {
            skills: ["test_case_creation", "test_execution", "bug_reporting"],
            maxConcurrentTasks: 6,
            avgResponseTime: 600 // 10 minutes
          },
          status: "active",
          maxLoad: 6
        },
        {
          type: "product_owner",
          name: "Product Owner",
          capabilities: {
            skills: ["final_approval", "requirement_validation", "priority_setting"],
            maxConcurrentTasks: 4,
            avgResponseTime: 900 // 15 minutes
          },
          status: "active",
          maxLoad: 4
        },
        {
          type: "engineering_lead",
          name: "Engineering Lead",
          capabilities: {
            skills: ["technical_leadership", "escalation_handling", "resource_management"],
            maxConcurrentTasks: 5,
            avgResponseTime: 600 // 10 minutes
          },
          status: "active",
          maxLoad: 5
        }
      ];

      for (const agent of defaultAgents) {
        await this.storage.createAgent(agent);
      }
    }
  }

  async getSystemMetrics(): Promise<any> {
    const agents = await this.storage.getAgents();
    const tasks = await this.storage.getTasks();
    const artifacts = await this.storage.getArtifacts();
    const healthEvents = await this.storage.getUnresolvedHealthEvents();

    const activeTasks = tasks.filter(t => t.status === "in_progress").length;
    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const escalatedIssues = healthEvents.filter(e => e.severity === "high" || e.severity === "critical").length;

    return {
      activeTasks,
      completedTasks,
      escalatedIssues,
      artifacts: artifacts.length,
      agentStatus: agents.map(a => ({
        id: a.id,
        type: a.type,
        name: a.name,
        status: a.status,
        healthScore: a.healthScore,
        currentLoad: a.currentLoad,
        maxLoad: a.maxLoad
      }))
    };
  }

  async updateAgentLoad(agentId: number, loadChange: number): Promise<void> {
    const agent = await this.storage.getAgent(agentId);
    if (!agent) return;

    const newLoad = Math.max(0, agent.currentLoad + loadChange);
    const newStatus = newLoad >= agent.maxLoad ? "busy" : "active";

    await this.storage.updateAgent(agentId, {
      currentLoad: newLoad,
      status: newStatus
    });
  }

  async escalateToEngineeringLead(taskId: number, reason: string): Promise<void> {
    const engineeringLead = await this.storage.getAgentByType("engineering_lead");
    if (!engineeringLead) return;

    await this.storage.assignTask(taskId, engineeringLead.id);
    await this.storage.updateTask(taskId, {
      status: "escalated",
      workflow: { escalated: true, reason }
    });
  }
}
