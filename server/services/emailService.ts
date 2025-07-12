import { IStorage, Notification } from "@shared/schema";

export class EmailService {
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(private storage: IStorage) {}

  startProcessing(): void {
    // Process email notifications every 2 minutes
    this.processingInterval = setInterval(async () => {
      await this.processNotifications();
    }, 2 * 60 * 1000);
  }

  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async processNotifications(): Promise<void> {
    const unsentNotifications = await this.storage.getUnsentNotifications();
    
    for (const notification of unsentNotifications) {
      try {
        await this.sendEmail(notification);
        await this.storage.markNotificationSent(notification.id);
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error);
      }
    }
  }

  private async sendEmail(notification: Notification): Promise<void> {
    // In a real implementation, this would use a service like nodemailer
    // For now, we'll just log the email
    console.log(`[EMAIL] To: ${notification.recipientId}`);
    console.log(`[EMAIL] Subject: ${notification.subject}`);
    console.log(`[EMAIL] Message: ${notification.message}`);
    console.log(`[EMAIL] Sent at: ${new Date()}`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async createAgentHealthNotification(agentId: number, severity: string, details: any): Promise<void> {
    await this.storage.createNotification({
      recipientId: "admin",
      type: "agent_health",
      subject: `Agent Health Alert: ${severity.toUpperCase()}`,
      message: `Agent ${agentId} has encountered a ${severity} health issue. Details: ${JSON.stringify(details)}`,
      sent: false
    });
  }

  async createTaskEscalationNotification(taskId: number, reason: string): Promise<void> {
    await this.storage.createNotification({
      recipientId: "admin",
      type: "task_escalation",
      subject: "Task Escalation Alert",
      message: `Task ${taskId} has been escalated. Reason: ${reason}`,
      sent: false
    });
  }

  async createWorkflowCompletionNotification(taskId: number, title: string): Promise<void> {
    await this.storage.createNotification({
      recipientId: "admin",
      type: "workflow_completion",
      subject: "Workflow Completed",
      message: `Workflow for task "${title}" (ID: ${taskId}) has been completed successfully.`,
      sent: false
    });
  }
}
