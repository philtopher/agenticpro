import { IStorage } from '../storage';
import { Task, Agent, InsertCommunication, InsertHealthEvent } from '@shared/schema';
import { AgentAI } from './agentAI';
import { CommunicationService } from './communicationService';
import { AgentService } from './agentService';
import { AgentDecision } from './agentCognition';

export class WorkflowEngine {
  private agentAI: AgentAI;
  private communicationService: CommunicationService;
  private agentService: AgentService;
  private isRunning = false;
  private processingQueue: Set<number> = new Set();
  
  constructor(private storage: IStorage) {
    this.agentAI = new AgentAI(storage);
    this.communicationService = new CommunicationService(storage);
    this.agentService = new AgentService(storage);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Workflow Engine started - Autonomous task processing enabled');
    
    // Start continuous processing
    this.processTasksLoop();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Start task assignment automation
    this.startTaskAssignmentAutomation();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 Workflow Engine stopped');
  }

  private async processTasksLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processAllPendingTasks();
        await this.sleep(2000); // Check every 2 seconds
      } catch (error) {
        console.error('Error in task processing loop:', error);
        await this.sleep(5000); // Wait longer on error
      }
    }
  }

  private async processAllPendingTasks(): Promise<void> {
    // Get all active tasks
    const activeTasks = await this.storage.getTasksByStatus('active');
    const pendingTasks = await this.storage.getTasksByStatus('pending');
    const allTasks = [...activeTasks, ...pendingTasks];

    for (const task of allTasks) {
      if (this.processingQueue.has(task.id)) continue;
      
      // Check if task needs processing
      if (await this.shouldProcessTask(task)) {
        this.processingQueue.add(task.id);
        this.processTaskAutomatically(task).finally(() => {
          this.processingQueue.delete(task.id);
        });
      }
    }
  }

  private async shouldProcessTask(task: Task): Promise<boolean> {
    // Check if task has been updated recently
    const lastUpdated = new Date(task.updatedAt).getTime();
    const now = Date.now();
    const timeSinceUpdate = now - lastUpdated;
    
    // Process if task is new or hasn't been updated in 30 seconds
    if (timeSinceUpdate > 30000) {
      return true;
    }

    // Check if task has unprocessed communications
    const communications = await this.storage.getCommunicationsByTask(task.id);
    const recentComms = communications.filter(comm => {
      const commTime = new Date(comm.createdAt).getTime();
      return commTime > lastUpdated;
    });

    return recentComms.length > 0;
  }

  private async processTaskAutomatically(task: Task): Promise<void> {
    try {
      console.log(`🔄 Auto-processing task: ${task.title} (ID: ${task.id})`);
      
      // Get assigned agent
      const agent = task.assignedAgentId ? await this.storage.getAgent(task.assignedAgentId) : null;
      
      if (!agent) {
        // Auto-assign task to appropriate agent
        await this.autoAssignTask(task);
        return;
      }

      // Check if agent is available
      if (agent.status !== 'active') {
        console.log(`Agent ${agent.name} is not active, skipping task ${task.id}`);
        return;
      }

      // PHASE 1: AI-POWERED COGNITIVE DECISION MAKING
      console.log(`🧠 Agent ${agent.name} is analyzing task ${task.id} using AI cognition...`);
      
      // Make AI-powered decision about how to handle the task
      const decision = await this.agentService.makeDecision(task, agent.id);
      console.log(`💭 ${agent.name} decided to: ${decision.action} - ${decision.reasoning}`);
      
      // Create detailed action plan
      const actionPlan = await this.agentService.planTaskExecution(task, agent.id, decision);
      console.log(`📋 Action plan created: ${actionPlan.slice(0, 2).join(', ')}...`);
      
      // Execute the decision
      const result = await this.executeAgentDecision(agent, task, decision, actionPlan);
      
      if (result.success) {
        console.log(`✅ Task ${task.id} processed successfully by ${agent.name}`);
        
        // Update task status based on decision
        const newStatus = this.determineTaskStatus(decision, result);
        await this.storage.updateTask(task.id, {
          status: newStatus,
          updatedAt: new Date()
        });

        // Handle collaboration if needed
        if (decision.collaborationNeeded) {
          await this.handleCollaborationRequest(task, agent, decision);
        }

        // Handle escalation if needed
        if (decision.action === 'escalate') {
          await this.escalateTask(task, agent, decision.reasoning);
        }

        // Create follow-up actions based on result
        await this.handleTaskResult(task, agent, result);
      } else {
        console.log(`❌ Task ${task.id} processing failed: ${result.error}`);
        await this.handleTaskFailure(task, agent, result.error);
      }
    } catch (error) {
      console.error(`Error processing task ${task.id}:`, error);
      await this.handleTaskFailure(task, null, error.message);
    }
  }

  /**
   * PHASE 1: Execute AI-powered agent decision
   */
  private async executeAgentDecision(agent: Agent, task: Task, decision: AgentDecision, actionPlan: string[]): Promise<any> {
    try {
      // Record the decision execution
      await this.storage.createCommunication({
        fromAgentId: agent.id,
        message: `Executing decision: ${decision.action}. Reasoning: ${decision.reasoning}`,
        messageType: 'agent_decision',
        taskId: task.id,
        metadata: {
          decision,
          actionPlan,
          timestamp: new Date().toISOString()
        }
      });

      // Execute based on decision type
      switch (decision.action) {
        case 'complete_task':
          return await this.executeTaskCompletion(agent, task, decision, actionPlan);
        
        case 'request_help':
          return await this.executeHelpRequest(agent, task, decision);
        
        case 'delegate_task':
          return await this.executeDelegation(agent, task, decision);
        
        case 'gather_info':
          return await this.executeInformationGathering(agent, task, decision);
        
        case 'collaborate':
          return await this.executeCollaboration(agent, task, decision);
        
        case 'escalate':
          return await this.executeEscalation(agent, task, decision);
        
        default:
          return await this.executeTaskCompletion(agent, task, decision, actionPlan);
      }
    } catch (error) {
      console.error(`Error executing decision for task ${task.id}:`, error);
      return { success: false, error: error.message };
    }
  }

  private async executeTaskCompletion(agent: Agent, task: Task, decision: AgentDecision, actionPlan: string[]): Promise<any> {
    console.log(`🎯 ${agent.name} is executing task completion plan`);
    
    // Create artifacts based on agent type and decision
    const artifacts = await this.createTaskArtifacts(agent, task, decision);
    
    // Update task progress
    await this.storage.updateTask(task.id, {
      status: 'in_progress',
      progress: Math.min(100, (task.progress || 0) + 25),
      updatedAt: new Date()
    });

    return {
      success: true,
      artifacts,
      nextActions: actionPlan,
      shouldEscalate: decision.blockers && decision.blockers.length > 0
    };
  }

  private async executeHelpRequest(agent: Agent, task: Task, decision: AgentDecision): Promise<any> {
    console.log(`🤝 ${agent.name} is requesting help for task ${task.id}`);
    
    // Find appropriate helper agent
    const availableAgents = await this.storage.getAgents();
    const helperAgent = availableAgents.find(a => 
      a.id !== agent.id && 
      a.status === 'active' && 
      a.currentLoad < a.maxLoad
    );

    if (helperAgent) {
      const helpMessage = await this.agentService.generateCommunication(
        task, 
        agent.id, 
        helperAgent.name, 
        `I need assistance with: ${decision.reasoning}`
      );

      await this.storage.createCommunication({
        fromAgentId: agent.id,
        toAgentId: helperAgent.id,
        message: helpMessage,
        messageType: 'help_request',
        taskId: task.id,
        metadata: { decision, timestamp: new Date().toISOString() }
      });
    }

    return { success: true, helperAssigned: helperAgent?.name };
  }

  private async executeDelegation(agent: Agent, task: Task, decision: AgentDecision): Promise<any> {
    console.log(`👋 ${agent.name} is delegating task ${task.id}`);
    
    // Find appropriate delegate
    const availableAgents = await this.storage.getAgents();
    const delegate = availableAgents.find(a => 
      a.id !== agent.id && 
      a.status === 'active' && 
      a.currentLoad < a.maxLoad
    );

    if (delegate) {
      // Transfer task assignment
      await this.storage.updateTask(task.id, {
        assignedAgentId: delegate.id,
        updatedAt: new Date()
      });

      // Notify delegate
      const delegationMessage = await this.agentService.generateCommunication(
        task, 
        agent.id, 
        delegate.name, 
        `I'm delegating this task to you. ${decision.reasoning}`
      );

      await this.storage.createCommunication({
        fromAgentId: agent.id,
        toAgentId: delegate.id,
        message: delegationMessage,
        messageType: 'task_delegation',
        taskId: task.id,
        metadata: { decision, timestamp: new Date().toISOString() }
      });
    }

    return { success: true, delegatedTo: delegate?.name };
  }

  private async executeInformationGathering(agent: Agent, task: Task, decision: AgentDecision): Promise<any> {
    console.log(`📊 ${agent.name} is gathering information for task ${task.id}`);
    
    // Create information gathering communication
    await this.storage.createCommunication({
      fromAgentId: agent.id,
      message: `Gathering information: ${decision.reasoning}`,
      messageType: 'information_gathering',
      taskId: task.id,
      metadata: { decision, timestamp: new Date().toISOString() }
    });

    return { success: true, infoGathered: true };
  }

  private async executeCollaboration(agent: Agent, task: Task, decision: AgentDecision): Promise<any> {
    console.log(`🤝 ${agent.name} is initiating collaboration for task ${task.id}`);
    
    if (decision.collaborationNeeded) {
      await this.handleCollaborationRequest(task, agent, decision);
    }

    return { success: true, collaborationInitiated: true };
  }

  private async executeEscalation(agent: Agent, task: Task, decision: AgentDecision): Promise<any> {
    console.log(`🚨 ${agent.name} is escalating task ${task.id}`);
    
    await this.escalateTask(task, agent, decision.reasoning);
    
    return { success: true, escalated: true };
  }

  private async createTaskArtifacts(agent: Agent, task: Task, decision: AgentDecision): Promise<any[]> {
    const artifacts = [];
    
    // Create artifacts based on agent type and decision
    if (decision.artifactsToCreate && decision.artifactsToCreate.length > 0) {
      for (const artifactType of decision.artifactsToCreate) {
        const artifact = await this.storage.createArtifact({
          title: `${artifactType} for ${task.title}`,
          type: artifactType,
          content: `Generated by ${agent.name} for task: ${task.title}`,
          taskId: task.id,
          createdBy: agent.id,
          status: 'draft',
          metadata: { decision, timestamp: new Date().toISOString() }
        });
        
        artifacts.push(artifact);
      }
    }
    
    return artifacts;
  }

  private determineTaskStatus(decision: AgentDecision, result: any): string {
    if (decision.action === 'escalate') return 'escalated';
    if (decision.action === 'delegate_task') return 'assigned';
    if (result.artifacts && result.artifacts.length > 0) return 'in_progress';
    return 'active';
  }

  private async handleCollaborationRequest(task: Task, agent: Agent, decision: AgentDecision): Promise<void> {
    if (!decision.collaborationNeeded) return;
    
    const availableAgents = await this.storage.getAgents();
    const targetAgent = availableAgents.find(a => 
      a.name.toLowerCase().includes(decision.collaborationNeeded.targetAgent.toLowerCase()) ||
      a.type.includes(decision.collaborationNeeded.targetAgent.toLowerCase())
    );

    if (targetAgent) {
      const collaborationMessage = await this.agentService.generateCommunication(
        task,
        agent.id,
        targetAgent.name,
        decision.collaborationNeeded.message
      );

      await this.storage.createCommunication({
        fromAgentId: agent.id,
        toAgentId: targetAgent.id,
        message: collaborationMessage,
        messageType: 'collaboration_request',
        taskId: task.id,
        metadata: { decision, timestamp: new Date().toISOString() }
      });
    }
  }

  private async autoAssignTask(task: Task): Promise<void> {
    console.log(`🎯 Auto-assigning task: ${task.title}`);
    
    // Get all active agents
    const agents = await this.storage.getAgents();
    const activeAgents = agents.filter(agent => agent.status === 'active');
    
    if (activeAgents.length === 0) {
      console.log('No active agents available for task assignment');
      return;
    }

    // Determine best agent based on task type and agent load
    const bestAgent = await this.selectBestAgent(task, activeAgents);
    
    if (bestAgent) {
      await this.storage.assignTask(task.id, bestAgent.id);
      console.log(`📋 Task ${task.id} assigned to ${bestAgent.name}`);
      
      // Create assignment communication
      const assignmentComm: InsertCommunication = {
        fromAgentId: null,
        toAgentId: bestAgent.id,
        taskId: task.id,
        message: `Task "${task.title}" has been automatically assigned to you.`,
        messageType: 'task_assignment',
        metadata: {
          autoAssigned: true,
          timestamp: new Date().toISOString()
        }
      };
      
      await this.communicationService.createCommunication(assignmentComm);
    }
  }

  private async selectBestAgent(task: Task, agents: Agent[]): Promise<Agent | null> {
    // Score agents based on multiple factors
    const agentScores = agents.map(agent => {
      let score = 0;
      
      // Factor 1: Agent load (lower is better)
      const loadFactor = (agent.maxLoad - agent.currentLoad) / agent.maxLoad;
      score += loadFactor * 40;
      
      // Factor 2: Agent health (higher is better)
      score += (agent.healthScore / 100) * 30;
      
      // Factor 3: Agent type match
      const typeScore = this.getAgentTypeScore(task, agent);
      score += typeScore * 30;
      
      return { agent, score };
    });
    
    // Sort by score descending
    agentScores.sort((a, b) => b.score - a.score);
    
    return agentScores[0]?.agent || null;
  }

  private getAgentTypeScore(task: Task, agent: Agent): number {
    const taskPriority = task.priority;
    const agentType = agent.type;
    
    // High priority tasks go to senior agents
    if (taskPriority === 'high') {
      if (agentType.includes('senior') || agentType.includes('manager')) {
        return 1.0;
      }
      return 0.5;
    }
    
    // Medium priority tasks - balanced assignment
    if (taskPriority === 'medium') {
      return 0.8;
    }
    
    // Low priority tasks - any agent
    return 0.6;
  }

  private async escalateTask(task: Task, agent: Agent, reason: string): Promise<void> {
    console.log(`🚨 Escalating task ${task.id}: ${reason}`);
    
    // Find escalation target (typically Engineering Lead)
    const agents = await this.storage.getAgents();
    const engineeringLead = agents.find(a => a.type === 'engineering_lead');
    
    if (engineeringLead) {
      // Reassign to engineering lead
      await this.storage.assignTask(task.id, engineeringLead.id);
      
      // Create escalation communication
      const escalationComm: InsertCommunication = {
        fromAgentId: agent.id,
        toAgentId: engineeringLead.id,
        taskId: task.id,
        message: `Task "${task.title}" has been escalated. Reason: ${reason}`,
        messageType: 'escalation',
        metadata: {
          escalationReason: reason,
          previousAgent: agent.name,
          timestamp: new Date().toISOString()
        }
      };
      
      await this.communicationService.createCommunication(escalationComm);
    }
  }

  private async handleTaskResult(task: Task, agent: Agent, result: any): Promise<void> {
    // Handle different result types
    if (result.artifacts && result.artifacts.length > 0) {
      console.log(`📄 Task ${task.id} produced ${result.artifacts.length} artifacts`);
    }
    
    if (result.nextAgent) {
      // Automatic handoff to next agent
      await this.handoffTask(task, agent, result.nextAgent);
    }
    
    if (result.followUpTasks && result.followUpTasks.length > 0) {
      // Create follow-up tasks automatically
      await this.createFollowUpTasks(task, result.followUpTasks);
    }
  }

  private async handoffTask(task: Task, fromAgent: Agent, toAgentType: string): Promise<void> {
    console.log(`🔄 Handing off task ${task.id} from ${fromAgent.name} to ${toAgentType}`);
    
    const agents = await this.storage.getAgents();
    const targetAgent = agents.find(a => a.type === toAgentType && a.status === 'active');
    
    if (targetAgent) {
      await this.storage.assignTask(task.id, targetAgent.id);
      
      // Create handoff communication
      const handoffComm: InsertCommunication = {
        fromAgentId: fromAgent.id,
        toAgentId: targetAgent.id,
        taskId: task.id,
        message: `Task "${task.title}" has been handed off to you for the next phase.`,
        messageType: 'handoff',
        metadata: {
          handoffFrom: fromAgent.name,
          handoffTo: targetAgent.name,
          timestamp: new Date().toISOString()
        }
      };
      
      await this.communicationService.createCommunication(handoffComm);
    }
  }

  private async createFollowUpTasks(parentTask: Task, followUpTasks: any[]): Promise<void> {
    for (const followUp of followUpTasks) {
      const newTask = await this.storage.createTask({
        title: followUp.title,
        description: followUp.description,
        priority: followUp.priority || 'medium',
        status: 'pending',
        assignedAgentId: null,
        parentTaskId: parentTask.id,
        metadata: {
          autoGenerated: true,
          parentTaskId: parentTask.id
        }
      });
      
      console.log(`📋 Created follow-up task: ${newTask.title} (ID: ${newTask.id})`);
    }
  }

  private async handleTaskFailure(task: Task, agent: Agent | null, error: string): Promise<void> {
    console.log(`❌ Task ${task.id} failed: ${error}`);
    
    // Update task status
    await this.storage.updateTask(task.id, {
      status: 'failed',
      updatedAt: new Date(),
      metadata: {
        ...task.metadata,
        error: error,
        failureTime: new Date().toISOString()
      }
    });
    
    // Create health event
    if (agent) {
      const healthEvent: InsertHealthEvent = {
        agentId: agent.id,
        type: 'task_failure',
        message: `Task "${task.title}" failed: ${error}`,
        severity: 'high',
        metadata: {
          taskId: task.id,
          error: error
        }
      };
      
      await this.storage.createHealthEvent(healthEvent);
    }
  }

  private async startHealthMonitoring(): Promise<void> {
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.monitorAgentHealth();
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private async monitorAgentHealth(): Promise<void> {
    const agents = await this.storage.getAgents();
    
    for (const agent of agents) {
      // Check if agent is overloaded
      if (agent.currentLoad > agent.maxLoad * 0.9) {
        await this.handleAgentOverload(agent);
      }
      
      // Check if agent health is low
      if (agent.healthScore < 70) {
        await this.handleLowHealth(agent);
      }
    }
  }

  private async handleAgentOverload(agent: Agent): Promise<void> {
    console.log(`⚠️ Agent ${agent.name} is overloaded`);
    
    // Reassign some tasks to other agents
    const agentTasks = await this.storage.getTasksByAgent(agent.id);
    const activeTasks = agentTasks.filter(t => t.status === 'active');
    
    if (activeTasks.length > 0) {
      const taskToReassign = activeTasks[0];
      await this.autoAssignTask(taskToReassign);
    }
  }

  private async handleLowHealth(agent: Agent): Promise<void> {
    console.log(`🏥 Agent ${agent.name} has low health (${agent.healthScore}%)`);
    
    // Create health event
    const healthEvent: InsertHealthEvent = {
      agentId: agent.id,
      type: 'low_health',
      message: `Agent health dropped to ${agent.healthScore}%`,
      severity: 'medium',
      metadata: {
        healthScore: agent.healthScore
      }
    };
    
    await this.storage.createHealthEvent(healthEvent);
  }

  private async startTaskAssignmentAutomation(): Promise<void> {
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        // Get unassigned tasks
        const tasks = await this.storage.getTasks();
        const unassignedTasks = tasks.filter(t => !t.assignedAgentId && t.status === 'pending');
        
        for (const task of unassignedTasks) {
          await this.autoAssignTask(task);
        }
      } catch (error) {
        console.error('Task assignment automation error:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for external control
  async pauseTask(taskId: number): Promise<void> {
    await this.storage.updateTask(taskId, { status: 'paused' });
    console.log(`⏸️ Task ${taskId} paused`);
  }

  async resumeTask(taskId: number): Promise<void> {
    await this.storage.updateTask(taskId, { status: 'active' });
    console.log(`▶️ Task ${taskId} resumed`);
  }

  async getWorkflowStatus(): Promise<any> {
    const tasks = await this.storage.getTasks();
    const agents = await this.storage.getAgents();
    
    return {
      isRunning: this.isRunning,
      processingQueue: Array.from(this.processingQueue),
      taskStats: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        active: tasks.filter(t => t.status === 'active').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length
      },
      agentStats: {
        total: agents.length,
        active: agents.filter(a => a.status === 'active').length,
        overloaded: agents.filter(a => a.currentLoad > a.maxLoad * 0.9).length,
        unhealthy: agents.filter(a => a.healthScore < 70).length
      }
    };
  }
}