import { IStorage, Communication, InsertCommunication } from "@shared/schema";

export class CommunicationService {
  constructor(private storage: IStorage) {}

  async createCommunication(communicationData: InsertCommunication): Promise<Communication> {
    const communication = await this.storage.createCommunication(communicationData);
    
    // Trigger any side effects based on communication type
    await this.handleCommunicationSideEffects(communication);
    
    return communication;
  }

  private async handleCommunicationSideEffects(communication: Communication): Promise<void> {
    switch (communication.messageType) {
      case "escalation":
        await this.handleEscalation(communication);
        break;
      case "approval":
        await this.handleApproval(communication);
        break;
      case "rejection":
        await this.handleRejection(communication);
        break;
    }
  }

  private async handleEscalation(communication: Communication): Promise<void> {
    // Create health event for escalation
    if (communication.fromAgentId) {
      await this.storage.createHealthEvent({
        agentId: communication.fromAgentId,
        eventType: "escalation",
        severity: "high",
        details: {
          communicationId: communication.id,
          taskId: communication.taskId,
          message: communication.message
        }
      });
    }
  }

  private async handleApproval(communication: Communication): Promise<void> {
    // Update task status to completed when approved by Product Owner
    if (communication.taskId) {
      const task = await this.storage.getTask(communication.taskId);
      if (task && task.status === "in_progress") {
        await this.storage.updateTask(communication.taskId, {
          status: "completed",
          completedAt: new Date()
        });
      }
    }
  }

  private async handleRejection(communication: Communication): Promise<void> {
    // Send task back to appropriate agent based on rejection
    if (communication.taskId) {
      const task = await this.storage.getTask(communication.taskId);
      if (task) {
        const workflow = task.workflow as any;
        const previousAgent = this.getPreviousAgent(workflow.stage);
        
        if (previousAgent) {
          const agent = await this.storage.getAgentByType(previousAgent);
          if (agent) {
            await this.storage.assignTask(communication.taskId, agent.id);
            await this.storage.updateTask(communication.taskId, {
              status: "in_progress",
              workflow: {
                ...workflow,
                stage: this.getPreviousStage(workflow.stage),
                feedback: communication.message
              }
            });
          }
        }
      }
    }
  }

  private getPreviousAgent(currentStage: string): string | null {
    const workflow = {
      "review": "qa_engineer",
      "testing": "developer",
      "development": "business_analyst",
      "analysis": "product_manager"
    };

    return workflow[currentStage] || null;
  }

  private getPreviousStage(currentStage: string): string {
    const stages = {
      "review": "testing",
      "testing": "development",
      "development": "analysis",
      "analysis": "requirements"
    };

    return stages[currentStage] || "requirements";
  }
}
