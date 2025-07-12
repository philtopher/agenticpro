import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { AgentService } from "./services/agentService";
import { TaskService } from "./services/taskService";
import { CommunicationService } from "./services/communicationService";
import { ArtifactService } from "./services/artifactService";
import { HealthService } from "./services/healthService";
import { EmailService } from "./services/emailService";
import { insertTaskSchema, insertCommunicationSchema, insertArtifactSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  const agentService = new AgentService(storage);
  const taskService = new TaskService(storage);
  const communicationService = new CommunicationService(storage);
  const artifactService = new ArtifactService(storage);
  const healthService = new HealthService(storage);
  const emailService = new EmailService(storage);

  // Initialize agents on startup
  await agentService.initializeAgents();

  // Agent routes
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
      const taskData = insertTaskSchema.parse({
        ...req.body,
        createdById: "system", // Default to system user when no auth
      });
      
      const task = await taskService.createTask(taskData);
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
      
      const task = await taskService.updateTask(taskId, updates);
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
      
      await taskService.assignTask(taskId, agentId);
      res.json({ message: "Task assigned successfully" });
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ message: "Failed to assign task" });
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
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
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

  // Test agent workflow functionality
  app.post('/api/test/workflow', async (req, res) => {
    try {
      const { projectType, methodology } = req.body;
      
      // Create a test project
      const projectData = {
        title: `Test ${projectType} Project`,
        description: `Testing multi-agent workflow for ${projectType} development using ${methodology} methodology`,
        status: "pending",
        priority: "medium",
        assignedToId: null,
        workflow: {
          type: methodology,
          currentStage: "requirements",
          stages: methodology === "agile" 
            ? ["requirements", "planning", "development", "testing", "review", "deployment"]
            : methodology === "kanban"
            ? ["backlog", "to_do", "in_progress", "testing", "done"]
            : ["requirements", "design", "development", "testing", "deployment"],
          projectType: projectType,
        },
        requirements: [`Test requirement for ${projectType}`],
        acceptanceCriteria: [`Test acceptance criteria for ${projectType}`],
        estimatedHours: 40,
        tags: [projectType, methodology, "test"],
      };
      
      const project = await taskService.createTask(projectData);
      
      // Trigger agent workflow
      await taskService.progressWorkflow(project);
      
      res.json({ project, message: "Test workflow initiated" });
    } catch (error) {
      console.error("Error testing workflow:", error);
      res.status(500).json({ message: "Failed to test workflow" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

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

  return httpServer;
}
