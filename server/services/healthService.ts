import { IStorage, HealthEvent, InsertHealthEvent } from "@shared/schema";

export class HealthService {
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(private storage: IStorage) {}

  startMonitoring(): void {
    // Monitor agent health every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.checkAgentHealth();
    }, 5 * 60 * 1000);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async checkAgentHealth(): Promise<void> {
    const agents = await this.storage.getAgents();
    
    for (const agent of agents) {
      await this.evaluateAgentHealth(agent);
    }
  }

  private async evaluateAgentHealth(agent: any): Promise<void> {
    const now = new Date();
    const lastActivity = new Date(agent.lastActivity);
    const inactiveMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    
    // Check for inactivity
    if (inactiveMinutes > 30 && agent.status === "active") {
      await this.createHealthEvent({
        agentId: agent.id,
        eventType: "timeout",
        severity: "medium",
        details: {
          inactiveMinutes,
          lastActivity: agent.lastActivity
        }
      });
      
      // Update agent status
      await this.storage.updateAgentStatus(agent.id, "unhealthy");
    }

    // Check for high load
    if (agent.currentLoad >= agent.maxLoad) {
      await this.createHealthEvent({
        agentId: agent.id,
        eventType: "performance_degradation",
        severity: "high",
        details: {
          currentLoad: agent.currentLoad,
          maxLoad: agent.maxLoad,
          reason: "Agent at maximum capacity"
        }
      });
    }

    // Check for repeated failures
    const recentTasks = await this.storage.getTasksByAgent(agent.id);
    const failedTasks = recentTasks.filter(t => t.status === "failed").length;
    
    if (failedTasks > 3) {
      await this.createHealthEvent({
        agentId: agent.id,
        eventType: "error",
        severity: "critical",
        details: {
          failedTasks,
          reason: "Multiple task failures detected"
        }
      });
      
      // Mark agent as unhealthy
      await this.storage.updateAgentHealth(agent.id, 25);
      await this.storage.updateAgentStatus(agent.id, "unhealthy");
    }
  }

  async createHealthEvent(eventData: InsertHealthEvent): Promise<HealthEvent> {
    const event = await this.storage.createHealthEvent(eventData);
    
    // Create notification for admin if severity is high or critical
    if (event.severity === "high" || event.severity === "critical") {
      await this.storage.createNotification({
        recipientId: "admin", // This would be the admin user ID
        type: "agent_health",
        subject: `Agent Health Alert: ${event.severity.toUpperCase()}`,
        message: `Agent ${event.agentId} has a ${event.severity} health issue: ${event.eventType}`,
        sent: false
      });
    }
    
    return event;
  }

  async resolveHealthEvent(eventId: number): Promise<void> {
    await this.storage.resolveHealthEvent(eventId);
  }

  async getAgentHealthSummary(): Promise<any> {
    const agents = await this.storage.getAgents();
    const healthEvents = await this.storage.getUnresolvedHealthEvents();
    
    return {
      totalAgents: agents.length,
      healthyAgents: agents.filter(a => a.status === "active").length,
      unhealthyAgents: agents.filter(a => a.status === "unhealthy").length,
      busyAgents: agents.filter(a => a.status === "busy").length,
      criticalEvents: healthEvents.filter(e => e.severity === "critical").length,
      highSeverityEvents: healthEvents.filter(e => e.severity === "high").length
    };
  }
}
