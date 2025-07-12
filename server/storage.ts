import {
  users,
  agents,
  tasks,
  communications,
  artifacts,
  healthEvents,
  notifications,
  type User,
  type UpsertUser,
  type Agent,
  type InsertAgent,
  type Task,
  type InsertTask,
  type Communication,
  type InsertCommunication,
  type Artifact,
  type InsertArtifact,
  type HealthEvent,
  type InsertHealthEvent,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Agent operations
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  getAgentByType(type: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, updates: Partial<Agent>): Promise<Agent>;
  updateAgentStatus(id: number, status: string): Promise<void>;
  updateAgentHealth(id: number, healthScore: number): Promise<void>;
  
  // Task operations
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByAgent(agentId: number): Promise<Task[]>;
  getTasksByStatus(status: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task>;
  assignTask(taskId: number, agentId: number): Promise<void>;
  
  // Communication operations
  getCommunications(): Promise<Communication[]>;
  getCommunicationsByTask(taskId: number): Promise<Communication[]>;
  getRecentCommunications(limit: number): Promise<Communication[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  
  // Artifact operations
  getArtifacts(): Promise<Artifact[]>;
  getArtifactsByTask(taskId: number): Promise<Artifact[]>;
  getRecentArtifacts(limit: number): Promise<Artifact[]>;
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
  updateArtifact(id: number, updates: Partial<Artifact>): Promise<Artifact>;
  
  // Health monitoring operations
  getHealthEvents(): Promise<HealthEvent[]>;
  getHealthEventsByAgent(agentId: number): Promise<HealthEvent[]>;
  getUnresolvedHealthEvents(): Promise<HealthEvent[]>;
  createHealthEvent(event: InsertHealthEvent): Promise<HealthEvent>;
  resolveHealthEvent(id: number): Promise<void>;
  
  // Notification operations
  getNotifications(): Promise<Notification[]>;
  getUnsentNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationSent(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Agent operations
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(agents.type);
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async getAgentByType(type: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.type, type));
    return agent;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [newAgent] = await db.insert(agents).values(agent).returning();
    return newAgent;
  }

  async updateAgent(id: number, updates: Partial<Agent>): Promise<Agent> {
    const [updatedAgent] = await db
      .update(agents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();
    return updatedAgent;
  }

  async updateAgentStatus(id: number, status: string): Promise<void> {
    await db
      .update(agents)
      .set({ status, lastActivity: new Date(), updatedAt: new Date() })
      .where(eq(agents.id, id));
  }

  async updateAgentHealth(id: number, healthScore: number): Promise<void> {
    await db
      .update(agents)
      .set({ healthScore, lastActivity: new Date(), updatedAt: new Date() })
      .where(eq(agents.id, id));
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt)) as Task[];
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)) as Task[];
    return task || undefined;
  }

  async getTasksByAgent(agentId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedToId, agentId))
      .orderBy(desc(tasks.createdAt)) as Task[];
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.status, status))
      .orderBy(desc(tasks.createdAt)) as Task[];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const taskData = {
      ...task,
      workflow: task.workflow || { stage: "requirements", nextAgent: "product_manager", history: [] },
      tags: task.tags || []
    };
    const [newTask] = await db.insert(tasks).values(taskData).returning() as Task[];
    return newTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning() as Task[];
    return updatedTask;
  }

  async assignTask(taskId: number, agentId: number): Promise<void> {
    await db
      .update(tasks)
      .set({ assignedToId: agentId, status: "in_progress", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  }

  // Communication operations
  async getCommunications(): Promise<Communication[]> {
    return await db.select().from(communications).orderBy(desc(communications.createdAt));
  }

  async getCommunicationsByTask(taskId: number): Promise<Communication[]> {
    return await db
      .select()
      .from(communications)
      .where(eq(communications.taskId, taskId))
      .orderBy(desc(communications.createdAt));
  }

  async getRecentCommunications(limit: number): Promise<Communication[]> {
    return await db
      .select()
      .from(communications)
      .orderBy(desc(communications.createdAt))
      .limit(limit);
  }

  async createCommunication(communication: InsertCommunication): Promise<Communication> {
    const [newCommunication] = await db.insert(communications).values(communication).returning();
    return newCommunication;
  }

  // Artifact operations
  async getArtifacts(): Promise<Artifact[]> {
    return await db.select().from(artifacts).orderBy(desc(artifacts.createdAt));
  }

  async getArtifactsByTask(taskId: number): Promise<Artifact[]> {
    return await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.taskId, taskId))
      .orderBy(desc(artifacts.createdAt));
  }

  async getRecentArtifacts(limit: number): Promise<Artifact[]> {
    return await db
      .select()
      .from(artifacts)
      .orderBy(desc(artifacts.createdAt))
      .limit(limit);
  }

  async createArtifact(artifact: InsertArtifact): Promise<Artifact> {
    const [newArtifact] = await db.insert(artifacts).values(artifact).returning();
    return newArtifact;
  }

  async updateArtifact(id: number, updates: Partial<Artifact>): Promise<Artifact> {
    const [updatedArtifact] = await db
      .update(artifacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(artifacts.id, id))
      .returning();
    return updatedArtifact;
  }

  // Health monitoring operations
  async getHealthEvents(): Promise<HealthEvent[]> {
    return await db.select().from(healthEvents).orderBy(desc(healthEvents.createdAt));
  }

  async getHealthEventsByAgent(agentId: number): Promise<HealthEvent[]> {
    return await db
      .select()
      .from(healthEvents)
      .where(eq(healthEvents.agentId, agentId))
      .orderBy(desc(healthEvents.createdAt));
  }

  async getUnresolvedHealthEvents(): Promise<HealthEvent[]> {
    return await db
      .select()
      .from(healthEvents)
      .where(eq(healthEvents.resolved, false))
      .orderBy(desc(healthEvents.createdAt));
  }

  async createHealthEvent(event: InsertHealthEvent): Promise<HealthEvent> {
    const [newEvent] = await db.insert(healthEvents).values(event).returning();
    return newEvent;
  }

  async resolveHealthEvent(id: number): Promise<void> {
    await db
      .update(healthEvents)
      .set({ resolved: true, resolvedAt: new Date() })
      .where(eq(healthEvents.id, id));
  }

  // Notification operations
  async getNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async getUnsentNotifications(): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.sent, false))
      .orderBy(notifications.createdAt);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationSent(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ sent: true, sentAt: new Date() })
      .where(eq(notifications.id, id));
  }
}

export const storage = new DatabaseStorage();
