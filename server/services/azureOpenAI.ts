// Simple Azure OpenAI service wrapper
export class AzureOpenAIService {
  private client: any = null;
  
  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    
    if (!apiKey || !endpoint) {
      console.warn('Azure OpenAI credentials not found. AI agents will use simulated responses.');
      return;
    }

    try {
      // Dynamic import to avoid issues with module resolution
      import('@azure/openai').then((module) => {
        const { AzureOpenAI } = module;
        this.client = new AzureOpenAI({
          apiKey,
          endpoint,
          apiVersion: '2024-02-01'
        });
        console.log('Azure OpenAI client initialized successfully');
      }).catch((error) => {
        console.error('Failed to initialize Azure OpenAI client:', error);
        this.client = null;
      });
    } catch (error) {
      console.error('Failed to initialize Azure OpenAI client:', error);
      this.client = null;
    }
  }

  async generateResponse(prompt: string, maxTokens: number = 1000): Promise<string> {
    if (!this.client) {
      return this.simulateResponse(prompt);
    }

    try {
      const response = await this.client.completions.create({
        model: 'gpt-3.5-turbo',
        prompt: prompt,
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      return response.choices[0]?.text || 'AI response not available';
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
      const response = await this.generateResponse(prompt + '\n\nRespond with valid JSON only.', maxTokens);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating JSON response:', error);
      return this.simulateJSONResponse(prompt);
    }
  }

  private simulateResponse(prompt: string): string {
    // Generate contextual simulated response based on prompt content
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('product manager') || lowerPrompt.includes('sam')) {
      return 'As Product Manager, I have analyzed the requirements and created a comprehensive product roadmap with clear acceptance criteria and user stories.';
    }
    
    if (lowerPrompt.includes('business analyst') || lowerPrompt.includes('bailey')) {
      return 'As Business Analyst, I have documented the business processes and created detailed workflow diagrams with stakeholder requirements.';
    }
    
    if (lowerPrompt.includes('developer') || lowerPrompt.includes('dex')) {
      return 'As Developer, I have reviewed the technical requirements and created implementation plans with code architecture and development milestones.';
    }
    
    if (lowerPrompt.includes('qa') || lowerPrompt.includes('test') || lowerPrompt.includes('tess')) {
      return 'As QA Engineer, I have created comprehensive test cases and validation criteria to ensure quality standards are met.';
    }
    
    if (lowerPrompt.includes('product owner') || lowerPrompt.includes('ollie')) {
      return 'As Product Owner, I have reviewed the deliverables and provide final approval for this implementation.';
    }
    
    return 'AI analysis completed with contextual insights and recommendations for next steps.';
  }

  private simulateJSONResponse(prompt: string): any {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('summary') || lowerPrompt.includes('summarize')) {
      return {
        summary: ["Document contains project specifications", "Contains requirements and implementation details"],
        actions: ["Create user stories", "Review technical requirements", "Plan implementation"],
        tags: ["requirements", "specifications", "planning"]
      };
    }
    
    if (lowerPrompt.includes('message') || lowerPrompt.includes('routing')) {
      return [
        {
          from: "product_manager",
          to: "business_analyst",
          taskId: "current",
          intent: "requirements_handoff"
        }
      ];
    }
    
    return {
      response: "AI analysis completed",
      status: "success",
      recommendations: ["Review requirements", "Plan next steps"]
    };
  }

  isConfigured(): boolean {
    return !!process.env.AZURE_OPENAI_API_KEY && !!process.env.AZURE_OPENAI_ENDPOINT;
  }
}

export const azureOpenAIService = new AzureOpenAIService();