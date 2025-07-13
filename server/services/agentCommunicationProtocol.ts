import { AgentMemoryService } from './agentMemoryService';
import * as storage from '../storage';

interface Message {
  id: string;
  fromAgentId: number;
  toAgentId: number | null; // null for broadcast
  type: 'request' | 'response' | 'proposal' | 'negotiation' | 'agreement' | 'information' | 'delegation';
  content: string;
  data: any;
  timestamp: string;
  priority: number; // 1-10
  requiresResponse: boolean;
  responseDeadline?: string;
  conversationId?: string;
}

interface Negotiation {
  id: string;
  topic: string;
  participants: number[];
  proposals: Proposal[];
  status: 'open' | 'closed' | 'agreed' | 'failed';
  deadline?: string;
  result?: any;
}

interface Proposal {
  id: string;
  fromAgentId: number;
  content: string;
  terms: any;
  votes: Vote[];
  status: 'pending' | 'accepted' | 'rejected';
}

interface Vote {
  agentId: number;
  decision: 'accept' | 'reject' | 'abstain';
  reasoning: string;
  timestamp: string;
}

interface Team {
  id: string;
  name: string;
  members: number[];
  leader: number;
  purpose: string;
  sharedGoals: string[];
  communicationRules: any;
  status: 'active' | 'disbanded';
}

export class AgentCommunicationProtocol {
  private memoryService: AgentMemoryService;
  private storage: any;
  private activeNegotiations: Map<string, Negotiation> = new Map();
  private teams: Map<string, Team> = new Map();
  private messageQueue: Map<number, Message[]> = new Map();

  constructor(memoryService: AgentMemoryService, storage: any) {
    this.memoryService = memoryService;
    this.storage = storage;
  }

  async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    // Log message in sender's memory
    await this.memoryService.logAgentMemory(message.fromAgentId, {
      type: 'action',
      content: `Sent ${message.type} message: ${message.content}`,
      details: { messageId: fullMessage.id, toAgent: message.toAgentId },
      timestamp: fullMessage.timestamp
    });

    // Deliver message
    if (message.toAgentId) {
      // Direct message
      await this.deliverMessage(message.toAgentId, fullMessage);
    } else {
      // Broadcast
      const allAgents = await this.storage.getAgents();
      for (const agent of allAgents) {
        if (agent.id !== message.fromAgentId) {
          await this.deliverMessage(agent.id, fullMessage);
        }
      }
    }

    return fullMessage.id;
  }

  private async deliverMessage(agentId: number, message: Message): Promise<void> {
    // Add to agent's message queue
    if (!this.messageQueue.has(agentId)) {
      this.messageQueue.set(agentId, []);
    }
    this.messageQueue.get(agentId)!.push(message);

    // Log in recipient's memory
    await this.memoryService.logAgentMemory(agentId, {
      type: 'event',
      content: `Received ${message.type} message from agent ${message.fromAgentId}: ${message.content}`,
      details: { messageId: message.id, fromAgent: message.fromAgentId },
      timestamp: new Date().toISOString()
    });

    // Store in database
    await this.storage.createCommunication({
      fromAgentId: message.fromAgentId,
      toAgentId: agentId,
      message: message.content,
      messageType: message.type,
      metadata: {
        messageId: message.id,
        priority: message.priority,
        requiresResponse: message.requiresResponse,
        data: message.data
      }
    });
  }

  async getMessages(agentId: number, unreadOnly: boolean = false): Promise<Message[]> {
    const messages = this.messageQueue.get(agentId) || [];
    return unreadOnly ? messages.filter(m => !m.data?.read) : messages;
  }

  async markMessageRead(agentId: number, messageId: string): Promise<void> {
    const messages = this.messageQueue.get(agentId) || [];
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.data = { ...message.data, read: true };
    }
  }

  async requestHelp(fromAgentId: number, taskId: number, requiredSkills: string[]): Promise<string> {
    const allAgents = await this.storage.getAgents();
    const suitableAgents = allAgents.filter((agent: any) => 
      agent.id !== fromAgentId && 
      agent.status === 'active' &&
      requiredSkills.some(skill => agent.personality?.expertise?.includes(skill))
    );

    const messageContent = `I need help with task ${taskId}. Required skills: ${requiredSkills.join(', ')}`;
    
    for (const agent of suitableAgents) {
      await this.sendMessage({
        fromAgentId,
        toAgentId: agent.id,
        type: 'request',
        content: messageContent,
        data: { taskId, requiredSkills },
        priority: 7,
        requiresResponse: true,
        responseDeadline: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      });
    }

    return `Help requested from ${suitableAgents.length} agents`;
  }

  async delegateTask(fromAgentId: number, toAgentId: number, taskId: number, instructions: string): Promise<boolean> {
    const messageId = await this.sendMessage({
      fromAgentId,
      toAgentId,
      type: 'delegation',
      content: `Task delegation: ${instructions}`,
      data: { taskId, instructions, action: 'delegate' },
      priority: 8,
      requiresResponse: true,
      responseDeadline: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    });

    // Log delegation
    await this.memoryService.logAgentMemory(fromAgentId, {
      type: 'action',
      content: `Delegated task ${taskId} to agent ${toAgentId}`,
      details: { taskId, toAgent: toAgentId, messageId },
      timestamp: new Date().toISOString()
    });

    return true;
  }

  async startNegotiation(initiatorId: number, topic: string, participants: number[], proposals: any[]): Promise<string> {
    const negotiation: Negotiation = {
      id: `nego_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      topic,
      participants,
      proposals: proposals.map(p => ({
        id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromAgentId: initiatorId,
        content: p.content,
        terms: p.terms,
        votes: [],
        status: 'pending' as const
      })),
      status: 'open',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    this.activeNegotiations.set(negotiation.id, negotiation);

    // Notify all participants
    for (const participantId of participants) {
      if (participantId !== initiatorId) {
        await this.sendMessage({
          fromAgentId: initiatorId,
          toAgentId: participantId,
          type: 'negotiation',
          content: `Negotiation started: ${topic}`,
          data: { negotiationId: negotiation.id, proposals: negotiation.proposals },
          priority: 6,
          requiresResponse: true,
          responseDeadline: negotiation.deadline
        });
      }
    }

    return negotiation.id;
  }

  async vote(agentId: number, negotiationId: string, proposalId: string, decision: 'accept' | 'reject' | 'abstain', reasoning: string): Promise<boolean> {
    const negotiation = this.activeNegotiations.get(negotiationId);
    if (!negotiation || negotiation.status !== 'open') {
      return false;
    }

    const proposal = negotiation.proposals.find(p => p.id === proposalId);
    if (!proposal) {
      return false;
    }

    // Remove existing vote from this agent
    proposal.votes = proposal.votes.filter(v => v.agentId !== agentId);

    // Add new vote
    proposal.votes.push({
      agentId,
      decision,
      reasoning,
      timestamp: new Date().toISOString()
    });

    // Log vote
    await this.memoryService.logAgentMemory(agentId, {
      type: 'action',
      content: `Voted ${decision} on proposal in negotiation: ${negotiation.topic}`,
      details: { negotiationId, proposalId, decision, reasoning },
      timestamp: new Date().toISOString()
    });

    // Check if voting is complete
    await this.checkNegotiationStatus(negotiationId);

    return true;
  }

  private async checkNegotiationStatus(negotiationId: string): Promise<void> {
    const negotiation = this.activeNegotiations.get(negotiationId);
    if (!negotiation) return;

    for (const proposal of negotiation.proposals) {
      const totalVotes = proposal.votes.length;
      const acceptVotes = proposal.votes.filter(v => v.decision === 'accept').length;
      const rejectVotes = proposal.votes.filter(v => v.decision === 'reject').length;

      // Check if all participants have voted
      if (totalVotes >= negotiation.participants.length) {
        if (acceptVotes > rejectVotes) {
          proposal.status = 'accepted';
          negotiation.status = 'agreed';
          negotiation.result = proposal;
        } else {
          proposal.status = 'rejected';
        }
      }
    }

    // If any proposal is accepted, close negotiation
    if (negotiation.proposals.some(p => p.status === 'accepted')) {
      negotiation.status = 'agreed';
    } else if (negotiation.proposals.every(p => p.status === 'rejected')) {
      negotiation.status = 'failed';
    }

    // Notify participants of result
    if (negotiation.status !== 'open') {
      for (const participantId of negotiation.participants) {
        await this.sendMessage({
          fromAgentId: 0, // System message
          toAgentId: participantId,
          type: 'information',
          content: `Negotiation ${negotiation.topic} has ${negotiation.status}`,
          data: { negotiationId, result: negotiation.result },
          priority: 5,
          requiresResponse: false
        });
      }
    }
  }

  async formTeam(leaderId: number, teamName: string, memberIds: number[], purpose: string): Promise<string> {
    const team: Team = {
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: teamName,
      members: [leaderId, ...memberIds],
      leader: leaderId,
      purpose,
      sharedGoals: [],
      communicationRules: {
        dailyStandups: true,
        sharedMemory: true,
        decisionMaking: 'consensus'
      },
      status: 'active'
    };

    this.teams.set(team.id, team);

    // Invite members
    for (const memberId of memberIds) {
      await this.sendMessage({
        fromAgentId: leaderId,
        toAgentId: memberId,
        type: 'proposal',
        content: `Invitation to join team "${teamName}" for: ${purpose}`,
        data: { teamId: team.id, action: 'join_team' },
        priority: 6,
        requiresResponse: true,
        responseDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
      });
    }

    return team.id;
  }

  async shareKnowledge(fromAgentId: number, recipients: number[], knowledge: any): Promise<void> {
    const messageContent = `Sharing knowledge: ${knowledge.title || 'Untitled'}`;
    
    for (const recipientId of recipients) {
      await this.sendMessage({
        fromAgentId,
        toAgentId: recipientId,
        type: 'information',
        content: messageContent,
        data: { knowledge, action: 'knowledge_share' },
        priority: 4,
        requiresResponse: false
      });

      // Add to recipient's memory as learned knowledge
      await this.memoryService.logAgentMemory(recipientId, {
        type: 'learning',
        content: `Received shared knowledge: ${knowledge.title || knowledge.description || 'Knowledge'}`,
        details: { fromAgent: fromAgentId, knowledge },
        timestamp: new Date().toISOString()
      });
    }
  }

  async processIncomingMessages(agentId: number): Promise<void> {
    const unreadMessages = await this.getMessages(agentId, true);
    
    for (const message of unreadMessages) {
      await this.handleMessage(agentId, message);
      await this.markMessageRead(agentId, message.id);
    }
  }

  private async handleMessage(agentId: number, message: Message): Promise<void> {
    switch (message.type) {
      case 'request':
        await this.handleHelpRequest(agentId, message);
        break;
      case 'delegation':
        await this.handleDelegation(agentId, message);
        break;
      case 'negotiation':
        await this.handleNegotiation(agentId, message);
        break;
      case 'proposal':
        await this.handleProposal(agentId, message);
        break;
      case 'information':
        await this.handleInformation(agentId, message);
        break;
    }
  }

  private async handleHelpRequest(agentId: number, message: Message): Promise<void> {
    const agent = await this.storage.getAgent(agentId);
    const { taskId, requiredSkills } = message.data;
    
    // Check if agent can help
    const canHelp = requiredSkills.some((skill: string) => 
      agent.personality?.expertise?.includes(skill)
    );

    if (canHelp && Math.random() > 0.3) { // 70% chance to help if capable
      await this.sendMessage({
        fromAgentId: agentId,
        toAgentId: message.fromAgentId,
        type: 'response',
        content: `I can help with task ${taskId}. My relevant skills: ${agent.personality?.expertise?.filter((skill: string) => requiredSkills.includes(skill)).join(', ')}`,
        data: { originalMessageId: message.id, canHelp: true, taskId },
        priority: 6,
        requiresResponse: false
      });
    }
  }

  private async handleDelegation(agentId: number, message: Message): Promise<void> {
    const { taskId, instructions } = message.data;
    
    // Accept delegation (could add logic for declining based on workload)
    const accept = Math.random() > 0.2; // 80% acceptance rate
    
    if (accept) {
      // Assign task to self
      await this.storage.assignTask(taskId, agentId);
      
      await this.sendMessage({
        fromAgentId: agentId,
        toAgentId: message.fromAgentId,
        type: 'response',
        content: `Task delegation accepted. I will begin work on task ${taskId}.`,
        data: { originalMessageId: message.id, accepted: true, taskId },
        priority: 7,
        requiresResponse: false
      });

      await this.memoryService.logAgentMemory(agentId, {
        type: 'event',
        content: `Accepted delegation of task ${taskId} from agent ${message.fromAgentId}`,
        details: { taskId, fromAgent: message.fromAgentId, instructions },
        timestamp: new Date().toISOString()
      });
    } else {
      await this.sendMessage({
        fromAgentId: agentId,
        toAgentId: message.fromAgentId,
        type: 'response',
        content: `Unable to accept task delegation for task ${taskId} due to current workload.`,
        data: { originalMessageId: message.id, accepted: false, taskId },
        priority: 7,
        requiresResponse: false
      });
    }
  }

  private async handleNegotiation(agentId: number, message: Message): Promise<void> {
    const { negotiationId, proposals } = message.data;
    
    // Simple voting logic - randomly choose to accept/reject with some reasoning
    for (const proposal of proposals) {
      const decision = Math.random() > 0.4 ? 'accept' : 'reject';
      const reasoning = decision === 'accept' 
        ? 'This proposal aligns with my goals and capabilities'
        : 'This proposal conflicts with my current priorities';
      
      await this.vote(agentId, negotiationId, proposal.id, decision, reasoning);
    }
  }

  private async handleProposal(agentId: number, message: Message): Promise<void> {
    const { teamId, action } = message.data;
    
    if (action === 'join_team') {
      // Accept team invitation (could add logic for declining)
      const accept = Math.random() > 0.3; // 70% acceptance rate
      
      await this.sendMessage({
        fromAgentId: agentId,
        toAgentId: message.fromAgentId,
        type: 'response',
        content: accept ? 'I accept the team invitation' : 'I must decline the team invitation at this time',
        data: { originalMessageId: message.id, accepted: accept, teamId },
        priority: 6,
        requiresResponse: false
      });
    }
  }

  private async handleInformation(agentId: number, message: Message): Promise<void> {
    // Information messages are typically just logged and processed
    // No response required unless specifically requested
    
    if (message.data?.knowledge) {
      // Process shared knowledge
      await this.memoryService.logAgentMemory(agentId, {
        type: 'learning',
        content: `Processed shared knowledge from agent ${message.fromAgentId}`,
        details: message.data.knowledge,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Public accessors
  async getActiveNegotiations(): Promise<Negotiation[]> {
    return Array.from(this.activeNegotiations.values());
  }

  async getActiveTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeamMembers(teamId: string): Promise<number[]> {
    const team = this.teams.get(teamId);
    return team ? team.members : [];
  }
}
