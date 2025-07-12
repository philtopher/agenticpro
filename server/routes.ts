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
  const emailService = new EmailService();

  // Auth middleware
  await setupAuth(app);

  // Initialize agents on startup
  await agentService.initializeAgents();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Agent routes
  app.get('/api/agents', isAuthenticated, async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get('/api/agents/:id', isAuthenticated, async (req, res) => {
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
  app.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskData = insertTaskSchema.parse({
        ...req.body,
        createdById: userId,
      });
      
      const task = await taskService.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/tasks/:id/assign', isAuthenticated, async (req, res) => {
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
  app.get('/api/communications', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const communications = await storage.getRecentCommunications(limit);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  app.post('/api/communications', isAuthenticated, async (req, res) => {
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
  app.get('/api/artifacts', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const artifacts = await storage.getRecentArtifacts(limit);
      res.json(artifacts);
    } catch (error) {
      console.error("Error fetching artifacts:", error);
      res.status(500).json({ message: "Failed to fetch artifacts" });
    }
  });

  app.post('/api/artifacts', isAuthenticated, async (req, res) => {
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
  app.get('/api/health/events', isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getUnresolvedHealthEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching health events:", error);
      res.status(500).json({ message: "Failed to fetch health events" });
    }
  });

  // Dashboard metrics
  app.get('/api/metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await agentService.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
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
