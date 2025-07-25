import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Agent definitions
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  type: varchar("type").notNull(), // 'product_manager', 'business_analyst', 'developer', 'qa_engineer', 'product_owner', 'engineering_lead'
  name: varchar("name").notNull(),
  status: varchar("status").notNull().default("active"), // 'active', 'busy', 'unhealthy', 'offline'
  capabilities: jsonb("capabilities").notNull(),
  currentLoad: integer("current_load").notNull().default(0),
  maxLoad: integer("max_load").notNull().default(5),
  lastActivity: timestamp("last_activity").defaultNow(),
  healthScore: integer("health_score").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks and workflows
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  status: varchar("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'failed', 'escalated'
  priority: varchar("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'urgent'
  assignedToId: integer("assigned_to_id").references(() => agents.id),
  createdById: varchar("created_by_id").references(() => users.id),
  parentTaskId: integer("parent_task_id"),
  workflow: jsonb("workflow").notNull(), // workflow state and progression
  requirements: jsonb("requirements"),
  acceptanceCriteria: jsonb("acceptance_criteria"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Communication logs between agents
export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  fromAgentId: integer("from_agent_id").references(() => agents.id),
  toAgentId: integer("to_agent_id").references(() => agents.id),
  taskId: integer("task_id").references(() => tasks.id),
  message: text("message").notNull(),
  messageType: varchar("message_type").notNull(), // 'handoff', 'clarification', 'escalation', 'approval', 'rejection'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Artifacts generated by agents
export const artifacts = pgTable("artifacts", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // 'code', 'specification', 'test_case', 'documentation', 'report'
  content: jsonb("content").notNull(),
  taskId: integer("task_id").references(() => tasks.id),
  createdById: integer("created_by_id").references(() => agents.id),
  version: integer("version").notNull().default(1),
  status: varchar("status").notNull().default("draft"), // 'draft', 'review', 'approved', 'archived'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Health monitoring and escalations
export const healthEvents = pgTable("health_events", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id),
  eventType: varchar("event_type").notNull(), // 'performance_degradation', 'timeout', 'error', 'recovery'
  severity: varchar("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  details: jsonb("details").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Email notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientId: varchar("recipient_id").references(() => users.id),
  type: varchar("type").notNull(), // 'agent_health', 'task_escalation', 'workflow_completion'
  subject: varchar("subject").notNull(),
  message: text("message").notNull(),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Agent persistent memory table
export const agentMemories = pgTable("agent_memories", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id),
  memory: text("memory").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const agentRelations = relations(agents, ({ many }) => ({
  assignedTasks: many(tasks),
  sentCommunications: many(communications, { relationName: "sentComms" }),
  receivedCommunications: many(communications, { relationName: "receivedComms" }),
  createdArtifacts: many(artifacts),
  healthEvents: many(healthEvents),
  memories: many(agentMemories),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  assignedTo: one(agents, { fields: [tasks.assignedToId], references: [agents.id] }),
  createdBy: one(users, { fields: [tasks.createdById], references: [users.id] }),
  parentTask: one(tasks, { fields: [tasks.parentTaskId], references: [tasks.id] }),
  subtasks: many(tasks),
  communications: many(communications),
  artifacts: many(artifacts),
}));

export const communicationRelations = relations(communications, ({ one }) => ({
  fromAgent: one(agents, { fields: [communications.fromAgentId], references: [agents.id], relationName: "sentComms" }),
  toAgent: one(agents, { fields: [communications.toAgentId], references: [agents.id], relationName: "receivedComms" }),
  task: one(tasks, { fields: [communications.taskId], references: [tasks.id] }),
}));

export const artifactRelations = relations(artifacts, ({ one }) => ({
  task: one(tasks, { fields: [artifacts.taskId], references: [tasks.id] }),
  createdBy: one(agents, { fields: [artifacts.createdById], references: [agents.id] }),
}));

export const healthEventRelations = relations(healthEvents, ({ one }) => ({
  agent: one(agents, { fields: [healthEvents.agentId], references: [agents.id] }),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, { fields: [notifications.recipientId], references: [users.id] }),
}));

export const memoryRelations = relations(agentMemories, ({ one }) => ({
  agent: one(agents, { fields: [agentMemories.agentId], references: [agents.id] }),
}));

// Insert schemas
export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  workflow: z.any().optional(),
  assignedToId: z.union([z.number(), z.string().transform(val => parseInt(val))]).optional().nullable(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional()
});
export const insertCommunicationSchema = createInsertSchema(communications).omit({ id: true, createdAt: true });
export const insertArtifactSchema = createInsertSchema(artifacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHealthEventSchema = createInsertSchema(healthEvents).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertMemorySchema = createInsertSchema(agentMemories).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Artifact = typeof artifacts.$inferSelect;
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type HealthEvent = typeof healthEvents.$inferSelect;
export type InsertHealthEvent = z.infer<typeof insertHealthEventSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Memory = typeof agentMemories.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
