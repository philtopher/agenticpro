import { IStorage } from "../storage";
import { GLOBAL_PROMPTS } from "./agentPromptsExtended";

export interface InterAgentMessage {
  from: string;
  to: string;
  taskId?: string;
  intent: string;
}

export class MessageRoutingService {
  constructor(private storage: IStorage) {}

  async parseInterAgentMessages(chatText: string): Promise<InterAgentMessage[]> {
    try {
      // Simulate message parsing using the prompt from the specification
      const messages = await this.simulateMessageParsing(chatText);
      return messages;
    } catch (error) {
      console.error("Error parsing inter-agent messages:", error);
      return [];
    }
  }

  private async simulateMessageParsing(chatText: string): Promise<InterAgentMessage[]> {
    const messages: InterAgentMessage[] = [];
    const lines = chatText.split('\n');
    
    // Agent name mappings
    const agentNames = {
      'sam': 'product_manager',
      'ollie': 'product_owner', 
      'bailey': 'business_analyst',
      'sienna': 'solution_designer',
      'aria': 'solutions_architect',
      'dex': 'developer',
      'tess': 'qa_engineer',
      'nova': 'devops_engineer',
      'emi': 'engineering_manager',
      'zara': 'admin_governor'
    };

    // Parse for inter-agent communication patterns
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Pattern: "ask [agent]" or "tell [agent]"
      const askPattern = /(?:ask|tell)\s+(\w+)/i;
      const match = line.match(askPattern);
      
      if (match) {
        const targetAgent = match[1].toLowerCase();
        if (agentNames[targetAgent as keyof typeof agentNames]) {
          messages.push({
            from: "unknown", // Would need context to determine sender
            to: agentNames[targetAgent as keyof typeof agentNames],
            intent: line.trim()
          });
        }
      }

      // Pattern: "@agent message"
      const mentionPattern = /@(\w+)\s+(.+)/i;
      const mentionMatch = line.match(mentionPattern);
      
      if (mentionMatch) {
        const targetAgent = mentionMatch[1].toLowerCase();
        const message = mentionMatch[2];
        
        if (agentNames[targetAgent as keyof typeof agentNames]) {
          messages.push({
            from: "unknown",
            to: agentNames[targetAgent as keyof typeof agentNames],
            intent: message.trim()
          });
        }
      }

      // Pattern: "hand off to [agent]"
      const handoffPattern = /hand\s+off\s+to\s+(\w+)/i;
      const handoffMatch = line.match(handoffPattern);
      
      if (handoffMatch) {
        const targetAgent = handoffMatch[1].toLowerCase();
        if (agentNames[targetAgent as keyof typeof agentNames]) {
          messages.push({
            from: "unknown",
            to: agentNames[targetAgent as keyof typeof agentNames],
            intent: "task handoff"
          });
        }
      }
    }

    return messages;
  }

  async getMessageRoutingPrompt(): Promise<string> {
    return GLOBAL_PROMPTS.messageRoutingPrompt;
  }
}