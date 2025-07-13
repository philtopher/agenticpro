// Multi-agent collaboration protocols and shared workspace
import { CommunicationService } from './services/communicationService';

export class CollaborationProtocols {
  private sessions: Record<string, any> = {};
  constructor(private communicationService: CommunicationService) {}

  // Negotiation protocol with voting
  async negotiate(taskId: number, agentIds: number[], proposal: string) {
    const sessionId = `task-${taskId}-negotiation-${Date.now()}`;
    this.sessions[sessionId] = { votes: {}, proposal, agentIds, status: 'open' };
    for (const agentId of agentIds) {
      await this.communicationService.createCommunication({
        fromAgentId: null,
        toAgentId: agentId,
        taskId,
        message: proposal,
        messageType: 'negotiation_proposal',
        metadata: { sessionId, timestamp: new Date().toISOString() },
      });
    }
    return { sessionId, proposal, agentIds };
  }

  // Agent votes on a proposal
  async vote(sessionId: string, agentId: number, vote: 'yes' | 'no', reason?: string) {
    if (!this.sessions[sessionId]) throw new Error('Session not found');
    this.sessions[sessionId].votes[agentId] = { vote, reason };
    // Optionally, broadcast vote
    await this.communicationService.createCommunication({
      fromAgentId: agentId,
      toAgentId: null,
      taskId: null,
      message: `Agent ${agentId} voted ${vote}${reason ? ': ' + reason : ''}`,
      messageType: 'negotiation_vote',
      metadata: { sessionId, timestamp: new Date().toISOString() },
    });
    // Check for consensus
    const { agentIds, votes } = this.sessions[sessionId];
    if (agentIds.every(id => votes[id])) {
      const yesVotes = Object.values(votes).filter((v: any) => v.vote === 'yes').length;
      const consensus = yesVotes > agentIds.length / 2;
      this.sessions[sessionId].status = consensus ? 'accepted' : 'rejected';
    }
    return this.sessions[sessionId];
  }

  // Get session state
  getSession(sessionId: string) {
    return this.sessions[sessionId];
  }

  // Shared workspace (append message)
  async postToWorkspace(taskId: number, agentId: number, content: string) {
    await this.communicationService.createCommunication({
      fromAgentId: agentId,
      toAgentId: null,
      taskId,
      message: content,
      messageType: 'workspace_post',
      metadata: { timestamp: new Date().toISOString() },
    });
  }
}
