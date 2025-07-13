import { AgentMemoryService } from './agentMemoryService';
import * as storage from '../storage';

interface KnowledgeSource {
  id: string;
  name: string;
  type: 'documentation' | 'code_repository' | 'api' | 'database' | 'web' | 'file_system';
  url?: string;
  apiKey?: string;
  config: any;
  isActive: boolean;
  lastUpdated: string;
}

interface KnowledgeQuery {
  query: string;
  context?: any;
  sources?: string[];
  maxResults?: number;
  relevanceThreshold?: number;
}

interface KnowledgeResult {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  relevanceScore: number;
  metadata: any;
  url?: string;
  lastUpdated: string;
}

interface KnowledgeIntegration {
  agentId: number;
  query: string;
  results: KnowledgeResult[];
  appliedTo: string; // What task/action this knowledge was applied to
  effectiveness: number; // 0-1 score of how helpful the knowledge was
  timestamp: string;
}

export class ExternalKnowledgeService {
  private memoryService: AgentMemoryService;
  private storage: any;
  private knowledgeSources: Map<string, KnowledgeSource> = new Map();
  private knowledgeCache: Map<string, KnowledgeResult[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();

  constructor(memoryService: AgentMemoryService, storage: any) {
    this.memoryService = memoryService;
    this.storage = storage;
    this.initializeDefaultSources();
  }

  private initializeDefaultSources(): void {
    // Add default knowledge sources
    this.addKnowledgeSource({
      id: 'documentation',
      name: 'Project Documentation',
      type: 'documentation',
      config: {
        searchPaths: ['./docs', './README.md', './attached_assets'],
        fileTypes: ['.md', '.txt', '.doc']
      },
      isActive: true,
      lastUpdated: new Date().toISOString()
    });

    this.addKnowledgeSource({
      id: 'code_repo',
      name: 'Code Repository',
      type: 'code_repository',
      config: {
        searchPaths: ['./src', './server', './client'],
        fileTypes: ['.ts', '.js', '.jsx', '.tsx', '.py', '.java'],
        excludePaths: ['node_modules', '.git', 'dist', 'build']
      },
      isActive: true,
      lastUpdated: new Date().toISOString()
    });

    this.addKnowledgeSource({
      id: 'stack_overflow',
      name: 'Stack Overflow',
      type: 'web',
      url: 'https://api.stackexchange.com/2.3/search',
      config: {
        site: 'stackoverflow',
        pageSize: 10,
        sort: 'relevance'
      },
      isActive: false, // Disabled by default
      lastUpdated: new Date().toISOString()
    });
  }

  addKnowledgeSource(source: Omit<KnowledgeSource, 'id'> & { id?: string }): string {
    const id = source.id || `source_${Date.now()}`;
    const knowledgeSource: KnowledgeSource = {
      id,
      ...source,
      lastUpdated: new Date().toISOString()
    };
    
    this.knowledgeSources.set(id, knowledgeSource);
    return id;
  }

  async searchKnowledge(agentId: number, query: KnowledgeQuery): Promise<KnowledgeResult[]> {
    const cacheKey = this.generateCacheKey(query);
    
    // Check cache first
    if (this.knowledgeCache.has(cacheKey)) {
      const cacheExpiry = this.cacheExpiry.get(cacheKey) || 0;
      if (Date.now() < cacheExpiry) {
        return this.knowledgeCache.get(cacheKey)!;
      }
    }

    const results: KnowledgeResult[] = [];
    const sourcesToSearch = query.sources || Array.from(this.knowledgeSources.keys());

    for (const sourceId of sourcesToSearch) {
      const source = this.knowledgeSources.get(sourceId);
      if (!source || !source.isActive) continue;

      try {
        const sourceResults = await this.searchSource(source, query);
        results.push(...sourceResults);
      } catch (error) {
        console.error(`Error searching knowledge source ${sourceId}:`, error);
      }
    }

    // Sort by relevance and apply threshold
    const sortedResults = results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter(r => r.relevanceScore >= (query.relevanceThreshold || 0.3))
      .slice(0, query.maxResults || 10);

    // Cache results
    this.knowledgeCache.set(cacheKey, sortedResults);
    this.cacheExpiry.set(cacheKey, Date.now() + 30 * 60 * 1000); // 30 minutes

    // Log knowledge search
    await this.memoryService.logAgentMemory(agentId, {
      type: 'action',
      content: `Searched external knowledge: "${query.query}" - found ${sortedResults.length} relevant results`,
      details: { query, resultCount: sortedResults.length },
      timestamp: new Date().toISOString()
    });

    return sortedResults;
  }

  private async searchSource(source: KnowledgeSource, query: KnowledgeQuery): Promise<KnowledgeResult[]> {
    switch (source.type) {
      case 'documentation':
        return this.searchDocumentation(source, query);
      case 'code_repository':
        return this.searchCodeRepository(source, query);
      case 'web':
        return this.searchWeb(source, query);
      case 'file_system':
        return this.searchFileSystem(source, query);
      default:
        return [];
    }
  }

  private async searchDocumentation(source: KnowledgeSource, query: KnowledgeQuery): Promise<KnowledgeResult[]> {
    const results: KnowledgeResult[] = [];
    const { searchPaths, fileTypes } = source.config;

    // This is a simplified implementation
    // In production, you'd want to use proper file system search
    const mockDocuments = [
      {
        path: './README.md',
        content: 'This is a multi-agent system for software development. It includes autonomous agents that can collaborate, communicate, and learn.',
        title: 'Project README'
      },
      {
        path: './docs/architecture.md',
        content: 'The system architecture consists of multiple services: AgentService, TaskService, CommunicationService, and more.',
        title: 'System Architecture'
      },
      {
        path: './docs/agents.md',
        content: 'Agents have different roles: Product Manager, Developer, QA Engineer, etc. Each agent has specialized skills and expertise.',
        title: 'Agent Roles'
      }
    ];

    for (const doc of mockDocuments) {
      const relevanceScore = this.calculateRelevance(query.query, doc.content);
      if (relevanceScore > 0.2) {
        results.push({
          id: `doc_${Date.now()}_${Math.random()}`,
          sourceId: source.id,
          title: doc.title,
          content: doc.content,
          relevanceScore,
          metadata: { path: doc.path, type: 'documentation' },
          lastUpdated: new Date().toISOString()
        });
      }
    }

    return results;
  }

  private async searchCodeRepository(source: KnowledgeSource, query: KnowledgeQuery): Promise<KnowledgeResult[]> {
    const results: KnowledgeResult[] = [];
    
    // Mock code search results
    const mockCodeFiles = [
      {
        path: './server/services/agentService.ts',
        content: 'export class AgentService { async initializeAgents() { /* Initialize all agents */ } }',
        title: 'Agent Service'
      },
      {
        path: './server/services/taskService.ts',
        content: 'export class TaskService { async createTask(data) { /* Create new task */ } }',
        title: 'Task Service'
      },
      {
        path: './server/routes.ts',
        content: 'Agent routes and API endpoints for managing multi-agent workflows',
        title: 'API Routes'
      }
    ];

    for (const file of mockCodeFiles) {
      const relevanceScore = this.calculateRelevance(query.query, file.content);
      if (relevanceScore > 0.2) {
        results.push({
          id: `code_${Date.now()}_${Math.random()}`,
          sourceId: source.id,
          title: file.title,
          content: file.content,
          relevanceScore,
          metadata: { path: file.path, type: 'code', language: 'typescript' },
          lastUpdated: new Date().toISOString()
        });
      }
    }

    return results;
  }

  private async searchWeb(source: KnowledgeSource, query: KnowledgeQuery): Promise<KnowledgeResult[]> {
    const results: KnowledgeResult[] = [];
    
    // Mock web search (in production, integrate with real APIs)
    if (source.name === 'Stack Overflow') {
      const mockStackOverflowResults = [
        {
          title: 'How to implement multi-agent systems in TypeScript',
          content: 'Multi-agent systems can be implemented using various patterns. Here are some best practices...',
          url: 'https://stackoverflow.com/questions/123456',
          score: 42
        },
        {
          title: 'Agent communication patterns',
          content: 'For agent-to-agent communication, consider using message queues, event systems, or direct method calls...',
          url: 'https://stackoverflow.com/questions/789012',
          score: 35
        }
      ];

      for (const result of mockStackOverflowResults) {
        const relevanceScore = this.calculateRelevance(query.query, result.content);
        if (relevanceScore > 0.3) {
          results.push({
            id: `web_${Date.now()}_${Math.random()}`,
            sourceId: source.id,
            title: result.title,
            content: result.content,
            relevanceScore,
            metadata: { score: result.score, platform: 'stackoverflow' },
            url: result.url,
            lastUpdated: new Date().toISOString()
          });
        }
      }
    }

    return results;
  }

  private async searchFileSystem(source: KnowledgeSource, query: KnowledgeQuery): Promise<KnowledgeResult[]> {
    const results: KnowledgeResult[] = [];
    
    // Mock file system search
    const mockFiles = [
      {
        path: './config/database.js',
        content: 'Database configuration for the multi-agent system',
        title: 'Database Config'
      },
      {
        path: './scripts/setup.sh',
        content: 'Setup script for initializing the agent system',
        title: 'Setup Script'
      }
    ];

    for (const file of mockFiles) {
      const relevanceScore = this.calculateRelevance(query.query, file.content);
      if (relevanceScore > 0.2) {
        results.push({
          id: `file_${Date.now()}_${Math.random()}`,
          sourceId: source.id,
          title: file.title,
          content: file.content,
          relevanceScore,
          metadata: { path: file.path, type: 'file' },
          lastUpdated: new Date().toISOString()
        });
      }
    }

    return results;
  }

  private calculateRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    let matches = 0;
    let totalImportance = 0;
    
    queryWords.forEach(queryWord => {
      const wordMatches = contentWords.filter(contentWord => 
        contentWord.includes(queryWord) || queryWord.includes(contentWord)
      ).length;
      
      if (wordMatches > 0) {
        matches++;
        // Longer words are more important
        totalImportance += queryWord.length * Math.min(wordMatches, 3);
      }
    });
    
    // Base relevance on match ratio and word importance
    const matchRatio = matches / queryWords.length;
    const importanceScore = totalImportance / (queryWords.length * 10);
    
    return Math.min(1.0, (matchRatio * 0.6) + (importanceScore * 0.4));
  }

  async integrateKnowledge(agentId: number, query: string, results: KnowledgeResult[], appliedTo: string): Promise<void> {
    const integration: KnowledgeIntegration = {
      agentId,
      query,
      results,
      appliedTo,
      effectiveness: 0.8, // Would be determined by outcome
      timestamp: new Date().toISOString()
    };

    // Store relevant knowledge in agent memory
    for (const result of results) {
      await this.memoryService.logAgentMemory(agentId, {
        type: 'learning',
        content: `Integrated external knowledge: ${result.title}`,
        details: { 
          source: result.sourceId,
          content: result.content,
          relevance: result.relevanceScore,
          appliedTo
        },
        timestamp: new Date().toISOString()
      });
    }

    // Log integration
    await this.memoryService.logAgentMemory(agentId, {
      type: 'action',
      content: `Integrated ${results.length} knowledge results for: ${appliedTo}`,
      details: integration,
      timestamp: new Date().toISOString()
    });
  }

  async suggestKnowledgeQuery(agentId: number, context: any): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Generate suggestions based on agent's current context
    if (context.currentTask) {
      const task = context.currentTask;
      
      // Suggest queries based on task type
      if (task.tags?.includes('development')) {
        suggestions.push(
          `best practices for ${task.title}`,
          `common errors in ${task.tags.join(' ')}`,
          `code examples for ${task.description}`
        );
      }
      
      if (task.tags?.includes('testing')) {
        suggestions.push(
          `testing strategies for ${task.title}`,
          `test automation for ${task.tags.join(' ')}`,
          `quality assurance best practices`
        );
      }
      
      if (task.tags?.includes('design')) {
        suggestions.push(
          `design patterns for ${task.title}`,
          `UI/UX best practices`,
          `accessibility guidelines`
        );
      }
    }
    
    // Suggest queries based on recent failures
    const recentMemory = await this.memoryService.getAgentMemory(agentId, {
      limit: 10,
      type: 'learning'
    });
    
    const failures = recentMemory.filter(m => 
      m.content.toLowerCase().includes('fail') || 
      m.content.toLowerCase().includes('error')
    );
    
    if (failures.length > 0) {
      suggestions.push(
        `troubleshooting ${failures[0].content}`,
        `common solutions for similar problems`,
        `error handling best practices`
      );
    }
    
    return suggestions;
  }

  async updateKnowledgeEffectiveness(agentId: number, query: string, effectiveness: number): Promise<void> {
    // Update effectiveness score based on actual outcomes
    await this.memoryService.logAgentMemory(agentId, {
      type: 'learning',
      content: `Knowledge effectiveness updated: ${query} - ${effectiveness}`,
      details: { query, effectiveness },
      timestamp: new Date().toISOString()
    });
  }

  private generateCacheKey(query: KnowledgeQuery): string {
    return `${query.query}_${(query.sources || []).join('_')}_${query.maxResults || 10}`;
  }

  // Public accessors
  getKnowledgeSources(): KnowledgeSource[] {
    return Array.from(this.knowledgeSources.values());
  }

  getKnowledgeSource(id: string): KnowledgeSource | null {
    return this.knowledgeSources.get(id) || null;
  }

  removeKnowledgeSource(id: string): boolean {
    return this.knowledgeSources.delete(id);
  }

  async clearCache(): Promise<void> {
    this.knowledgeCache.clear();
    this.cacheExpiry.clear();
  }

  async getKnowledgeStats(): Promise<any> {
    return {
      totalSources: this.knowledgeSources.size,
      activeSources: Array.from(this.knowledgeSources.values()).filter(s => s.isActive).length,
      cacheSize: this.knowledgeCache.size,
      sourceTypes: Array.from(this.knowledgeSources.values()).reduce((types, source) => {
        types[source.type] = (types[source.type] || 0) + 1;
        return types;
      }, {} as Record<string, number>)
    };
  }
}
