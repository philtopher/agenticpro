import { IStorage, Notification } from "@shared/schema";
import nodemailer from 'nodemailer';

export class EmailService {
  private processingInterval: NodeJS.Timeout | null = null;
  private transporter: nodemailer.Transporter;

  constructor(private storage: IStorage) {
    // Configure nodemailer transporter
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // or your preferred email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

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
    try {
      // Get all notifications and filter unsent ones
      const notifications = await this.storage.getNotifications();
      const unsentNotifications = notifications.filter(n => !n.sent);
      
      for (const notification of unsentNotifications) {
        try {
          await this.sendEmail(notification);
          await this.storage.markNotificationSent(notification.id);
        } catch (error) {
          console.error(`Failed to send notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing notifications:', error);
    }
  }

  private async sendEmail(notification: Notification): Promise<void> {
    try {
      // Check if email credentials are configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[EMAIL] Notification logged (no credentials): ${notification.subject}`);
        return;
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: notification.recipientId,
        subject: notification.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">AgentFlow System Notification</h2>
            <p>${notification.message}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated notification from your AgentFlow system.
              <br>Time: ${new Date().toLocaleString()}
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Sent successfully: ${notification.subject}`);
    } catch (error) {
      console.error(`[EMAIL] Failed to send: ${error.message}`);
      // Log the notification instead of failing
      console.log(`[EMAIL] Notification logged: ${notification.subject}`);
    }
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
