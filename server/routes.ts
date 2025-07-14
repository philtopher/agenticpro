import { Express } from 'express';
import { Server, createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from './storage';
import { AgentService } from './services/agentService';
import { TaskService } from './services/taskService';
import { CommunicationService } from './services/communicationService';
import { ArtifactService } from './services/artifactService';
import { HealthService } from './services/healthService';
import { EmailService } from './services/emailService';
import { PlannerService } from './services/plannerService';
import { ReminderService } from './services/reminderService';
import { GovernorService } from './services/governorService';
import { DiagramService } from './services/diagramService';
import { FileSummarizerService } from './services/fileSummarizerService';
import { MessageRoutingService } from './services/messageRoutingService';
import { AgentAI } from './services/agentAI';
import { AgentMemoryService } from './services/agentMemory';
import { ArtifactEngine } from './services/artifactEngine';
import { CollaborationEngine } from './services/collaborationEngine';
import { ContinuousLearningEngine } from './services/continuousLearning';
import { insertTaskSchema, insertCommunicationSchema, insertArtifactSchema } from '../shared/schema';

// --- Utility: Autonomous goal generation for agents ---
function generateAgentGoal(agentId: number, memoryLog: any[], systemTasks: any[]): { title: string, description: string, tags: string[] } {
  // Use memory and system state to propose a meaningful goal
  // Example: If agent recently failed a task, propose a goal to improve; else, propose a new feature or improvement
  const lastLearning = memoryLog.slice().reverse().find((e: any) => e.type === 'learning');
  let title = '';
  let description = '';
  let tags: string[] = [];
  if (lastLearning && lastLearning.content && lastLearning.content.toLowerCase().includes('fail')) {
    title = `Improve on failed task`;
    description = `Agent ${agentId} sets a goal to address recent failure: ${lastLearning.content}`;
    tags = ['improvement', 'learning'];
  } else {
    // Propose a new feature or improvement based on open tasks
    const openTasks = systemTasks.filter((t: any) => t.status === 'pending');
    if (openTasks.length > 0) {
      title = `Support task: ${openTasks[0].title}`;
      description = `Agent ${agentId} sets a goal to support or accelerate task: ${openTasks[0].title}`;
      tags = ['support', 'collaboration'];
    } else {
      title = `Propose new feature`;
      description = `Agent ${agentId} sets a goal to propose a new feature for the project.`;
      tags = ['feature', 'initiative'];
    }
  }
  return { title, description, tags };
}

// --- Utility: Support for parallel/nonlinear workflows (branch/merge/conditional) ---
function getParallelTasksForAgent(agentId: number, allTasks: any[]) {
  // Return tasks assigned to this agent that are not blocked and not completed
  return allTasks.filter(t => t.assignedToId === agentId && t.status === 'pending' && (!t.blockedBy || t.blockedBy.length === 0));
}

// In-memory store for task progress (could be replaced with Redis/db for scale)
const taskProgressMap = new Map<number, any>();

export async function registerRoutes(
  app: Express,
  workflowEngine?: any,
  projectService?: any,
  versionControlService?: any
): Promise<Server> {
  // Initialize services
  const agentService = new AgentService(storage);
  const taskService = new TaskService(storage);
  const communicationService = new CommunicationService(storage);
  const artifactService = new ArtifactService(storage);
  const healthService = new HealthService(storage);
  const emailService = new EmailService(storage);
  const plannerService = new PlannerService(storage);
  const reminderService = new ReminderService(storage);
  const governorService = new GovernorService(storage);
  const diagramService = new DiagramService(storage);
  const fileSummarizerService = new FileSummarizerService(storage);
  const messageRoutingService = new MessageRoutingService(storage);
  
  // Initialize advanced AI services (Phase 2-5)
  const agentMemoryService = new AgentMemoryService(storage);
  const artifactEngine = new ArtifactEngine(storage);
  const collaborationEngine = new CollaborationEngine(storage);
  const continuousLearningEngine = new ContinuousLearningEngine(storage, agentMemoryService);

  // Initialize agents on startup
  try {
    await agentService.initializeAgents();
  } catch (error) {
    console.error("Error initializing agents:", error);
  }

  // --- Agent utility functions that require agentMemoryService ---
  // --- Utility: Find similar and contextually relevant past tasks for an agent (enhanced memory-driven reasoning) ---
  function findRelevantTasksInMemory(agentId: number, currentTask: any, memoryLog: any[], maxResults = 5) {
    if (!currentTask || !currentTask.title) return [];
    // Use keywords from title and tags
    const keywords: string[] = [
      ...currentTask.title.toLowerCase().split(/\W+/).filter(Boolean),
      ...(currentTask.tags || []).map((t: string) => t.toLowerCase())
    ];
    // Find similar actions and also relevant strategies/learning
    const relevant = memoryLog.filter((entry: any) => {
      if (!entry.content) return false;
      const content = (entry.content || '').toLowerCase();
      // Match on keywords or if entry is a strategy/learning for similar context
      if (entry.type === 'action') {
        return keywords.some((k: string) => content.includes(k));
      }
      if (entry.type === 'strategy' || entry.type === 'learning') {
        return keywords.some((k: string) => content.includes(k));
      }
      return false;
    });
    // Sort by recency
    relevant.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    // Generalize: if multiple strategies/learning found, merge their details
    const strategies = relevant.filter((e: any) => e.type === 'strategy').map((e: any) => e.details || {});
    let generalizedStrategy = {};
    if (strategies.length > 0) {
      // Simple merge: average riskTolerance, collect lastOutcomes
      const riskVals = strategies.map((s: any) => s.riskTolerance).filter((v: any) => typeof v === 'number');
      if (riskVals.length > 0) {
        generalizedStrategy['riskTolerance'] = riskVals.reduce((a: number, b: number) => a + b, 0) / riskVals.length;
      }
      generalizedStrategy['lastOutcomes'] = strategies.map((s: any) => s.lastOutcome).filter(Boolean);
    }
    return { relevant: relevant.slice(0, maxResults), generalizedStrategy };
  }

  // --- Utility: Agent learning from outcomes (learning/adaptation, with strategy update) ---
  async function agentLearnFromOutcome(agentId: number, taskId: number, outcome: string, details: any = {}) {
    if (agentMemoryService && typeof agentMemoryService.processTaskOutcome === 'function') {
      await agentMemoryService.processTaskOutcome(agentId, taskId, outcome, details);
    }
    return true;
  }


  // --- Utility: Agent personality/specialization (dynamic, evolving) ---
  async function getAgentPersonality(agentId: number) {
    // Start with static base
    const base = {
      1: { traits: ['visionary', 'strategic'], expertise: ['product', 'requirements'] },
      2: { traits: ['analytical', 'detail-oriented'], expertise: ['analysis', 'user stories'] },
      3: { traits: ['innovative', 'pragmatic'], expertise: ['development', 'coding'] },
      4: { traits: ['meticulous', 'skeptical'], expertise: ['testing', 'QA'] },
      5: { traits: ['decisive', 'customer-focused'], expertise: ['ownership', 'prioritization'] },
      6: { traits: ['creative', 'systematic'], expertise: ['design', 'UX'] },
      7: { traits: ['architectural', 'holistic'], expertise: ['architecture', 'integration'] },
      8: { traits: ['automation', 'resilient'], expertise: ['devops', 'infrastructure'] },
      9: { traits: ['leadership', 'adaptive'], expertise: ['management', 'tech lead'] },
      10: { traits: ['governance', 'proactive'], expertise: ['admin', 'oversight'] },
    };
    let personality = { ...(base[agentId as keyof typeof base] || { traits: [], expertise: [] }) };
    // Evolve based on memory (recent learning/strategy)
    if (agentMemoryService && typeof agentMemoryService.getAgentMemory === 'function') {
      const mem = await agentMemoryService.getAgentMemory(agentId);
      // If agent has succeeded at a certain tag/area, add to expertise
      const learnings = mem.filter((e: any) => e.type === 'learning' && e.details && e.details.area && e.content && e.content.toLowerCase().includes('success'));
      for (const l of learnings) {
        if (l.details.area && !personality.expertise.includes(l.details.area)) {
          personality.expertise.push(l.details.area);
        }
      }
      // If agent has failed repeatedly in an area, reduce confidence (remove from expertise)
      const failures = mem.filter((e: any) => e.type === 'learning' && e.details && e.details.area && e.content && e.content.toLowerCase().includes('fail'));
      for (const f of failures) {
        if (f.details.area && personality.expertise.includes(f.details.area)) {
          // Remove if failed more than succeeded
          const failCount = failures.filter((x: any) => x.details.area === f.details.area).length;
          const successCount = learnings.filter((x: any) => x.details.area === f.details.area).length;
          if (failCount > successCount) {
            personality.expertise = personality.expertise.filter((x: string) => x !== f.details.area);
          }
        }
      }
    }
    return personality;
  }

  /**
   * Robust error detection, escalation, and adaptive recovery for agents and tasks.
   * - Detects error/stuck state, attempts recovery, escalates if needed, and adapts agent strategy.
   * - Logs all steps for explainability.
   */
  async function recoverAgentOrTask(agentId: number, taskId: number) {
    let task = await storage.getTask(taskId);
    if (!task) return false;
    let recoveryLog = [];
    // 1. Detect error/stuck state
    if (task.status !== 'error' && task.status !== 'stuck') {
      recoveryLog.push('No error/stuck state detected. No recovery needed.');
      return true;
    }
    // 2. Attempt simple retry (reset to pending)
    await storage.updateTask(taskId, { status: 'pending' });
    recoveryLog.push('Task status reset to pending for retry.');
    // 3. Log recovery attempt in agent memory
    if (typeof agentMemoryService !== 'undefined' && agentMemoryService && typeof agentMemoryService.logAgentMemory === 'function') {
      await agentMemoryService.logAgentMemory(agentId, {
        type: 'event',
        content: `Recovery triggered for task ${taskId}: status reset to pending`,
        details: { recoveryLog },
        timestamp: new Date().toISOString(),
      });
    }
    // 4. Escalate if repeated failures (count in memory)
    let mem = [];
    if (typeof agentMemoryService !== 'undefined' && agentMemoryService && typeof agentMemoryService.getAgentMemory === 'function') {
      mem = await agentMemoryService.getAgentMemory(agentId);
    }
    const failEvents = mem.filter((e: any) => e.type === 'event' && e.content && e.content.includes(`Recovery triggered for task ${taskId}`));
    if (failEvents.length > 2) {
      await storage.updateTask(taskId, { status: 'escalated' });
      recoveryLog.push('Task escalated after repeated recovery failures.');
      if (typeof agentMemoryService !== 'undefined' && agentMemoryService && typeof agentMemoryService.logAgentMemory === 'function') {
        await agentMemoryService.logAgentMemory(agentId, {
          type: 'event',
          content: `Task ${taskId} escalated after repeated recovery failures`,
          details: { recoveryLog },
          timestamp: new Date().toISOString(),
        });
      }
      return false;
    }
    // 5. Adapt agent strategy after recovery attempt
    if (typeof agentMemoryService !== 'undefined' && agentMemoryService && typeof agentMemoryService.logAgentMemory === 'function') {
      await agentMemoryService.logAgentMemory(agentId, {
        type: 'learning',
        content: `Agent adapted after recovery for task ${taskId}`,
        details: { recoveryLog },
        timestamp: new Date().toISOString(),
      });
    }
    return true;
  }

  // --- Utility: Negotiation/consensus (basic protocol) ---
  async function negotiateTaskAssignment(agentIds: number[], taskId: number) {
    // Each agent "votes" for itself or another agent based on workload and recent success
    let votes: Record<number, number> = {};
    for (const id of agentIds) {
      votes[id] = 0;
    }
    for (const id of agentIds) {
      let mem = [];
      if (typeof agentMemoryService !== 'undefined' && agentMemoryService && typeof agentMemoryService.getAgentMemory === 'function') {
        mem = await agentMemoryService.getAgentMemory(id);
      }
      // Prefer agents with fewer actions on this task and more recent success
      const actions = mem.filter((e: any) => e.type === 'action' && e.content && e.content.includes(`task ${taskId}`));
      const lastSuccess = mem.slice().reverse().find((e: any) => e.type === 'learning' && e.content && e.content.toLowerCase().includes('success'));
      let score = 0;
      score -= actions.length;
      if (lastSuccess) score += 2;
      votes[id] += score;
    }
    // Assign to agent with highest votes (consensus)
    let selectedAgent = agentIds[0];
    let maxVotes = votes[selectedAgent];
    for (const id of agentIds) {
      if (votes[id] > maxVotes) {
        maxVotes = votes[id];
        selectedAgent = id;
      }
    }
    await storage.assignTask(taskId, selectedAgent);
    // Log negotiation result
    if (typeof agentMemoryService !== 'undefined' && agentMemoryService && typeof agentMemoryService.logAgentMemory === 'function') {
      await agentMemoryService.logAgentMemory(selectedAgent, {
        type: 'event',
        content: `Negotiation consensus: assigned to agent ${selectedAgent} for task ${taskId}`,
        timestamp: new Date().toISOString(),
      });
    }
    return selectedAgent;
  }

  // --- END agent utility functions ---

  // --- API: Get similar past tasks for an agent (for adaptive planning/explainability) ---
  app.get('/api/agents/:id/similar-tasks/:taskId', async (req: any, res: any) => {
    try {
      const agentId = parseInt(req.params.id);
      const taskId = parseInt(req.params.taskId);
      if (isNaN(agentId) || isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid agentId or taskId" });
      }
      const memoryLog = await agentMemoryService.getAgentMemory(agentId);
      const currentTask = await storage.getTask(taskId);
      if (!currentTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      const similar = findRelevantTasksInMemory(agentId, currentTask, memoryLog);
      res.json({ similar });
    } catch (error) {
      console.error("Error fetching similar tasks from memory:", error);
      res.status(500).json({ message: "Failed to fetch similar tasks from memory" });
    }
  });

  app.post('/api/agents/:id/propose-task', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const { title, description, tags, priority } = req.body;
      if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
      }
      // Agent proposes a new task
      const taskData = {
        title,
        description,
        status: "pending",
        assignedToId: null,
        createdById: agentId ? String(agentId) : null,
        tags: tags || [],
        priority: priority || "medium",
        workflow: {
          stage: "requirements",
          history: [],
          nextAgent: "product_manager"
        }
      };
      const newTask = await taskService.createTask(taskData);
      // Broadcast to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'task_created',
            data: newTask
          }));
        }
      });
      res.status(201).json(newTask);
    } catch (error) {
      console.error("Error in agent-initiated task creation:", error);
      res.status(500).json({ message: "Failed to create agent-initiated task" });
    }
  });
  app.get('/api/agents', async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get('/api/agents/:id', async (req, res) => {
    try {
      const agent = await storage.getAgent(parseInt(req.params.id));
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  // Task routes
  app.get('/api/tasks', async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', async (req: any, res) => {
    try {
      // Process and convert the input data
      const rawData = {
        ...req.body,
        assignedToId: req.body.assignedToId ? parseInt(req.body.assignedToId) : null,
        createdById: null, // No auth required for testing
        status: "pending",
        tags: req.body.tags || [],
        workflow: {
          stage: "requirements",
          history: [],
          nextAgent: "product_manager"
        }
      };
      
      const taskData = insertTaskSchema.parse(rawData);
      
      const task = await taskService.createTask(taskData);
      
      // Broadcast task creation to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'task_created',
            data: task
          }));
        }
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;
      
      const task = await storage.updateTask(taskId, updates);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.post('/api/tasks/:id/assign', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { agentId } = req.body;
      
      await storage.assignTask(taskId, agentId);
      res.json({ message: "Task assigned successfully" });
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ message: "Failed to assign task" });
    }
  });

  // AI-powered task processing
  app.post('/api/tasks/:id/process', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      await taskService.startAutomaticTaskProcessing(taskId);
      
      // Broadcast task update to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'task_processed',
            data: { taskId }
          }));
        }
      });
      
      res.json({ message: "Task processed successfully" });
    } catch (error) {
      console.error("Error processing task:", error);
      res.status(500).json({ message: "Failed to process task" });
    }
  });

  // Task communications endpoint
  app.get('/api/tasks/:id/communications', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const communications = await taskService.getTaskCommunications(taskId);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching task communications:", error);
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  // Agent control endpoints
  app.post('/api/agents/:id/pause', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      await taskService.pauseAgent(agentId);
      res.json({ message: "Agent paused successfully" });
    } catch (error) {
      console.error("Error pausing agent:", error);
      res.status(500).json({ message: "Failed to pause agent" });
    }
  });

  app.post('/api/agents/:id/resume', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      await taskService.resumeAgent(agentId);
      res.json({ message: "Agent resumed successfully" });
    } catch (error) {
      console.error("Error resuming agent:", error);
      res.status(500).json({ message: "Failed to resume agent" });
    }
  });

  // Communication routes
  app.get('/api/communications', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const communications = await storage.getRecentCommunications(limit);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  app.post('/api/communications', async (req, res) => {
    try {
      const communicationData = insertCommunicationSchema.parse(req.body);
      const communication = await communicationService.createCommunication(communicationData);
      res.status(201).json(communication);
    } catch (error) {
      console.error("Error creating communication:", error);
      res.status(500).json({ message: "Failed to create communication" });
    }
  });

  // Artifact routes
  app.get('/api/artifacts', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const artifacts = await storage.getRecentArtifacts(limit);
      res.json(artifacts);
    } catch (error) {
      console.error("Error fetching artifacts:", error);
      res.status(500).json({ message: "Failed to fetch artifacts" });
    }
  });

  app.post('/api/artifacts', async (req, res) => {
    try {
      const artifactData = insertArtifactSchema.parse(req.body);
      const artifact = await artifactService.createArtifact(artifactData);
      res.status(201).json(artifact);
    } catch (error) {
      console.error("Error creating artifact:", error);
      res.status(500).json({ message: "Failed to create artifact" });
    }
  });

  // Get all artifact versions for a given task
  app.get('/api/tasks/:taskId/artifacts', async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid taskId" });
      }
      const artifacts = await storage.getArtifactsByTask(taskId);
      res.json(artifacts);
    } catch (error) {
      console.error("Error fetching artifacts by task:", error);
      res.status(500).json({ message: "Failed to fetch artifacts for task" });
    }
  });

  // Health monitoring routes
  app.get('/api/health/events', async (req, res) => {
    try {
      const events = await storage.getUnresolvedHealthEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching health events:", error);
      res.status(500).json({ message: "Failed to fetch health events" });
    }
  });

  // Dashboard metrics
  app.get('/api/metrics', async (req, res) => {
    try {
      const metrics = await agentService.getSystemMetrics();
      
      // Add workflow engine metrics if available
      if (workflowEngine) {
        const workflowStatus = await workflowEngine.getWorkflowStatus();
        metrics.workflowEngine = workflowStatus;
      }
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Advanced AI Agent routes
  // Planner endpoints
  app.get('/api/agents/:id/plan', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      const plan = await plannerService.generatePlan(agent);
      res.json(plan);
    } catch (error) {
      console.error("Error generating plan:", error);
      res.status(500).json({ message: "Failed to generate plan" });
    }
  });

  // Governor endpoints  
  app.get('/api/agents/:id/governance', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      const decisions = await governorService.analyzeAgent(agent);
      res.json(decisions);
    } catch (error) {
      console.error("Error analyzing agent:", error);
      res.status(500).json({ message: "Failed to analyze agent" });
    }
  });

  // Reminder endpoints
  app.get('/api/agents/:id/reminders', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      const reminders = await reminderService.generateRemindersForAgent(agent);
      res.json(reminders);
    } catch (error) {
      console.error("Error generating reminders:", error);
      res.status(500).json({ message: "Failed to generate reminders" });
    }
  });

  // Diagram endpoints
  app.get('/api/diagrams/workflow', async (req, res) => {
    try {
      const diagram = await diagramService.generateWorkflowDiagram();
      res.json({ diagram });
    } catch (error) {
      console.error("Error generating workflow diagram:", error);
      res.status(500).json({ message: "Failed to generate workflow diagram" });
    }
  });

  app.get('/api/diagrams/task/:id', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const diagram = await diagramService.generateTaskFlowDiagram(taskId);
      res.json({ diagram });
    } catch (error) {
      console.error("Error generating task flow diagram:", error);
      res.status(500).json({ message: "Failed to generate task flow diagram" });
    }
  });

  app.get('/api/diagrams/agent-load', async (req, res) => {
    try {
      const diagram = await diagramService.generateAgentLoadDiagram();
      res.json({ diagram });
    } catch (error) {
      console.error("Error generating agent load diagram:", error);
      res.status(500).json({ message: "Failed to generate agent load diagram" });
    }
  });

  // File summarization endpoints
  app.post('/api/files/summarize', async (req, res) => {
    try {
      const { content, filename } = req.body;
      if (!content || !filename) {
        return res.status(400).json({ message: "Content and filename are required" });
      }
      
      const summary = await fileSummarizerService.summarizeFile(content, filename);
      res.json(summary);
    } catch (error) {
      console.error("Error summarizing file:", error);
      res.status(500).json({ message: "Failed to summarize file" });
    }
  });

  // Message routing endpoints
  app.post('/api/messages/parse', async (req, res) => {
    try {
      const { chatText } = req.body;
      if (!chatText) {
        return res.status(400).json({ message: "Chat text is required" });
      }
      
      const messages = await messageRoutingService.parseInterAgentMessages(chatText);
      res.json(messages);
    } catch (error) {
      console.error("Error parsing messages:", error);
      res.status(500).json({ message: "Failed to parse messages" });
    }
  });

  // Agent Chat API
  app.post('/api/agents/:id/chat', async (req: any, res: any) => {
    try {
      const agentId = parseInt(req.params.id);
      const { message, context } = req.body;
      
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Get agent AI service
      const agentAI = new AgentAI(storage);
      
      // Generate AI response based on agent type and context
      const response = await agentAI.generateChatResponse(agent, message, context);
      
      res.json({ response });
    } catch (error) {
      console.error("Error in agent chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // User to agent communication
  app.post('/api/communicate', async (req, res) => {
    try {
      const { message, toAgentId, taskId } = req.body;
      
      const communicationData = {
        fromAgentId: null, // User message
        toAgentId: toAgentId ? parseInt(toAgentId) : null,
        taskId: taskId || null,
        message: message,
        messageType: 'user_message',
        metadata: {
          timestamp: new Date().toISOString(),
          userInitiated: true,
        },
      };
      
      const communication = await communicationService.createCommunication(communicationData);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'communication_created',
            data: communication
          }));
        }
      });

      // Process agent instruction if targeted to a specific agent
      if (toAgentId) {
        const agent = await storage.getAgent(toAgentId);
        if (agent) {
          try {
            // Generate agent response
            const agentAI = new AgentAI(storage);
            const response = await agentAI.generateChatResponse(agent, message, { taskId });
            
            // Create agent response communication
            const agentResponse = await communicationService.createCommunication({
              fromAgentId: agent.id,
              toAgentId: null,
              taskId: taskId || null,
              message: response,
              messageType: 'agent_response',
              metadata: {
                timestamp: new Date().toISOString(),
                responseToMessage: communication.id,
              },
            });

            // Broadcast agent response
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'communication_created',
                  data: agentResponse
                }));
              }
            });
          } catch (error) {
            console.error("Error generating agent response:", error);
          }
        }
      }
      
      res.status(201).json(communication);
    } catch (error) {
      console.error("Error creating communication:", error);
      res.status(500).json({ message: "Failed to create communication" });
    }
  });

  // Agent communication endpoints
  app.post('/api/agents/:agentId/communicate', async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const { message, taskId, messageType } = req.body;
      
      const communicationData = {
        fromAgentId: null, // User message
        toAgentId: agentId,
        taskId: taskId || null,
        message: message,
        messageType: messageType || 'user_message',
        metadata: {
          timestamp: new Date().toISOString(),
          userInitiated: true,
        },
      };
      
      const communication = await communicationService.createCommunication(communicationData);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'communication_created',
            data: communication
          }));
        }
      });
      
      res.status(201).json(communication);
    } catch (error) {
      console.error("Error creating communication:", error);
      res.status(500).json({ message: "Failed to create communication" });
    }
  });

  // Project management endpoints
  app.post("/api/projects", async (req, res) => {
    try {
      if (!projectService) {
        return res.status(500).json({ message: "Project service not available" });
      }
      
      const project = await projectService.createProject(req.body);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.post("/api/projects/auto-create", async (req, res) => {
    try {
      if (!projectService) {
        return res.status(500).json({ message: "Project service not available" });
      }
      
      const project = await projectService.autoCreateProjectFromRequest(req.body);
      res.json(project);
    } catch (error) {
      console.error("Error auto-creating project:", error);
      res.status(500).json({ message: "Failed to auto-create project" });
    }
  });

  app.get("/api/projects/:id/status", async (req, res) => {
    try {
      if (!projectService) {
        return res.status(500).json({ message: "Project service not available" });
      }
      
      const status = await projectService.getProjectStatus(req.params.id);
      res.json(status);
    } catch (error) {
      console.error("Error fetching project status:", error);
      res.status(500).json({ message: "Failed to fetch project status" });
    }
  });

  // Version control endpoints
  app.get("/api/artifacts/:id/versions", async (req, res) => {
    try {
      if (!versionControlService) {
        return res.status(500).json({ message: "Version control service not available" });
      }
      
      const artifactId = parseInt(req.params.id);
      const history = await versionControlService.getVersionHistory(artifactId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching version history:", error);
      res.status(500).json({ message: "Failed to fetch version history" });
    }
  });

  app.post("/api/artifacts/:id/restore", async (req, res) => {
    try {
      if (!versionControlService) {
        return res.status(500).json({ message: "Version control service not available" });
      }
      
      const artifactId = parseInt(req.params.id);
      const { version } = req.body;
      const success = await versionControlService.restoreArtifactVersion(artifactId, version);
      
      if (success) {
        res.json({ message: "Version restored successfully" });
      } else {
        res.status(400).json({ message: "Failed to restore version" });
      }
    } catch (error) {
      console.error("Error restoring version:", error);
      res.status(500).json({ message: "Failed to restore version" });
    }
  });

  // Workflow control endpoints
  app.post("/api/workflow/pause-task", async (req, res) => {
    try {
      if (!workflowEngine) {
        return res.status(500).json({ message: "Workflow engine not available" });
      }
      
      const { taskId } = req.body;
      await workflowEngine.pauseTask(taskId);
      res.json({ message: "Task paused successfully" });
    } catch (error) {
      console.error("Error pausing task:", error);
      res.status(500).json({ message: "Failed to pause task" });
    }
  });

  app.post("/api/workflow/resume-task", async (req, res) => {
    try {
      if (!workflowEngine) {
        return res.status(500).json({ message: "Workflow engine not available" });
      }
      
      const { taskId } = req.body;
      await workflowEngine.resumeTask(taskId);
      res.json({ message: "Task resumed successfully" });
    } catch (error) {
      console.error("Error resuming task:", error);
      res.status(500).json({ message: "Failed to resume task" });
    }
  });

  app.get("/api/workflow/status", async (req, res) => {
    try {
      if (!workflowEngine) {
        return res.status(500).json({ message: "Workflow engine not available" });
      }
      
      const status = await workflowEngine.getWorkflowStatus();
      res.json(status);
    } catch (error) {
      console.error("Error testing workflow:", error);
      res.status(500).json({ message: "Failed to test workflow" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  taskService.setWebSocketServer(wss);

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('Received message:', data);
        
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // Handle subscription to real-time updates
            break;
          case 'task_update':
            // Handle task updates
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });

    // Send initial data
    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to AgentFlow' }));
  });

  // Start health monitoring
  healthService.startMonitoring();

  // Start email service
  emailService.startProcessing();

  // Start advanced AI services
  reminderService.startReminderService();
  console.log("Reminder service started");
  
  governorService.startGovernorService();
  console.log("Governor service started");


  // --- Start agent daemons (autonomous agents) ---
  // --- Zara proactive governance: monitor agents and intervene if needed ---
  setInterval(async () => {
    try {
      // Example: Zara checks for stuck or failed agents/tasks
      const allTasks = await storage.getTasks();
      const stuckTasks = allTasks.filter((t: any) => t.status === 'stuck' || t.status === 'error');
      for (const task of stuckTasks) {
        // Zara reassigns or escalates the task
        if (typeof governorService.handleStuckTask === 'function') {
          await governorService.handleStuckTask(task);
        } else {
          // Fallback: mark as escalated and log
          await storage.updateTask(task.id, { status: 'escalated' });
          console.log(`Zara escalated task ${task.id}`);
        }
      }
// --- GovernorService: add stub for handleStuckTask if missing ---
if (typeof (governorService as any).handleStuckTask !== 'function') {
  (governorService as any).handleStuckTask = async function(task: any) {
    // Default stub: just mark as escalated
    await storage.updateTask(task.id, { status: 'escalated' });
    console.log(`[GovernorService] Escalated stuck task ${task.id}`);
  };
}
    } catch (err) {
      console.error("Zara proactive governance error:", err);
    }
  }, 20000); // Every 20s
  // The agent workflow can be driven in two ways:
  // 1. Default hardcoded agent handoff sequence (Sam → Bailey → Dex → Tess → Ollie → Sienna → Aria → Nova → Emi → Zara):
  //    Each agent is responsible for a specific stage of the software development lifecycle and, upon completing their stage, hands off to the next agent by sending an agent-to-agent message and updating the task's workflow stage.
  // 2. Dynamic, document-driven workflow: The agent handoff sequence and logic can be parsed from an external project instruction document (see attached_assets/ for examples).
  //    If a project/task specifies a workflow document, agents will parse and follow the agent sequence and rules defined in that document, enabling explainable, dynamic, and externally-guided agent collaboration for software development.
  //
  // NOTE: Each agent daemon supports both default and document-driven workflow handoff. This enables the system to adapt to custom or evolving workflows specified by project stakeholders, or to use the default sequence if no document is provided.

  // ✨ PHASE 1 COMPLETE: AI-POWERED COGNITIVE AGENTS
  // Legacy agent daemons replaced with intelligent workflow engine
  // All agent decision-making now powered by OpenAI GPT-4o cognitive system
  console.log("✨ AI-powered cognitive agents active - Phase 1 complete!");

  // --- Autonomous Task Initiation: Agents propose/initiate/assign tasks without user input ---
  setInterval(async () => {
    try {
      // Example: Each agent has a small chance to propose a new task
      const agents = await storage.getAgents();
      for (const agent of agents) {
        if (Math.random() < 0.05) { // 5% chance per interval
          const personality = await getAgentPersonality(agent.id);
          const title = `Autonomous Task by ${agent.name}`;
          const description = `A new task initiated by ${agent.name} (${personality.traits.join(", ")})`;
          const tags = [agent.type, ...personality.expertise];
          const priority = 'medium';
          // Propose the task
          const taskData = {
            title,
            description,
            status: "pending",
            assignedToId: null,
            createdById: null, // Set to null since agents aren't users
            tags,
            priority,
            workflow: {
              stage: "requirements",
              history: [],
              nextAgent: "product_manager"
            }
          };
          const newTask = await taskService.createTask(taskData);
          await agentLearnFromOutcome(agent.id, newTask.id, "initiated autonomous task");
          // Optionally, negotiate assignment among agents
          const agentIds = agents.map(a => a.id);
          await negotiateTaskAssignment(agentIds, newTask.id);
          // Broadcast to WebSocket clients
          if (typeof wss !== 'undefined') {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'task_created',
                  data: newTask
                }));
              }
            });
          }
        }
      }
    } catch (err) {
      console.error("Autonomous agent task initiation error:", err);
    }
  }, 30000); // Every 30s

  // ---
  // NOTE: Each agent daemon supports both default and document-driven workflow handoff.
  // If a task/project specifies a workflow document (e.g., in attached_assets/),
  // agents will parse and follow the agent sequence and rules from that document.
  // Otherwise, the default hardcoded sequence is used.
  // This enables explainable, dynamic, and externally-guided agent collaboration for software development.

  // Agent explainability: get action log (thoughts + actions, with filtering, summarization, and causal explanations)
  app.get('/api/agents/:id/explain', async (req: any, res: any) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) {
        return res.status(400).json({ message: "Invalid agentId" });
      }

      // Use the already-instantiated agentMemoryService
      let log = await agentMemoryService.getAgentMemory(agentId);

      // --- Filtering ---
      // ?type=thought|action|all, ?since=timestamp, ?until=timestamp
      const { type, since, until, summary } = req.query;
      if (type && type !== 'all') {
        log = log.filter((entry: any) => entry.type === type);
      }
      if (since) {
        const sinceTime = new Date(since as string).getTime();
        log = log.filter((entry: any) => new Date(entry.timestamp).getTime() >= sinceTime);
      }
      if (until) {
        const untilTime = new Date(until as string).getTime();
        log = log.filter((entry: any) => new Date(entry.timestamp).getTime() <= untilTime);
      }

      // --- Summarization ---
      let summaryText = undefined;
      if (summary === 'true') {
        // Simple summary: count types and most recent action
        const typeCounts = log.reduce((acc: any, entry: any) => {
          acc[entry.type] = (acc[entry.type] || 0) + 1;
          return acc;
        }, {});
        const lastAction = log.filter((e: any) => e.type === 'action').slice(-1)[0];
        summaryText = {
          totalEntries: log.length,
          typeCounts,
          lastAction: lastAction ? lastAction.description || lastAction.content : null
        };
      }

      // --- Causal Explanation ---
      // For now, show a simple causal chain: for each action, what thought or event led to it
      const causalChain = log
        .filter((entry: any) => entry.type === 'action')
        .map((action: any) => {
          // Find the most recent thought or event before this action
          const prior = log
            .filter((e: any) => e.timestamp < action.timestamp && (e.type === 'thought' || e.type === 'event'))
            .slice(-1)[0];
          return {
            action: action.description || action.content,
            causedBy: prior ? (prior.description || prior.content) : null,
            actionTime: action.timestamp,
            causeTime: prior ? prior.timestamp : null
          };
        });

      res.json({
        log,
        summary: summaryText,
        causalChain
      });
    } catch (error) {
      console.error("Error fetching agent explainability log:", error);
      res.status(500).json({ message: "Failed to fetch agent explainability log" });
    }
  });

  // --- Admin Settings (in-memory, admin-only; add auth later) ---
  const adminSettings = {
    teamsIntegrationEnabled: true, // If false, agents cannot send messages to Microsoft Teams
    agentChatOnTaskCompleteEnabled: true // If true, agents respond via chat on task complete (if user online), else fallback to email
  };

  // GET admin settings (admin-only; add auth later)
  app.get('/api/admin/settings', (req: any, res: any) => {
    // TODO: Add admin authentication/authorization
    res.json(adminSettings);
  });

  // Advanced AI Services API Endpoints (Phase 2-5)
  
  // Agent Memory Service endpoints
  app.get('/api/agents/:id/memory', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const memory = await agentMemoryService.getAgentMemory(agentId);
      res.json(memory);
    } catch (error) {
      console.error('Error fetching agent memory:', error);
      res.status(500).json({ message: 'Failed to fetch agent memory' });
    }
  });

  app.get('/api/agents/:id/insights', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const insights = await agentMemoryService.getAgentInsights(agentId);
      res.json(insights);
    } catch (error) {
      console.error('Error fetching agent insights:', error);
      res.status(500).json({ message: 'Failed to fetch agent insights' });
    }
  });

  app.post('/api/agents/:id/reflect', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const reflection = await agentMemoryService.reflectOnPerformance(agentId);
      res.json(reflection);
    } catch (error) {
      console.error('Error reflecting on performance:', error);
      res.status(500).json({ message: 'Failed to reflect on performance' });
    }
  });

  // Artifact Engine endpoints
  app.post('/api/artifacts/generate', async (req, res) => {
    try {
      const { taskId, agentId, artifactType, context } = req.body;
      const artifact = await artifactEngine.generateArtifact(taskId, agentId, artifactType, context);
      res.json({ content: artifact });
    } catch (error) {
      console.error('Error generating artifact:', error);
      res.status(500).json({ message: 'Failed to generate artifact' });
    }
  });

  app.post('/api/artifacts/:id/refine', async (req, res) => {
    try {
      const artifactId = parseInt(req.params.id);
      const { feedback, agentId } = req.body;
      const refinedArtifact = await artifactEngine.refineArtifact(artifactId, feedback, agentId);
      res.json({ content: refinedArtifact });
    } catch (error) {
      console.error('Error refining artifact:', error);
      res.status(500).json({ message: 'Failed to refine artifact' });
    }
  });

  app.get('/api/artifacts/templates', async (req, res) => {
    try {
      const templates = artifactEngine.getAvailableTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching artifact templates:', error);
      res.status(500).json({ message: 'Failed to fetch artifact templates' });
    }
  });

  // Collaboration Engine endpoints
  app.post('/api/collaborate/initiate', async (req, res) => {
    try {
      const { taskId, initiatorId, collaborationType, context } = req.body;
      const collaborationId = await collaborationEngine.initiateCollaboration(taskId, initiatorId, collaborationType, context);
      res.json({ collaborationId });
    } catch (error) {
      console.error('Error initiating collaboration:', error);
      res.status(500).json({ message: 'Failed to initiate collaboration' });
    }
  });

  app.post('/api/collaborate/:id/respond', async (req, res) => {
    try {
      const collaborationId = req.params.id;
      const { agentId, response, details } = req.body;
      await collaborationEngine.handleCollaborationResponse(collaborationId, agentId, response, details);
      res.json({ message: 'Collaboration response processed' });
    } catch (error) {
      console.error('Error handling collaboration response:', error);
      res.status(500).json({ message: 'Failed to process collaboration response' });
    }
  });

  app.get('/api/collaborate/active', async (req, res) => {
    try {
      const activeCollaborations = Array.from(collaborationEngine.getActiveCollaborations().entries());
      res.json(activeCollaborations);
    } catch (error) {
      console.error('Error fetching active collaborations:', error);
      res.status(500).json({ message: 'Failed to fetch active collaborations' });
    }
  });

  // Continuous Learning Engine endpoints
  app.get('/api/learning/patterns', async (req, res) => {
    try {
      const patterns = continuousLearningEngine.getLearningPatterns();
      res.json(patterns);
    } catch (error) {
      console.error('Error fetching learning patterns:', error);
      res.status(500).json({ message: 'Failed to fetch learning patterns' });
    }
  });

  app.get('/api/learning/adaptations', async (req, res) => {
    try {
      const adaptations = Array.from(continuousLearningEngine.getAdaptationStrategies().entries());
      res.json(adaptations);
    } catch (error) {
      console.error('Error fetching adaptation strategies:', error);
      res.status(500).json({ message: 'Failed to fetch adaptation strategies' });
    }
  });

  app.get('/api/learning/insights', async (req, res) => {
    try {
      const insights = await continuousLearningEngine.generateSystemInsights();
      res.json(insights);
    } catch (error) {
      console.error('Error generating system insights:', error);
      res.status(500).json({ message: 'Failed to generate system insights' });
    }
  });

  // POST admin settings (admin-only; add auth later)
  app.post('/api/admin/settings', (req: any, res: any) => {
    // TODO: Add admin authentication/authorization
    const { teamsIntegrationEnabled, agentChatOnTaskCompleteEnabled } = req.body;
    if (typeof teamsIntegrationEnabled === 'boolean') {
      adminSettings.teamsIntegrationEnabled = teamsIntegrationEnabled;
    }
    if (typeof agentChatOnTaskCompleteEnabled === 'boolean') {
      adminSettings.agentChatOnTaskCompleteEnabled = agentChatOnTaskCompleteEnabled;
    }
    res.json(adminSettings);
  });

  // --- Utility functions for agent/notification logic ---
  function isTeamsIntegrationEnabled() {
    return adminSettings.teamsIntegrationEnabled;
  }
  function isAgentChatOnTaskCompleteEnabled() {
    return adminSettings.agentChatOnTaskCompleteEnabled;
  }

  // Usage example (add these checks in your agent/notification logic):
  // if (isTeamsIntegrationEnabled()) {
  //   // Send message to Microsoft Teams
  // }
  // if (isAgentChatOnTaskCompleteEnabled()) {
  //   // Respond to user via chat if online
  // } else {
  //   // Fallback: send to user email
  // }

  // --- Example: Hook into task processing to update/emit progress ---
// (You should call updateAndEmitTaskProgress at key points in your agent/task logic)
// Example usage after a task is processed:
// updateAndEmitTaskProgress(taskId, {
//   percent: 65,
//   stage: "Tess is generating test cases from Bailey's user stories",
//   agents: ["Bailey", "Tess"],
//   blockers: ["Waiting for user confirmation on edge cases"]
// });

  return httpServer;
}
