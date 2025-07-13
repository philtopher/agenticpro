
// AgentMemoryService: Structured, agent-specific memory with reflection and pattern extraction
// Supports episodic, semantic, and procedural memory for each agent
// Provides APIs for logging, retrieving, and reflecting on memory

type MemoryEntry = {
  type: 'episodic' | 'semantic' | 'procedural' | 'learning' | 'strategy' | 'event' | 'action' | string;
  content: string;
  details?: any;
  timestamp: string;
};

export class AgentMemoryService {
  private storage: any;
  private agentMemories: Map<number, MemoryEntry[]> = new Map();

  constructor(storage: any) {
    this.storage = storage;
  }

  // Log a memory entry for an agent
  async logAgentMemory(agentId: number, entry: MemoryEntry) {
    if (!this.agentMemories.has(agentId)) {
      this.agentMemories.set(agentId, []);
    }
    this.agentMemories.get(agentId)!.push(entry);
    // Optionally persist to storage/db here
  }

  // Get all memory for an agent
  async getAgentMemory(agentId: number): Promise<MemoryEntry[]> {
    if (!this.agentMemories.has(agentId)) {
      this.agentMemories.set(agentId, []);
    }
    return this.agentMemories.get(agentId)!;
  }

  // Get memory by type
  async getMemoryByType(agentId: number, type: string): Promise<MemoryEntry[]> {
    const mem = await this.getAgentMemory(agentId);
    return mem.filter(e => e.type === type);
  }

  // Reflect: extract patterns, update strategies, summarize learnings
  async reflect(agentId: number): Promise<{ summary: string; patterns: any[]; updated: boolean }> {
    const mem = await this.getAgentMemory(agentId);
    // Simple pattern extraction: count successes/failures, common topics
    const learnings = mem.filter(e => e.type === 'learning');
    const successes = learnings.filter(e => e.content.toLowerCase().includes('success'));
    const failures = learnings.filter(e => e.content.toLowerCase().includes('fail'));
    const topics: Record<string, number> = {};
    for (const l of learnings) {
      if (l.details && l.details.area) {
        topics[l.details.area] = (topics[l.details.area] || 0) + 1;
      }
    }
    // Update strategy if needed
    let updated = false;
    if (failures.length > successes.length) {
      await this.logAgentMemory(agentId, {
        type: 'strategy',
        content: 'Strategy updated after reflection: focus on improvement',
        details: { reason: 'More failures than successes' },
        timestamp: new Date().toISOString(),
      });
      updated = true;
    }
    const summary = `Agent ${agentId} has ${successes.length} successes, ${failures.length} failures. Top topics: ${Object.keys(topics).join(', ')}`;
    return { summary, patterns: Object.entries(topics), updated };
  }

  // Episodic memory: log an episode (task, event, etc.)
  async logEpisodic(agentId: number, content: string, details?: any) {
    await this.logAgentMemory(agentId, {
      type: 'episodic',
      content,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // Semantic memory: log a fact or concept
  async logSemantic(agentId: number, content: string, details?: any) {
    await this.logAgentMemory(agentId, {
      type: 'semantic',
      content,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // Procedural memory: log a skill or procedure
  async logProcedural(agentId: number, content: string, details?: any) {
    await this.logAgentMemory(agentId, {
      type: 'procedural',
      content,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // Utility: clear memory (for testing or reset)
  async clearMemory(agentId: number) {
    this.agentMemories.set(agentId, []);
  }
}
