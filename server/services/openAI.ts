import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI | null = null;
  
  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('OpenAI API key not found. AI agents will use simulated responses.');
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: apiKey,
      });
      console.log('OpenAI client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      this.client = null;
    }
  }

  async generateResponse(prompt: string, maxTokens: number = 1000): Promise<string> {
    if (!this.client) {
      return this.simulateResponse(prompt);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'AI response not available';
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.simulateResponse(prompt);
    }
  }

  async generateJSONResponse(prompt: string, maxTokens: number = 1000): Promise<any> {
    if (!this.client) {
      return this.simulateJSONResponse(prompt);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: 'user',
            content: prompt + '\n\nRespond with valid JSON only.'
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      return content ? JSON.parse(content) : this.simulateJSONResponse(prompt);
    } catch (error) {
      console.error('Error generating JSON response:', error);
      return this.simulateJSONResponse(prompt);
    }
  }

  private simulateResponse(prompt: string): string {
    // Generate contextual simulated response based on prompt content
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('product manager') || lowerPrompt.includes('sam')) {
      return 'As Product Manager, I have analyzed the requirements and created a comprehensive product roadmap with clear acceptance criteria and user stories. I will coordinate with the team to ensure proper implementation and stakeholder alignment.';
    }
    
    if (lowerPrompt.includes('business analyst') || lowerPrompt.includes('bailey')) {
      return 'As Business Analyst, I have documented the business processes and created detailed workflow diagrams with stakeholder requirements. I have identified key user journeys and edge cases that need to be addressed.';
    }
    
    if (lowerPrompt.includes('developer') || lowerPrompt.includes('dex')) {
      return 'As Developer, I have reviewed the technical requirements and created implementation plans with code architecture and development milestones. I will ensure clean, maintainable code following best practices.';
    }
    
    if (lowerPrompt.includes('qa') || lowerPrompt.includes('test') || lowerPrompt.includes('tess')) {
      return 'As QA Engineer, I have created comprehensive test cases and validation criteria to ensure quality standards are met. I will verify functionality across all user scenarios and edge cases.';
    }
    
    if (lowerPrompt.includes('product owner') || lowerPrompt.includes('ollie')) {
      return 'As Product Owner, I have reviewed the deliverables and provide final approval for this implementation. The solution meets business requirements and provides value to our users.';
    }
    
    if (lowerPrompt.includes('solution designer') || lowerPrompt.includes('sienna')) {
      return 'As Solution Designer, I have created user-centric designs with intuitive interfaces and excellent user experience. The design follows accessibility standards and responsive principles.';
    }
    
    if (lowerPrompt.includes('solutions architect') || lowerPrompt.includes('aria')) {
      return 'As Solutions Architect, I have designed scalable technical architecture with proper data modeling and integration patterns. The solution ensures maintainability and performance.';
    }
    
    if (lowerPrompt.includes('devops') || lowerPrompt.includes('nova')) {
      return 'As DevOps Engineer, I have prepared robust CI/CD pipelines and infrastructure automation. The deployment strategy ensures reliability and zero-downtime releases.';
    }
    
    if (lowerPrompt.includes('engineering manager') || lowerPrompt.includes('emi')) {
      return 'As Engineering Manager, I have coordinated the technical team and ensured proper resource allocation. The project timeline and quality standards are being maintained.';
    }
    
    if (lowerPrompt.includes('admin governor') || lowerPrompt.includes('zara')) {
      return 'As Admin Governor, I have assessed platform governance and resource allocation. All compliance requirements are met and system metrics are within acceptable parameters.';
    }
    
    return 'AI analysis completed with contextual insights and recommendations for next steps. The task has been processed according to role-specific expertise and workflow requirements.';
  }

  private simulateJSONResponse(prompt: string): any {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('summary') || lowerPrompt.includes('summarize')) {
      return {
        summary: ["Document contains project specifications and requirements", "Includes implementation details and acceptance criteria"],
        actions: ["Create detailed user stories", "Review technical requirements", "Plan implementation phases", "Coordinate with stakeholders"],
        tags: ["requirements", "specifications", "planning", "implementation"]
      };
    }
    
    if (lowerPrompt.includes('message') || lowerPrompt.includes('routing')) {
      return [
        {
          from: "product_manager",
          to: "business_analyst",
          taskId: "current",
          intent: "requirements_handoff"
        },
        {
          from: "business_analyst", 
          to: "developer",
          taskId: "current",
          intent: "development_handoff"
        }
      ];
    }
    
    return {
      response: "AI analysis completed successfully",
      status: "success",
      recommendations: ["Review requirements thoroughly", "Plan implementation strategy", "Coordinate with team members"]
    };
  }

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}

export const openAIService = new OpenAIService();