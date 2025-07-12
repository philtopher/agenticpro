import { Agent, Task, Notification } from "@shared/schema";
import { IStorage } from "../storage";
import { AGENT_PROMPTS } from "./agentAI";

export interface ReminderAction {
  to: string;
  taskId: string;
  message: string;
  sendAt: string;
}

export class ReminderService {
  private reminderInterval: NodeJS.Timeout | null = null;

  constructor(private storage: IStorage) {}

  startReminderService(): void {
    if (this.reminderInterval) return;

    // Check for reminders every 5 minutes
    this.reminderInterval = setInterval(async () => {
      await this.processReminders();
    }, 5 * 60 * 1000);
  }

  stopReminderService(): void {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
  }

  private async processReminders(): Promise<void> {
    try {
      const agents = await this.storage.getAgents();
      
      for (const agent of agents) {
        await this.generateRemindersForAgent(agent);
      }
    } catch (error) {
      console.error('Error processing reminders:', error);
    }
  }

  async generateRemindersForAgent(agent: Agent): Promise<ReminderAction[]> {
    const prompt = AGENT_PROMPTS[agent.type];
    if (!prompt) {
      return [];
    }

    // Get agent's tasks
    const tasks = await this.storage.getTasksByAgent(agent.id);
    
    // Get recent reminder history
    const recentNotifications = await this.storage.getNotifications();
    const recentReminders = recentNotifications.filter(notif => 
      notif.type === 'reminder' && 
      notif.createdAt > new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
    );
    
    // Generate reminders using AI prompt
    const reminders = await this.simulateReminderDecision(
      agent, 
      tasks, 
      recentReminders, 
      prompt.reminderPrompt
    );
    
    // Send reminders
    for (const reminder of reminders) {
      await this.sendReminder(reminder);
    }
    
    return reminders;
  }

  private async simulateReminderDecision(
    agent: Agent,
    tasks: Task[],
    recentReminders: Notification[],
    reminderPrompt: string
  ): Promise<ReminderAction[]> {
    const reminders: ReminderAction[] = [];
    
    // Check for overdue or stalled tasks
    const stalledTasks = tasks.filter(task => {
      const isActive = task.status === 'in_progress' || task.status === 'pending';
      const isOld = task.updatedAt < new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours old
      const hasRecentReminder = recentReminders.some(rem => 
        rem.metadata && rem.metadata.taskId === task.id
      );
      
      return isActive && isOld && !hasRecentReminder;
    });
    
    for (const task of stalledTasks) {
      const reminderMessage = this.generateReminderMessage(agent, task);
      
      reminders.push({
        to: agent.name,
        taskId: task.id.toString(),
        message: reminderMessage,
        sendAt: new Date().toISOString()
      });
    }
    
    return reminders;
  }

  private generateReminderMessage(agent: Agent, task: Task): string {
    const messages = [
      `Task "${task.title}" needs attention - it's been ${this.getTimeSinceUpdate(task)} since last update.`,
      `Reminder: Task "${task.title}" is still in progress. Any updates to share?`,
      `Check-in needed for task "${task.title}" - current status: ${task.status}`,
      `Task "${task.title}" may need support. Consider escalating if blocked.`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getTimeSinceUpdate(task: Task): string {
    const now = new Date();
    const updated = new Date(task.updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'less than an hour';
    } else if (diffHours === 1) {
      return '1 hour';
    } else {
      return `${diffHours} hours`;
    }
  }

  private async sendReminder(reminder: ReminderAction): Promise<void> {
    try {
      // Create notification in database
      await this.storage.createNotification({
        type: 'reminder',
        title: 'Task Reminder',
        message: reminder.message,
        recipientId: null, // System reminder
        metadata: {
          taskId: reminder.taskId,
          targetAgent: reminder.to,
          reminderAt: reminder.sendAt
        }
      });
      
      console.log(`Reminder sent to ${reminder.to}: ${reminder.message}`);
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }
}