import { IStorage } from "@shared/schema";
import OpenAI from "openai";

export interface CollaborationContext {
  taskId: number;
  participants: number[];
  type: 'handoff' | 'review' | 'consultation' | 'escalation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AgentRole {
  id: number;
  name: string;
  type: string;
  expertise: string[];
  availability: 'available' | 'busy' | 'offline';
}

export class CollaborationEngine {
  private openai: OpenAI;
  private activeCollaborations: Map<string, CollaborationContext> = new Map();

  constructor(private storage: IStorage) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Phase 4: Multi-Agent Collaboration Protocols
   * - Intelligent agent coordination and task handoffs
   * - Dynamic team formation based on task requirements
   * - Conflict resolution and consensus building
   * - Cross-agent knowledge sharing and learning
   */

  async initiateCollaboration(taskId: number, initiatorId: number, collaborationType: string, context: string): Promise<string> {
    try {
      const task = await this.storage.getTask(taskId);
      const initiator = await this.storage.getAgent(initiatorId);
      
      // Determine optimal collaborators based on task requirements
      const optimalTeam = await this.selectOptimalTeam(taskId, collaborationType, context);
      
      const collaborationId = `collab_${taskId}_${Date.now()}`;
      
      // Create collaboration context
      this.activeCollaborations.set(collaborationId, {
        taskId,
        participants: [initiatorId, ...optimalTeam.map(agent => agent.id)],
        type: collaborationType as any,
        priority: this.determinePriority(task?.priority || 'medium')
      });

      // Generate collaboration plan
      const plan = await this.generateCollaborationPlan(taskId, optimalTeam, collaborationType, context);
      
      // Send collaboration invitations
      for (const agent of optimalTeam) {
        await this.sendCollaborationInvitation(agent.id, collaborationId, plan);
      }

      // Log collaboration initiation
      await this.storage.createCommunication({
        taskId,
        fromAgentId: initiatorId,
        toAgentId: optimalTeam[0]?.id || initiatorId,
        type: 'collaboration_init',
        content: JSON.stringify({
          collaborationId,
          type: collaborationType,
          participants: optimalTeam.map(a => a.name),
          plan
        }),
        metadata: {
          collaborationType,
          teamSize: optimalTeam.length
        }
      });

      console.log(`🤝 Collaboration initiated: ${collaborationType} for task ${taskId}`);
      return collaborationId;
    } catch (error) {
      console.error('Error initiating collaboration:', error);
      throw error;
    }
  }

  private async selectOptimalTeam(taskId: number, collaborationType: string, context: string): Promise<AgentRole[]> {
    try {
      const task = await this.storage.getTask(taskId);
      const allAgents = await this.storage.getAgents();
      
      const prompt = `
        Select the optimal team for this collaboration:
        
        Task: ${task?.title}
        Description: ${task?.description}
        Collaboration Type: ${collaborationType}
        Context: ${context}
        
        Available Agents:
        ${allAgents.map(agent => `${agent.name} (${agent.type}): ${agent.capabilities}`).join('\n')}
        
        Select 2-4 agents most suitable for this collaboration.
        Respond in JSON format:
        {
          "selectedAgents": [
            {
              "name": "Agent Name",
              "type": "agent_type",
              "reason": "why selected"
            }
          ]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{"selectedAgents":[]}');
      
      return result.selectedAgents.map((selected: any) => {
        const agent = allAgents.find(a => a.name === selected.name);
        return {
          id: agent?.id || 0,
          name: selected.name,
          type: selected.type,
          expertise: selected.reason.split(','),
          availability: 'available'
        };
      }).filter((agent: AgentRole) => agent.id > 0);
    } catch (error) {
      console.error('Error selecting optimal team:', error);
      return [];
    }
  }

  private async generateCollaborationPlan(taskId: number, team: AgentRole[], type: string, context: string): Promise<string> {
    try {
      const task = await this.storage.getTask(taskId);
      
      const prompt = `
        Generate a detailed collaboration plan:
        
        Task: ${task?.title}
        Collaboration Type: ${type}
        Context: ${context}
        Team: ${team.map(agent => `${agent.name} (${agent.type})`).join(', ')}
        
        Create a structured plan with:
        - Clear objectives
        - Role assignments
        - Timeline and milestones
        - Communication protocols
        - Success criteria
        
        Make it actionable and specific.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert project manager creating detailed collaboration plans."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating collaboration plan:', error);
      return 'Collaboration plan generation failed';
    }
  }

  private async sendCollaborationInvitation(agentId: number, collaborationId: string, plan: string): Promise<void> {
    try {
      const agent = await this.storage.getAgent(agentId);
      const collaboration = this.activeCollaborations.get(collaborationId);
      
      if (!collaboration) return;

      await this.storage.createCommunication({
        taskId: collaboration.taskId,
        fromAgentId: 0, // System
        toAgentId: agentId,
        type: 'collaboration_invite',
        content: JSON.stringify({
          collaborationId,
          plan,
          participants: collaboration.participants,
          type: collaboration.type
        }),
        metadata: {
          collaborationId,
          priority: collaboration.priority
        }
      });

      console.log(`📨 Collaboration invitation sent to ${agent?.name}`);
    } catch (error) {
      console.error('Error sending collaboration invitation:', error);
    }
  }

  async handleCollaborationResponse(collaborationId: string, agentId: number, response: 'accept' | 'decline' | 'counter', details?: string): Promise<void> {
    try {
      const collaboration = this.activeCollaborations.get(collaborationId);
      if (!collaboration) return;

      const agent = await this.storage.getAgent(agentId);
      
      await this.storage.createCommunication({
        taskId: collaboration.taskId,
        fromAgentId: agentId,
        toAgentId: 0, // System
        type: 'collaboration_response',
        content: JSON.stringify({
          collaborationId,
          response,
          details: details || ''
        }),
        metadata: {
          collaborationId,
          responseType: response
        }
      });

      if (response === 'accept') {
        await this.activateCollaboration(collaborationId, agentId);
      } else if (response === 'counter') {
        await this.handleCounterProposal(collaborationId, agentId, details || '');
      }

      console.log(`🤝 ${agent?.name} ${response}ed collaboration ${collaborationId}`);
    } catch (error) {
      console.error('Error handling collaboration response:', error);
    }
  }

  private async activateCollaboration(collaborationId: string, agentId: number): Promise<void> {
    try {
      const collaboration = this.activeCollaborations.get(collaborationId);
      if (!collaboration) return;

      // Update task with collaboration status
      await this.storage.updateTask(collaboration.taskId, {
        status: 'collaborative',
        metadata: {
          collaborationId,
          activeParticipants: collaboration.participants,
          collaborationType: collaboration.type
        }
      });

      // Start collaboration workflow
      await this.initiateCollaborativeWorkflow(collaboration);
    } catch (error) {
      console.error('Error activating collaboration:', error);
    }
  }

  private async handleCounterProposal(collaborationId: string, agentId: number, proposal: string): Promise<void> {
    try {
      const collaboration = this.activeCollaborations.get(collaborationId);
      if (!collaboration) return;

      // Analyze counter proposal with AI
      const analysis = await this.analyzeCounterProposal(collaboration.taskId, proposal);
      
      // Negotiate with other participants
      await this.negotiateCollaborationTerms(collaborationId, agentId, proposal, analysis);
    } catch (error) {
      console.error('Error handling counter proposal:', error);
    }
  }

  private async analyzeCounterProposal(taskId: number, proposal: string): Promise<string> {
    try {
      const task = await this.storage.getTask(taskId);
      
      const prompt = `
        Analyze this collaboration counter-proposal:
        
        Task: ${task?.title}
        Proposal: ${proposal}
        
        Evaluate:
        - Feasibility
        - Impact on timeline
        - Resource requirements
        - Potential benefits/risks
        
        Provide a balanced analysis with recommendations.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error analyzing counter proposal:', error);
      return 'Analysis failed';
    }
  }

  private async negotiateCollaborationTerms(collaborationId: string, proposingAgentId: number, proposal: string, analysis: string): Promise<void> {
    try {
      const collaboration = this.activeCollaborations.get(collaborationId);
      if (!collaboration) return;

      // Generate negotiation response
      const negotiationResponse = await this.generateNegotiationResponse(proposal, analysis);
      
      // Send to all participants
      for (const participantId of collaboration.participants) {
        if (participantId !== proposingAgentId) {
          await this.storage.createCommunication({
            taskId: collaboration.taskId,
            fromAgentId: 0, // System
            toAgentId: participantId,
            type: 'negotiation',
            content: JSON.stringify({
              collaborationId,
              originalProposal: proposal,
              analysis,
              negotiationResponse
            }),
            metadata: {
              collaborationId,
              negotiationType: 'counter_proposal'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error negotiating collaboration terms:', error);
    }
  }

  private async generateNegotiationResponse(proposal: string, analysis: string): Promise<string> {
    try {
      const prompt = `
        Generate a diplomatic negotiation response:
        
        Proposal: ${proposal}
        Analysis: ${analysis}
        
        Create a balanced response that:
        - Acknowledges valid points
        - Addresses concerns
        - Proposes compromises
        - Maintains collaborative spirit
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a skilled negotiator focused on finding win-win solutions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating negotiation response:', error);
      return 'Negotiation response generation failed';
    }
  }

  private async initiateCollaborativeWorkflow(collaboration: CollaborationContext): Promise<void> {
    try {
      // Start parallel work streams for participants
      const workStreams = await this.createWorkStreams(collaboration);
      
      // Monitor progress and coordinate
      this.monitorCollaborativeProgress(collaboration.taskId, workStreams);
      
      console.log(`🚀 Collaborative workflow initiated for task ${collaboration.taskId}`);
    } catch (error) {
      console.error('Error initiating collaborative workflow:', error);
    }
  }

  private async createWorkStreams(collaboration: CollaborationContext): Promise<any[]> {
    // Implementation for creating work streams
    return [];
  }

  private monitorCollaborativeProgress(taskId: number, workStreams: any[]): void {
    // Implementation for monitoring collaborative progress
  }

  private determinePriority(taskPriority: string): 'low' | 'medium' | 'high' | 'urgent' {
    const priorityMap: { [key: string]: 'low' | 'medium' | 'high' | 'urgent' } = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'urgent': 'urgent',
      'critical': 'urgent'
    };
    return priorityMap[taskPriority] || 'medium';
  }

  getActiveCollaborations(): Map<string, CollaborationContext> {
    return this.activeCollaborations;
  }
}