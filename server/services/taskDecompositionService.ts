import { AgentMemoryService } from './agentMemoryService';
import { AgentCommunicationProtocol } from './agentCommunicationProtocol';
import * as storage from '../storage';

interface TaskDecomposition {
  originalTaskId: number;
  subtasks: SubTask[];
  dependencies: Dependency[];
  estimatedTotalTime: number;
  decomposedBy: number;
  decomposedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface SubTask {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  estimatedTime: number;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
}

interface Dependency {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
  description: string;
}

interface WorkloadAnalysis {
  agentId: number;
  currentTasks: number;
  estimatedHours: number;
  skillMatch: number; // 0-1 score
  availability: number; // 0-1 score
  overallScore: number;
}

export class TaskDecompositionService {
  private memoryService: AgentMemoryService;
  private communicationProtocol: AgentCommunicationProtocol;
  private storage: any;
  private activeDecompositions: Map<number, TaskDecomposition> = new Map();

  constructor(
    memoryService: AgentMemoryService,
    communicationProtocol: AgentCommunicationProtocol,
    storage: any
  ) {
    this.memoryService = memoryService;
    this.communicationProtocol = communicationProtocol;
    this.storage = storage;
  }

  async decomposeTask(taskId: number, decomposingAgentId: number): Promise<TaskDecomposition | null> {
    const task = await this.storage.getTask(taskId);
    if (!task) return null;

    const decomposition = await this.analyzeAndDecompose(task, decomposingAgentId);
    if (decomposition) {
      this.activeDecompositions.set(taskId, decomposition);
      
      // Log decomposition
      await this.memoryService.logAgentMemory(decomposingAgentId, {
        type: 'action',
        content: `Decomposed task ${taskId} into ${decomposition.subtasks.length} subtasks`,
        details: decomposition,
        timestamp: new Date().toISOString()
      });

      // Start assignment process
      await this.assignSubtasks(decomposition);
    }

    return decomposition;
  }

  private async analyzeAndDecompose(task: any, decomposingAgentId: number): Promise<TaskDecomposition> {
    const subtasks: SubTask[] = [];
    const dependencies: Dependency[] = [];

    // Analyze task complexity and domain
    const taskComplexity = this.assessTaskComplexity(task);
    const taskDomain = this.identifyTaskDomain(task);

    // Generate subtasks based on task type and complexity
    switch (taskDomain) {
      case 'software_development':
        subtasks.push(...await this.decomposeSoftwareDevelopmentTask(task));
        break;
      case 'analysis':
        subtasks.push(...await this.decomposeAnalysisTask(task));
        break;
      case 'design':
        subtasks.push(...await this.decomposeDesignTask(task));
        break;
      case 'testing':
        subtasks.push(...await this.decomposeTestingTask(task));
        break;
      default:
        subtasks.push(...await this.decomposeGenericTask(task));
    }

    // Generate dependencies
    dependencies.push(...this.generateDependencies(subtasks));

    const decomposition: TaskDecomposition = {
      originalTaskId: task.id,
      subtasks,
      dependencies,
      estimatedTotalTime: subtasks.reduce((total, st) => total + st.estimatedTime, 0),
      decomposedBy: decomposingAgentId,
      decomposedAt: new Date().toISOString(),
      status: 'pending'
    };

    return decomposition;
  }

  private assessTaskComplexity(task: any): 'low' | 'medium' | 'high' {
    let complexity = 0;
    
    // Factors that increase complexity
    if (task.description && task.description.length > 200) complexity++;
    if (task.tags && task.tags.length > 3) complexity++;
    if (task.priority === 'high') complexity++;
    if (task.estimatedHours && task.estimatedHours > 8) complexity++;
    if (task.requirements && task.requirements.length > 1) complexity++;

    return complexity >= 3 ? 'high' : complexity >= 2 ? 'medium' : 'low';
  }

  private identifyTaskDomain(task: any): string {
    const title = task.title.toLowerCase();
    const description = task.description?.toLowerCase() || '';
    const tags = task.tags?.map((t: string) => t.toLowerCase()) || [];

    if (tags.includes('development') || tags.includes('coding') || 
        title.includes('develop') || title.includes('code') || title.includes('implement')) {
      return 'software_development';
    }
    if (tags.includes('analysis') || tags.includes('research') || 
        title.includes('analyze') || title.includes('research')) {
      return 'analysis';
    }
    if (tags.includes('design') || tags.includes('ui') || tags.includes('ux') || 
        title.includes('design') || title.includes('interface')) {
      return 'design';
    }
    if (tags.includes('testing') || tags.includes('qa') || 
        title.includes('test') || title.includes('quality')) {
      return 'testing';
    }

    return 'generic';
  }

  private async decomposeSoftwareDevelopmentTask(task: any): Promise<SubTask[]> {
    const subtasks: SubTask[] = [];
    const baseId = `${task.id}_sub`;

    subtasks.push({
      id: `${baseId}_1`,
      title: 'Requirements Analysis',
      description: 'Analyze and clarify requirements for the development task',
      requiredSkills: ['analysis', 'requirements'],
      estimatedTime: 2,
      priority: 'high',
      status: 'pending',
      dependencies: [],
      deliverables: ['requirements_document', 'acceptance_criteria'],
      acceptanceCriteria: ['All requirements documented and clarified'],
      createdAt: new Date().toISOString()
    });

    subtasks.push({
      id: `${baseId}_2`,
      title: 'Technical Design',
      description: 'Create technical design and architecture for the implementation',
      requiredSkills: ['architecture', 'design'],
      estimatedTime: 3,
      priority: 'high',
      status: 'pending',
      dependencies: [`${baseId}_1`],
      deliverables: ['technical_design', 'architecture_diagram'],
      acceptanceCriteria: ['Design approved by architect'],
      createdAt: new Date().toISOString()
    });

    subtasks.push({
      id: `${baseId}_3`,
      title: 'Implementation',
      description: 'Implement the solution according to the technical design',
      requiredSkills: ['development', 'coding'],
      estimatedTime: 8,
      priority: 'medium',
      status: 'pending',
      dependencies: [`${baseId}_2`],
      deliverables: ['source_code', 'unit_tests'],
      acceptanceCriteria: ['Code passes all tests', 'Code review approved'],
      createdAt: new Date().toISOString()
    });

    subtasks.push({
      id: `${baseId}_4`,
      title: 'Testing',
      description: 'Comprehensive testing of the implemented solution',
      requiredSkills: ['testing', 'qa'],
      estimatedTime: 2,
      priority: 'medium',
      status: 'pending',
      dependencies: [`${baseId}_3`],
      deliverables: ['test_results', 'bug_reports'],
      acceptanceCriteria: ['All tests pass', 'No critical bugs found'],
      createdAt: new Date().toISOString()
    });

    return subtasks;
  }

  private async decomposeAnalysisTask(task: any): Promise<SubTask[]> {
    const subtasks: SubTask[] = [];
    const baseId = `${task.id}_sub`;

    subtasks.push({
      id: `${baseId}_1`,
      title: 'Data Collection',
      description: 'Gather all relevant data and information for analysis',
      requiredSkills: ['research', 'data_collection'],
      estimatedTime: 3,
      priority: 'high',
      status: 'pending',
      dependencies: [],
      deliverables: ['data_collection_report'],
      acceptanceCriteria: ['All required data sources identified and accessed'],
      createdAt: new Date().toISOString()
    });

    subtasks.push({
      id: `${baseId}_2`,
      title: 'Analysis Execution',
      description: 'Perform the detailed analysis on collected data',
      requiredSkills: ['analysis', 'data_analysis'],
      estimatedTime: 5,
      priority: 'high',
      status: 'pending',
      dependencies: [`${baseId}_1`],
      deliverables: ['analysis_report', 'findings_summary'],
      acceptanceCriteria: ['Analysis methodology documented', 'Findings validated'],
      createdAt: new Date().toISOString()
    });

    subtasks.push({
      id: `${baseId}_3`,
      title: 'Recommendations',
      description: 'Develop actionable recommendations based on analysis',
      requiredSkills: ['analysis', 'strategic_thinking'],
      estimatedTime: 2,
      priority: 'medium',
      status: 'pending',
      dependencies: [`${baseId}_2`],
      deliverables: ['recommendations_document'],
      acceptanceCriteria: ['Recommendations are actionable and prioritized'],
      createdAt: new Date().toISOString()
    });

    return subtasks;
  }

  private async decomposeDesignTask(task: any): Promise<SubTask[]> {
    const subtasks: SubTask[] = [];
    const baseId = `${task.id}_sub`;

    subtasks.push({
      id: `${baseId}_1`,
      title: 'Design Research',
      description: 'Research design patterns, user needs, and best practices',
      requiredSkills: ['research', 'design'],
      estimatedTime: 2,
      priority: 'high',
      status: 'pending',
      dependencies: [],
      deliverables: ['research_findings', 'design_patterns'],
      acceptanceCriteria: ['Research documented and patterns identified'],
      createdAt: new Date().toISOString()
    });

    subtasks.push({
      id: `${baseId}_2`,
      title: 'Concept Development',
      description: 'Develop initial design concepts and wireframes',
      requiredSkills: ['design', 'wireframing'],
      estimatedTime: 4,
      priority: 'high',
      status: 'pending',
      dependencies: [`${baseId}_1`],
      deliverables: ['wireframes', 'design_concepts'],
      acceptanceCriteria: ['Concepts align with requirements'],
      createdAt: new Date().toISOString()
    });

    subtasks.push({
      id: `${baseId}_3`,
      title: 'Design Finalization',
      description: 'Finalize design with detailed specifications',
      requiredSkills: ['design', 'prototyping'],
      estimatedTime: 3,
      priority: 'medium',
      status: 'pending',
      dependencies: [`${baseId}_2`],
      deliverables: ['final_design', 'design_specs'],
      acceptanceCriteria: ['Design approved by stakeholders'],
      createdAt: new Date().toISOString()
    });

    return subtasks;
  }

  private async decomposeTestingTask(task: any): Promise<SubTask[]> {
    const subtasks: SubTask[] = [];
    const baseId = `${task.id}_sub`;

    subtasks.push({
      id: `${baseId}_1`,
      title: 'Test Planning',
      description: 'Create comprehensive test plan and test cases',
      requiredSkills: ['testing', 'test_planning'],
      estimatedTime: 2,
      priority: 'high',
      status: 'pending',
      dependencies: [],
      deliverables: ['test_plan', 'test_cases'],
      acceptanceCriteria: ['All scenarios covered in test plan'],
      createdAt: new Date().toISOString()
    });

    subtasks.push({
      id: `${baseId}_2`,
      title: 'Test Execution',
      description: 'Execute all test cases and document results',
      requiredSkills: ['testing', 'test_execution'],
      estimatedTime: 4,
      priority: 'high',
      status: 'pending',
      dependencies: [`${baseId}_1`],
      deliverables: ['test_results', 'bug_reports'],
      acceptanceCriteria: ['All tests executed and documented'],
      createdAt: new Date().toISOString()
    });

    return subtasks;
  }

  private async decomposeGenericTask(task: any): Promise<SubTask[]> {
    const subtasks: SubTask[] = [];
    const baseId = `${task.id}_sub`;

    // Generic decomposition based on task size
    const estimatedHours = task.estimatedHours || 4;
    const numSubtasks = Math.min(Math.ceil(estimatedHours / 2), 4);

    for (let i = 1; i <= numSubtasks; i++) {
      subtasks.push({
        id: `${baseId}_${i}`,
        title: `Sub-task ${i} for ${task.title}`,
        description: `Part ${i} of ${task.title}: ${task.description || 'No description'}`,
        requiredSkills: task.tags || ['general'],
        estimatedTime: Math.ceil(estimatedHours / numSubtasks),
        priority: task.priority || 'medium',
        status: 'pending',
        dependencies: i > 1 ? [`${baseId}_${i-1}`] : [],
        deliverables: [`deliverable_${i}`],
        acceptanceCriteria: [`Sub-task ${i} completed successfully`],
        createdAt: new Date().toISOString()
      });
    }

    return subtasks;
  }

  private generateDependencies(subtasks: SubTask[]): Dependency[] {
    const dependencies: Dependency[] = [];
    
    // Generate dependencies based on subtask dependencies
    subtasks.forEach(subtask => {
      subtask.dependencies.forEach(depId => {
        dependencies.push({
          id: `dep_${subtask.id}_${depId}`,
          fromTaskId: depId,
          toTaskId: subtask.id,
          type: 'finish_to_start',
          description: `${subtask.title} depends on completion of ${depId}`
        });
      });
    });

    return dependencies;
  }

  private async assignSubtasks(decomposition: TaskDecomposition): Promise<void> {
    const allAgents = await this.storage.getAgents();
    
    for (const subtask of decomposition.subtasks) {
      if (subtask.dependencies.length === 0) {
        // Can assign immediately
        const bestAgent = await this.findBestAgent(subtask, allAgents);
        if (bestAgent) {
          await this.assignSubtask(subtask, bestAgent.id, decomposition);
        }
      }
    }
  }

  private async findBestAgent(subtask: SubTask, allAgents: any[]): Promise<any | null> {
    const workloadAnalyses: WorkloadAnalysis[] = [];
    
    for (const agent of allAgents) {
      if (agent.status !== 'active') continue;
      
      const analysis = await this.analyzeAgentWorkload(agent, subtask);
      workloadAnalyses.push(analysis);
    }

    // Sort by overall score (higher is better)
    workloadAnalyses.sort((a, b) => b.overallScore - a.overallScore);
    
    return workloadAnalyses.length > 0 ? allAgents.find(a => a.id === workloadAnalyses[0].agentId) : null;
  }

  private async analyzeAgentWorkload(agent: any, subtask: SubTask): Promise<WorkloadAnalysis> {
    const allTasks = await this.storage.getTasks();
    const agentTasks = allTasks.filter((t: any) => t.assignedToId === agent.id && t.status !== 'completed');
    
    const currentTasks = agentTasks.length;
    const estimatedHours = agentTasks.reduce((total: number, task: any) => total + (task.estimatedHours || 2), 0);
    
    // Calculate skill match
    const agentSkills = agent.personality?.expertise || [];
    const requiredSkills = subtask.requiredSkills;
    const skillMatch = requiredSkills.length > 0 ? 
      requiredSkills.filter(skill => agentSkills.includes(skill)).length / requiredSkills.length : 0;
    
    // Calculate availability (inverse of workload)
    const availability = Math.max(0, 1 - (currentTasks / 5) - (estimatedHours / 40));
    
    // Overall score combines skill match and availability
    const overallScore = (skillMatch * 0.6) + (availability * 0.4);

    return {
      agentId: agent.id,
      currentTasks,
      estimatedHours,
      skillMatch,
      availability,
      overallScore
    };
  }

  private async assignSubtask(subtask: SubTask, agentId: number, decomposition: TaskDecomposition): Promise<void> {
    subtask.assignedTo = agentId;
    subtask.status = 'assigned';
    subtask.assignedAt = new Date().toISOString();

    // Create actual task in storage
    const taskData = {
      title: subtask.title,
      description: subtask.description,
      status: 'pending',
      assignedToId: agentId,
      createdById: String(decomposition.decomposedBy),
      tags: subtask.requiredSkills,
      priority: subtask.priority,
      estimatedHours: subtask.estimatedTime,
      workflow: {
        stage: 'assigned',
        history: [],
        nextAgent: null,
        parentTaskId: decomposition.originalTaskId,
        subtaskId: subtask.id
      }
    };

    const createdTask = await this.storage.createTask(taskData);
    
    // Delegate to agent
    await this.communicationProtocol.delegateTask(
      decomposition.decomposedBy,
      agentId,
      createdTask.id,
      `Subtask from decomposition: ${subtask.description}`
    );

    // Log assignment
    await this.memoryService.logAgentMemory(decomposition.decomposedBy, {
      type: 'action',
      content: `Assigned subtask "${subtask.title}" to agent ${agentId}`,
      details: { subtaskId: subtask.id, agentId, taskId: createdTask.id },
      timestamp: new Date().toISOString()
    });
  }

  async checkDependencies(subtaskId: string): Promise<boolean> {
    for (const decomposition of Array.from(this.activeDecompositions.values())) {
      const subtask = decomposition.subtasks.find((st: SubTask) => st.id === subtaskId);
      if (!subtask) continue;

      // Check if all dependencies are completed
      const dependencies = subtask.dependencies;
      const allDependenciesComplete = dependencies.every((depId: string) => {
        const depSubtask = decomposition.subtasks.find((st: SubTask) => st.id === depId);
        return depSubtask && depSubtask.status === 'completed';
      });

      if (allDependenciesComplete && subtask.status === 'pending') {
        // Can now assign this subtask
        const allAgents = await this.storage.getAgents();
        const bestAgent = await this.findBestAgent(subtask, allAgents);
        if (bestAgent) {
          await this.assignSubtask(subtask, bestAgent.id, decomposition);
        }
      }

      return allDependenciesComplete;
    }

    return false;
  }

  async completeSubtask(subtaskId: string): Promise<void> {
    for (const decomposition of Array.from(this.activeDecompositions.values())) {
      const subtask = decomposition.subtasks.find((st: SubTask) => st.id === subtaskId);
      if (!subtask) continue;

      subtask.status = 'completed';
      subtask.completedAt = new Date().toISOString();

      // Check for dependent subtasks that can now be assigned
      const dependentSubtasks = decomposition.subtasks.filter((st: SubTask) => 
        st.dependencies.includes(subtaskId)
      );

      for (const depSubtask of dependentSubtasks) {
        await this.checkDependencies(depSubtask.id);
      }

      // Check if all subtasks are complete
      const allComplete = decomposition.subtasks.every((st: SubTask) => st.status === 'completed');
      if (allComplete) {
        decomposition.status = 'completed';
        
        // Update original task
        await this.storage.updateTask(decomposition.originalTaskId, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
      }

      break;
    }
  }

  async getTaskDecomposition(taskId: number): Promise<TaskDecomposition | null> {
    return this.activeDecompositions.get(taskId) || null;
  }

  async getAgentSubtasks(agentId: number): Promise<SubTask[]> {
    const subtasks: SubTask[] = [];
    
    for (const decomposition of Array.from(this.activeDecompositions.values())) {
      const agentSubtasks = decomposition.subtasks.filter((st: SubTask) => st.assignedTo === agentId);
      subtasks.push(...agentSubtasks);
    }

    return subtasks;
  }
}
