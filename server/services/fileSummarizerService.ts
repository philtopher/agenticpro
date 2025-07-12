import { IStorage } from "../storage";
import { GLOBAL_PROMPTS } from "./agentPromptsExtended";

export interface FileSummary {
  summary: string[];
  actions: string[];
  tags: string[];
}

export class FileSummarizerService {
  constructor(private storage: IStorage) {}

  async summarizeFile(content: string, filename: string): Promise<FileSummary> {
    try {
      // Simulate AI file summarization using the prompt from the specification
      const analysis = await this.simulateFileSummarization(content, filename);
      
      return {
        summary: analysis.summary || [],
        actions: analysis.actions || [],
        tags: analysis.tags || []
      };
    } catch (error) {
      console.error("Error summarizing file:", error);
      return {
        summary: [`Error processing file: ${filename}`],
        actions: ["Review file content manually"],
        tags: ["error", "manual_review"]
      };
    }
  }

  private async simulateFileSummarization(content: string, filename: string): Promise<FileSummary> {
    // Simulate AI analysis based on content type and file structure
    const lines = content.split('\n');
    const summary: string[] = [];
    const actions: string[] = [];
    const tags: string[] = [];

    // Basic content analysis
    if (filename.toLowerCase().includes('requirement')) {
      summary.push("Requirements document containing project specifications");
      actions.push("Create user stories from requirements");
      tags.push("requirements", "specifications");
    } else if (filename.toLowerCase().includes('design')) {
      summary.push("Design document with UI/UX specifications");
      actions.push("Create wireframes and mockups");
      tags.push("design", "ui", "ux");
    } else if (filename.toLowerCase().includes('policy')) {
      summary.push("Policy document with compliance guidelines");
      actions.push("Update code generation to follow policies");
      tags.push("policy", "compliance", "guidelines");
    } else if (filename.toLowerCase().includes('architecture')) {
      summary.push("Architecture document with technical specifications");
      actions.push("Create technical blueprints");
      tags.push("architecture", "technical", "infrastructure");
    } else if (filename.toLowerCase().includes('test')) {
      summary.push("Test specification document");
      actions.push("Generate test cases and scenarios");
      tags.push("testing", "qa", "validation");
    } else {
      // Generic analysis
      summary.push(`Document contains ${lines.length} lines of content`);
      actions.push("Review and categorize document content");
      tags.push("document", "review");
    }

    // Add content-based insights
    if (content.includes('API') || content.includes('endpoint')) {
      summary.push("Contains API specifications or endpoints");
      actions.push("Create API documentation");
      tags.push("api", "endpoints");
    }

    if (content.includes('database') || content.includes('schema')) {
      summary.push("Contains database or schema information");
      actions.push("Create data models");
      tags.push("database", "schema");
    }

    if (content.includes('security') || content.includes('authentication')) {
      summary.push("Contains security or authentication requirements");
      actions.push("Implement security measures");
      tags.push("security", "authentication");
    }

    return { summary, actions, tags };
  }

  async getFileSummaryPrompt(): Promise<string> {
    return GLOBAL_PROMPTS.summarizerPrompt;
  }
}