import { Agent, InsertAgent } from "@shared/schema";
import { IStorage } from "../storage";

export class AgentService {
  public storage: IStorage;
  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async initializeAgents(): Promise<void> {
    const existingAgents = await this.storage.getAgents();
    
    if (existingAgents.length === 0) {
      // Initialize default agents
      const defaultAgents: InsertAgent[] = [
        {
          type: "product_manager",
          name: "Sam",
          capabilities: {
            skills: ["requirements_clarification", "scope_management", "acceptance_criteria", "epics", "features"],
            maxConcurrentTasks: 5,
            avgResponseTime: 300 // 5 minutes
          },
          status: "active",
          maxLoad: 5
        },
        {
          type: "business_analyst",
          name: "Bailey",
          capabilities: {
            skills: ["user_story_creation", "workflow_analysis", "documentation", "acceptance_criteria", "bpmn"],
            maxConcurrentTasks: 8,
            avgResponseTime: 450 // 7.5 minutes
          },
          status: "active",
          maxLoad: 8
        },
        {
          type: "developer",
          name: "Dex",
          capabilities: {
            skills: ["coding", "architecture", "code_review", "testing", "scaffolding"],
            maxConcurrentTasks: 3,
            avgResponseTime: 1800 // 30 minutes
          },
          status: "active",
          maxLoad: 3
        },
        {
          type: "qa_engineer",
          name: "Tess",
          capabilities: {
            skills: ["test_case_creation", "test_execution", "bug_reporting", "quality_assurance"],
            maxConcurrentTasks: 6,
            avgResponseTime: 600 // 10 minutes
          },
          status: "active",
          maxLoad: 6
        },
        {
          type: "product_owner",
          name: "Ollie",
          capabilities: {
            skills: ["final_approval", "requirement_validation", "priority_setting", "stakeholder_communication"],
            maxConcurrentTasks: 4,
            avgResponseTime: 900 // 15 minutes
          },
          status: "active",
          maxLoad: 4
        },
        {
          type: "solution_designer",
          name: "Sienna",
          capabilities: {
            skills: ["ui_ux_design", "wireframes", "mockups", "system_design", "dfd"],
            maxConcurrentTasks: 5,
            avgResponseTime: 720 // 12 minutes
          },
          status: "active",
          maxLoad: 5
        },
        {
          type: "solutions_architect",
          name: "Aria",
          capabilities: {
            skills: ["architecture_design", "data_modeling", "integration_patterns", "technical_blueprints"],
            maxConcurrentTasks: 3,
            avgResponseTime: 1200 // 20 minutes
          },
          status: "active",
          maxLoad: 3
        },
        {
          type: "devops_engineer",
          name: "Nova",
          capabilities: {
            skills: ["infrastructure", "cicd", "deployment", "monitoring", "iac_templates"],
            maxConcurrentTasks: 4,
            avgResponseTime: 900 // 15 minutes
          },
          status: "active",
          maxLoad: 4
        },
        {
          type: "engineering_manager",
          name: "Emi",
          capabilities: {
            skills: ["technical_leadership", "team_coordination", "resource_management", "mentoring"],
            maxConcurrentTasks: 5,
            avgResponseTime: 600 // 10 minutes
          },
          status: "active",
          maxLoad: 5
        },
        {
          type: "admin_governor",
          name: "Zara",
          capabilities: {
            skills: ["platform_governance", "agent_oversight", "admin_controls", "priority_management"],
            maxConcurrentTasks: 10,
            avgResponseTime: 180 // 3 minutes
          },
          status: "active",
          maxLoad: 10
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

  async getAllAgents() {
    return this.storage.getAgents();
  }

  async findAgentByType(type: string) {
    const agents = await this.getAllAgents();
    return agents.find((a: any) => a.type === type && a.status === 'active');
  }
}
