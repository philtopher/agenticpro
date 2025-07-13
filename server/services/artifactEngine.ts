import { IStorage } from "@shared/schema";
import OpenAI from "openai";
import * as fs from 'fs';
import * as path from 'path';

export interface ArtifactTemplate {
  type: string;
  name: string;
  description: string;
  prompt: string;
  outputFormat: 'code' | 'document' | 'specification' | 'diagram';
}

export class ArtifactEngine {
  private openai: OpenAI;
  private templates: Map<string, ArtifactTemplate> = new Map();

  constructor(private storage: IStorage) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.initializeTemplates();
  }

  /**
   * Phase 3: Real Artifact Generation Engine
   * - Template-based artifact generation
   * - Code scaffolding and implementation
   * - Document generation with context awareness
   * - Intelligent content creation based on project context
   */

  private initializeTemplates(): void {
    const templates: ArtifactTemplate[] = [
      {
        type: 'user_story',
        name: 'User Story',
        description: 'Generate comprehensive user stories with acceptance criteria',
        prompt: 'Generate a detailed user story with acceptance criteria, edge cases, and test scenarios for: {context}',
        outputFormat: 'document'
      },
      {
        type: 'api_specification',
        name: 'API Specification',
        description: 'Create detailed API documentation and specifications',
        prompt: 'Create comprehensive API specification including endpoints, request/response formats, authentication, and error handling for: {context}',
        outputFormat: 'specification'
      },
      {
        type: 'component_code',
        name: 'React Component',
        description: 'Generate React component with TypeScript',
        prompt: 'Create a fully functional React component with TypeScript, proper props, hooks, and styling for: {context}',
        outputFormat: 'code'
      },
      {
        type: 'database_schema',
        name: 'Database Schema',
        description: 'Generate database schema and migrations',
        prompt: 'Create database schema with proper relationships, indexes, and constraints for: {context}',
        outputFormat: 'code'
      },
      {
        type: 'test_suite',
        name: 'Test Suite',
        description: 'Generate comprehensive test cases',
        prompt: 'Create comprehensive test suite with unit tests, integration tests, and edge case coverage for: {context}',
        outputFormat: 'code'
      },
      {
        type: 'architecture_diagram',
        name: 'Architecture Diagram',
        description: 'Generate system architecture diagrams',
        prompt: 'Create detailed system architecture diagram in Mermaid format showing components, data flow, and interactions for: {context}',
        outputFormat: 'diagram'
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.type, template);
    });
  }

  async generateArtifact(taskId: number, agentId: number, artifactType: string, context: string): Promise<string> {
    try {
      const template = this.templates.get(artifactType);
      if (!template) {
        throw new Error(`Template not found for artifact type: ${artifactType}`);
      }

      const agent = await this.storage.getAgent(agentId);
      const task = await this.storage.getTask(taskId);
      
      // Get agent's previous artifacts for context
      const previousArtifacts = await this.storage.getArtifactsByTask(taskId);
      
      const enhancedPrompt = template.prompt.replace('{context}', context) + `
        
        Additional Context:
        - Agent: ${agent?.name} (${agent?.type})
        - Task: ${task?.title}
        - Previous artifacts: ${previousArtifacts.map(a => `${a.type}: ${a.title}`).join(', ')}
        
        Requirements:
        - Follow best practices for ${template.outputFormat}
        - Include proper error handling and edge cases
        - Make it production-ready and maintainable
        - Add comprehensive documentation
        ${template.outputFormat === 'code' ? '- Use TypeScript and modern patterns' : ''}
        ${template.outputFormat === 'diagram' ? '- Use Mermaid syntax' : ''}
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert ${agent?.type} specialized in creating high-quality ${template.outputFormat} artifacts. Generate professional, production-ready content.`
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      });

      const content = response.choices[0].message.content || '';
      
      // Store the artifact
      await this.storage.createArtifact({
        taskId,
        agentId,
        type: artifactType,
        title: template.name,
        content,
        metadata: {
          template: template.type,
          context,
          generatedAt: new Date(),
          version: '1.0.0'
        },
        status: 'draft'
      });

      console.log(`🎨 Generated ${template.name} artifact for task ${taskId}`);
      return content;
    } catch (error) {
      console.error('Error generating artifact:', error);
      throw error;
    }
  }

  async generateCodeScaffolding(taskId: number, agentId: number, projectType: string, requirements: string): Promise<string> {
    try {
      const prompt = `
        Generate complete code scaffolding for a ${projectType} project with these requirements:
        ${requirements}
        
        Include:
        - Project structure with all necessary files
        - Configuration files (package.json, tsconfig.json, etc.)
        - Core implementation files with proper structure
        - Test files with example tests
        - Documentation (README.md)
        
        Use modern best practices and TypeScript.
        Provide the complete file structure and key implementation files.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a senior software architect. Generate complete, production-ready code scaffolding."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      const content = response.choices[0].message.content || '';
      
      // Store as code artifact
      await this.storage.createArtifact({
        taskId,
        agentId,
        type: 'code_scaffolding',
        title: `${projectType} Project Scaffolding`,
        content,
        metadata: {
          projectType,
          requirements,
          generatedAt: new Date(),
          version: '1.0.0'
        },
        status: 'draft'
      });

      return content;
    } catch (error) {
      console.error('Error generating code scaffolding:', error);
      throw error;
    }
  }

  async refineArtifact(artifactId: number, feedback: string, agentId: number): Promise<string> {
    try {
      const artifact = await this.storage.getArtifacts().then(artifacts => 
        artifacts.find(a => a.id === artifactId)
      );
      
      if (!artifact) {
        throw new Error('Artifact not found');
      }

      const prompt = `
        Refine this artifact based on the feedback:
        
        Original Artifact:
        ${artifact.content}
        
        Feedback:
        ${feedback}
        
        Improve the artifact addressing all feedback points while maintaining quality and consistency.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert at refining and improving technical artifacts based on feedback."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      });

      const refinedContent = response.choices[0].message.content || '';
      
      // Update the artifact with refined content
      await this.storage.updateArtifact(artifactId, {
        content: refinedContent,
        status: 'refined',
        metadata: {
          ...artifact.metadata,
          refinedAt: new Date(),
          feedback
        }
      });

      return refinedContent;
    } catch (error) {
      console.error('Error refining artifact:', error);
      throw error;
    }
  }

  getAvailableTemplates(): ArtifactTemplate[] {
    return Array.from(this.templates.values());
  }
}