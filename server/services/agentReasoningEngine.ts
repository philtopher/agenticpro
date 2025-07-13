import { AgentMemoryService } from './agentMemoryService';
import * as storage from '../storage';

interface Agent {
  id: number;
  name: string;
  role: string;
  status: string;
  currentTask?: any;
  personality?: any;
}

interface Goal {
  id: string;
  agentId: number;
  title: string;
  description: string;
  priority: number; // 1-10
  status: 'active' | 'completed' | 'paused' | 'failed';
  subGoals: string[];
  deadline?: string;
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

interface Plan {
  id: string;
  agentId: number;
  goalId: string;
  steps: PlanStep[];
  status: 'draft' | 'active' | 'completed' | 'failed';
  estimatedDuration: number; // minutes
  dependencies: string[];
  resources: string[];
  createdAt: string;
}

interface PlanStep {
  id: string;
  description: string;
  action: string;
  parameters: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimatedDuration: number;
  dependencies: string[];
}

interface ReasoningContext {
  agent: Agent;
  currentGoals: Goal[];
  activePlans: Plan[];
  recentMemory: any[];
  systemState: any;
  environmentState: any;
}

export class AgentReasoningEngine {
  private memoryService: AgentMemoryService;
  private storage: any;
  private activeGoals: Map<number, Goal[]> = new Map();
  private activePlans: Map<number, Plan[]> = new Map();

  constructor(memoryService: AgentMemoryService, storage: any) {
    this.memoryService = memoryService;
    this.storage = storage;
  }

  async think(agentId: number): Promise<void> {
    try {
      const agent = await this.storage.getAgent(agentId);
      if (!agent) return;

      // Log thinking process
      await this.memoryService.logAgentMemory(agentId, {
        type: 'thought',
        content: `Starting reasoning cycle for ${agent.name}`,
        timestamp: new Date().toISOString()
      });

      const context = await this.buildReasoningContext(agent);
      
      // Core reasoning loop
      await this.assessSituation(context);
      await this.updateGoals(context);
      await this.planActions(context);
      await this.executeNextAction(context);
      await this.reflect(context);

    } catch (error) {
      console.error(`Error in reasoning for agent ${agentId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.memoryService.logAgentMemory(agentId, {
        type: 'event',
        content: `Reasoning error: ${errorMessage}`,
        details: { error: errorMessage },
        timestamp: new Date().toISOString()
      });
    }
  }

  private async buildReasoningContext(agent: Agent): Promise<ReasoningContext> {
    const recentMemory = await this.memoryService.getAgentMemory(agent.id, {
      limit: 20,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
    });

    const currentGoals = this.activeGoals.get(agent.id) || [];
    const activePlans = this.activePlans.get(agent.id) || [];

    const systemState = {
      allTasks: await this.storage.getTasks(),
      allAgents: await this.storage.getAgents(),
      recentCommunications: await this.storage.getRecentCommunications(10)
    };

    return {
      agent,
      currentGoals,
      activePlans,
      recentMemory,
      systemState,
      environmentState: await this.getEnvironmentState()
    };
  }

  private async assessSituation(context: ReasoningContext): Promise<void> {
    const { agent, recentMemory, systemState } = context;

    // Analyze current situation
    const myTasks = systemState.allTasks.filter((t: any) => t.assignedToId === agent.id);
    const urgentTasks = myTasks.filter((t: any) => t.priority === 'high' && t.status === 'pending');
    const blockedTasks = myTasks.filter((t: any) => t.status === 'blocked');

    let situationAssessment = '';
    
    if (urgentTasks.length > 0) {
      situationAssessment = `I have ${urgentTasks.length} urgent tasks that need immediate attention`;
    } else if (blockedTasks.length > 0) {
      situationAssessment = `I have ${blockedTasks.length} blocked tasks that need resolution`;
    } else if (myTasks.length === 0) {
      situationAssessment = 'I am currently free and can take on new work or help others';
    } else {
      situationAssessment = `I have ${myTasks.length} tasks in progress, working steadily`;
    }

    await this.memoryService.logAgentMemory(agent.id, {
      type: 'thought',
      content: `Situation assessment: ${situationAssessment}`,
      details: { urgentTasks: urgentTasks.length, blockedTasks: blockedTasks.length, totalTasks: myTasks.length },
      timestamp: new Date().toISOString()
    });
  }

  private async updateGoals(context: ReasoningContext): Promise<void> {
    const { agent, currentGoals, systemState } = context;

    // Check if we need new goals
    const activeGoals = currentGoals.filter(g => g.status === 'active');
    
    if (activeGoals.length === 0) {
      // Generate new goal
      const newGoal = await this.generateGoal(context);
      if (newGoal) {
        await this.addGoal(agent.id, newGoal);
      }
    }

    // Update existing goals
    for (const goal of activeGoals) {
      await this.updateGoalProgress(goal, context);
    }
  }

  private async planActions(context: ReasoningContext): Promise<void> {
    const { agent, currentGoals } = context;

    for (const goal of currentGoals.filter(g => g.status === 'active')) {
      const existingPlans = this.activePlans.get(agent.id)?.filter(p => p.goalId === goal.id) || [];
      
      if (existingPlans.length === 0) {
        // Create new plan for goal
        const plan = await this.createPlan(goal, context);
        if (plan) {
          await this.addPlan(agent.id, plan);
        }
      }
    }
  }

  private async executeNextAction(context: ReasoningContext): Promise<void> {
    const { agent } = context;
    const plans = this.activePlans.get(agent.id) || [];
    
    for (const plan of plans.filter(p => p.status === 'active')) {
      const nextStep = plan.steps.find(s => s.status === 'pending');
      if (nextStep) {
        await this.executeStep(nextStep, context);
        break; // Execute one step at a time
      }
    }
  }

  private async reflect(context: ReasoningContext): Promise<void> {
    const { agent } = context;
    
    // Trigger memory reflection periodically
    const lastReflection = await this.memoryService.getAgentMemory(agent.id, {
      type: 'reflection',
      limit: 1
    });

    const shouldReflect = !lastReflection.length || 
      (Date.now() - new Date(lastReflection[0].timestamp).getTime()) > 60 * 60 * 1000; // 1 hour

    if (shouldReflect) {
      await this.memoryService.reflectOnMemory(agent.id);
    }
  }

  private async generateGoal(context: ReasoningContext): Promise<Goal | null> {
    const { agent, systemState } = context;
    
    // Analyze system needs and agent capabilities
    const allTasks = systemState.allTasks;
    const unassignedTasks = allTasks.filter((t: any) => !t.assignedToId && t.status === 'pending');
    const myExpertise = agent.personality?.expertise || [];

    let goalTitle = '';
    let goalDescription = '';
    let priority = 5;

    if (unassignedTasks.length > 0) {
      // Find tasks matching expertise
      const suitableTasks = unassignedTasks.filter((t: any) => 
        t.tags?.some((tag: string) => myExpertise.includes(tag))
      );

      if (suitableTasks.length > 0) {
        const task = suitableTasks[0];
        goalTitle = `Complete task: ${task.title}`;
        goalDescription = `Take ownership and complete the task: ${task.description}`;
        priority = task.priority === 'high' ? 9 : task.priority === 'medium' ? 6 : 3;
      }
    }

    if (!goalTitle) {
      // Generate improvement goal
      goalTitle = 'Continuous improvement';
      goalDescription = 'Look for ways to improve processes and help the team';
      priority = 4;
    }

    const goal: Goal = {
      id: `goal_${agent.id}_${Date.now()}`,
      agentId: agent.id,
      title: goalTitle,
      description: goalDescription,
      priority,
      status: 'active',
      subGoals: [],
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.memoryService.logAgentMemory(agent.id, {
      type: 'goal',
      content: `New goal set: ${goalTitle}`,
      details: goal,
      timestamp: new Date().toISOString()
    });

    return goal;
  }

  private async createPlan(goal: Goal, context: ReasoningContext): Promise<Plan | null> {
    const { agent } = context;
    
    const steps: PlanStep[] = [];

    // Generate plan steps based on goal type
    if (goal.title.includes('Complete task:')) {
      steps.push({
        id: `step_${Date.now()}_1`,
        description: 'Analyze task requirements',
        action: 'analyze_task',
        parameters: { goalId: goal.id },
        status: 'pending',
        estimatedDuration: 15,
        dependencies: []
      });
      
      steps.push({
        id: `step_${Date.now()}_2`,
        description: 'Execute task work',
        action: 'execute_task',
        parameters: { goalId: goal.id },
        status: 'pending',
        estimatedDuration: 60,
        dependencies: [steps[0].id]
      });

      steps.push({
        id: `step_${Date.now()}_3`,
        description: 'Review and finalize',
        action: 'finalize_task',
        parameters: { goalId: goal.id },
        status: 'pending',
        estimatedDuration: 15,
        dependencies: [steps[1].id]
      });
    } else {
      // Generic improvement plan
      steps.push({
        id: `step_${Date.now()}_1`,
        description: 'Identify improvement opportunities',
        action: 'identify_improvements',
        parameters: { goalId: goal.id },
        status: 'pending',
        estimatedDuration: 30,
        dependencies: []
      });
    }

    const plan: Plan = {
      id: `plan_${agent.id}_${Date.now()}`,
      agentId: agent.id,
      goalId: goal.id,
      steps,
      status: 'active',
      estimatedDuration: steps.reduce((total, step) => total + step.estimatedDuration, 0),
      dependencies: [],
      resources: [],
      createdAt: new Date().toISOString()
    };

    await this.memoryService.logAgentMemory(agent.id, {
      type: 'plan',
      content: `Created plan for goal: ${goal.title}`,
      details: plan,
      timestamp: new Date().toISOString()
    });

    return plan;
  }

  private async executeStep(step: PlanStep, context: ReasoningContext): Promise<void> {
    const { agent } = context;
    
    step.status = 'in_progress';
    
    await this.memoryService.logAgentMemory(agent.id, {
      type: 'action',
      content: `Executing step: ${step.description}`,
      details: { stepId: step.id, action: step.action },
      timestamp: new Date().toISOString()
    });

    try {
      // Execute the action based on step type
      switch (step.action) {
        case 'analyze_task':
          await this.analyzeTask(step, context);
          break;
        case 'execute_task':
          await this.executeTask(step, context);
          break;
        case 'finalize_task':
          await this.finalizeTask(step, context);
          break;
        case 'identify_improvements':
          await this.identifyImprovements(step, context);
          break;
        default:
          console.log(`Unknown action: ${step.action}`);
      }

      step.status = 'completed';
      
      await this.memoryService.logAgentMemory(agent.id, {
        type: 'action',
        content: `Completed step: ${step.description}`,
        details: { stepId: step.id, success: true },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      step.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.memoryService.logAgentMemory(agent.id, {
        type: 'action',
        content: `Failed step: ${step.description} - ${errorMessage}`,
        details: { stepId: step.id, error: errorMessage },
        timestamp: new Date().toISOString()
      });
    }
  }

  private async analyzeTask(step: PlanStep, context: ReasoningContext): Promise<void> {
    // Placeholder for task analysis logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
  }

  private async executeTask(step: PlanStep, context: ReasoningContext): Promise<void> {
    // Placeholder for task execution logic
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
  }

  private async finalizeTask(step: PlanStep, context: ReasoningContext): Promise<void> {
    // Placeholder for task finalization logic
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
  }

  private async identifyImprovements(step: PlanStep, context: ReasoningContext): Promise<void> {
    // Placeholder for improvement identification logic
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate work
  }

  private async addGoal(agentId: number, goal: Goal): Promise<void> {
    if (!this.activeGoals.has(agentId)) {
      this.activeGoals.set(agentId, []);
    }
    this.activeGoals.get(agentId)!.push(goal);
  }

  private async addPlan(agentId: number, plan: Plan): Promise<void> {
    if (!this.activePlans.has(agentId)) {
      this.activePlans.set(agentId, []);
    }
    this.activePlans.get(agentId)!.push(plan);
  }

  private async updateGoalProgress(goal: Goal, context: ReasoningContext): Promise<void> {
    const plans = this.activePlans.get(goal.agentId)?.filter(p => p.goalId === goal.id) || [];
    
    if (plans.length > 0) {
      const totalSteps = plans.reduce((total, plan) => total + plan.steps.length, 0);
      const completedSteps = plans.reduce((total, plan) => 
        total + plan.steps.filter(s => s.status === 'completed').length, 0);
      
      goal.progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      goal.updatedAt = new Date().toISOString();

      if (goal.progress >= 100) {
        goal.status = 'completed';
        await this.memoryService.logAgentMemory(goal.agentId, {
          type: 'event',
          content: `Goal completed: ${goal.title}`,
          details: goal,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private async getEnvironmentState(): Promise<any> {
    return {
      timestamp: new Date().toISOString(),
      systemLoad: Math.random(), // Placeholder
      activeConnections: Math.floor(Math.random() * 10)
    };
  }

  // Public methods for external access
  async getAgentGoals(agentId: number): Promise<Goal[]> {
    return this.activeGoals.get(agentId) || [];
  }

  async getAgentPlans(agentId: number): Promise<Plan[]> {
    return this.activePlans.get(agentId) || [];
  }
}
