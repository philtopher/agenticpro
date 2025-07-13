import { Agent, InsertAgent, Task, Communication } from "@shared/schema";
import { IStorage } from "../storage";
import { agentCognition, AgentDecision, TaskContext } from "./agentCognition";

export class AgentService {
  public storage: IStorage;
  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * PHASE 1: Agent Cognition - AI-powered decision making
   * This makes agents truly autonomous by giving them reasoning capabilities
   */
  async makeDecision(task: Task, agentId: number): Promise<AgentDecision> {
    try {
      const agent = await this.storage.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Gather context for decision making
      const context = await this.buildTaskContext(task, agent);
      
      // Use AI cognition to make decision
      const decision = await agentCognition.think(context);
      
      // Store decision for learning
      await this.storage.addAgentMemory({
        agentId,
        memory: `Decision made for task ${task.id}: ${decision.action} - ${decision.reasoning}`,
        metadata: {
          type: 'decision',
          taskId: task.id,
          action: decision.action,
          priority: decision.priority,
          estimatedEffort: decision.estimatedEffort
        },
        createdAt: new Date()
      });

      return decision;
    } catch (error) {
      console.error('Error in agent decision making:', error);
      // Fallback decision
      return {
        action: 'complete_task',
        reasoning: 'Proceeding with standard task completion',
        priority: 'medium',
        estimatedEffort: task.estimatedHours || 2,
        requiredResources: [],
        nextSteps: ['Begin task execution'],
        artifactsToCreate: [],
        blockers: []
      };
    }
  }

  async planTaskExecution(task: Task, agentId: number, decision: AgentDecision): Promise<string[]> {
    try {
      const agent = await this.storage.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const context = await this.buildTaskContext(task, agent);
      const actionPlan = await agentCognition.planActions(context, decision);
      
      // Store action plan for tracking
      await this.storage.addAgentMemory({
        agentId,
        memory: `Action plan for task ${task.id}: ${actionPlan.join(', ')}`,
        metadata: {
          type: 'action_plan',
          taskId: task.id,
          steps: actionPlan,
          estimatedEffort: decision.estimatedEffort
        },
        createdAt: new Date()
      });

      return actionPlan;
    } catch (error) {
      console.error('Error in task planning:', error);
      return decision.nextSteps;
    }
  }

  async generateCommunication(task: Task, agentId: number, targetAgent: string, purpose: string): Promise<string> {
    try {
      const agent = await this.storage.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const context = await this.buildTaskContext(task, agent);
      return await agentCognition.generateCommunication(context, targetAgent, purpose);
    } catch (error) {
      console.error('Error in communication generation:', error);
      return `Hello ${targetAgent}, I need assistance with: ${task.title}. ${purpose}`;
    }
  }

  private async buildTaskContext(task: Task, agent: Agent): Promise<TaskContext> {
    try {
      // Get related tasks
      const allTasks = await this.storage.getTasks({});
      const relatedTasks = allTasks.filter(t => 
        t.id !== task.id && 
        (t.projectId === task.projectId || 
         t.tags?.some(tag => task.tags?.includes(tag)))
      ).slice(0, 5);

      // Get recent communications
      const recentCommunications = await this.storage.getRecentCommunications(10);
      
      // Get available agents
      const availableAgents = await this.storage.getAgents();
      const activeAgents = availableAgents.filter(a => a.status !== 'inactive');
      
      // Get agent's current workload
      const agentTasks = await this.storage.getTasksByAgent(agent.id);
      const workload = agentTasks.filter(t => t.status === 'in_progress').length;
      
      // Get past experiences
      const pastExperiences = await this.storage.getAgentMemory(agent.id);
      
      return {
        task,
        agent,
        relatedTasks,
        recentCommunications,
        availableAgents: activeAgents,
        workload,
        pastExperiences: pastExperiences.slice(0, 10)
      };
    } catch (error) {
      console.error('Error building task context:', error);
      return {
        task,
        agent,
        relatedTasks: [],
        recentCommunications: [],
        availableAgents: [],
        workload: 0,
        pastExperiences: []
      };
    }
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
