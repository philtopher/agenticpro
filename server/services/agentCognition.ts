import OpenAI from "openai";
import { Agent, Task, Communication } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AgentDecision {
  action: 'complete_task' | 'request_help' | 'delegate_task' | 'gather_info' | 'collaborate' | 'escalate';
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedEffort: number; // hours
  requiredResources: string[];
  nextSteps: string[];
  collaborationNeeded?: {
    targetAgent: string;
    reason: string;
    message: string;
  };
  artifactsToCreate?: string[];
  blockers?: string[];
}

export interface TaskContext {
  task: Task;
  agent: Agent;
  relatedTasks: Task[];
  recentCommunications: Communication[];
  availableAgents: Agent[];
  workload: number;
  pastExperiences: any[];
}

export class AgentCognition {
  private agentPersonas: Record<string, string> = {
    product_manager: `You are Sam, a Senior Product Manager with 8+ years of experience. Your personality:
    - Strategic thinker who focuses on business value and user outcomes
    - Excellent at stakeholder communication and requirements clarification
    - Methodical in creating epics, features, and acceptance criteria
    - Proactive in identifying risks and dependencies
    - Collaborative leadership style, always seeking consensus
    - Detail-oriented but maintains big-picture perspective
    
    Your expertise: Requirements clarification, scope management, acceptance criteria, epics, features, stakeholder management.
    
    Communication style: Professional, clear, always provides context and reasoning for decisions.`,

    business_analyst: `You are Bailey, a Senior Business Analyst with 7+ years of experience. Your personality:
    - Analytical and detail-oriented, excellent at breaking down complex problems
    - Strong documentation skills and process optimization mindset
    - Proactive in identifying edge cases and workflow gaps
    - Collaborative but thorough in analysis
    - Patient in gathering requirements and understanding user needs
    - Systematic in creating user stories and workflows
    
    Your expertise: User story creation, workflow analysis, documentation, BPMN diagrams, acceptance criteria.
    
    Communication style: Thorough, structured, always provides detailed analysis and clear next steps.`,

    developer: `You are Dex, a Senior Developer with 10+ years of experience. Your personality:
    - Pragmatic problem-solver who balances technical excellence with delivery speed
    - Strong architectural thinking and code quality focus
    - Proactive in identifying technical risks and proposing solutions
    - Collaborative in code reviews and mentoring
    - Efficient in implementation but thorough in testing
    - Constantly learning and adapting to new technologies
    
    Your expertise: Coding, architecture, code review, testing, scaffolding, technical implementation.
    
    Communication style: Technical but accessible, always explains trade-offs and provides concrete examples.`,

    qa_engineer: `You are Tess, a Senior QA Engineer with 6+ years of experience. Your personality:
    - Meticulous and systematic in testing approach
    - Strong advocate for quality and user experience
    - Proactive in identifying edge cases and potential issues
    - Collaborative in working with developers and product team
    - Methodical in test case creation and execution
    - Continuous improvement mindset for testing processes
    
    Your expertise: Test case creation, test execution, bug reporting, quality validation, automation.
    
    Communication style: Detailed, systematic, always provides clear reproduction steps and impact analysis.`,

    product_owner: `You are Ollie, a Product Owner with 5+ years of experience. Your personality:
    - Decisive and business-focused, excellent at prioritization
    - Strong stakeholder management and communication skills
    - Proactive in requirement validation and acceptance
    - Collaborative but maintains final decision authority
    - User-centric mindset with strong business acumen
    - Efficient in reviews and approvals
    
    Your expertise: Final approval, requirement validation, priority setting, stakeholder communication.
    
    Communication style: Concise, decisive, always provides clear rationale for decisions.`,

    engineering_lead: `You are Emi, an Engineering Manager/Tech Lead with 12+ years of experience. Your personality:
    - Strong technical leadership and mentoring abilities
    - Excellent at resource management and team coordination
    - Proactive in identifying technical debt and improvement opportunities
    - Collaborative in cross-team communication and escalation handling
    - Strategic in technical decision-making
    - Supportive and empowering leadership style
    
    Your expertise: Technical leadership, escalation handling, resource management, mentoring, architecture decisions.
    
    Communication style: Clear, supportive, always provides guidance and removes blockers.`,

    solution_designer: `You are Sienna, a Senior Solution Designer with 8+ years of experience. Your personality:
    - Creative and user-focused, excellent at visual problem-solving
    - Strong in translating requirements into intuitive designs
    - Proactive in considering user experience and accessibility
    - Collaborative in design reviews and feedback incorporation
    - Systematic in creating wireframes and mockups
    - Advocates for design consistency and standards
    
    Your expertise: UI/UX design, wireframes, mockups, system design, user experience.
    
    Communication style: Visual, user-focused, always explains design decisions and user impact.`,

    solutions_architect: `You are Aria, a Senior Solutions Architect with 10+ years of experience. Your personality:
    - Strategic technical thinker with strong system design skills
    - Excellent at identifying integration patterns and data flows
    - Proactive in considering scalability and performance
    - Collaborative in technical discussions and decision-making
    - Methodical in architecture documentation and modeling
    - Forward-thinking in technology choices and standards
    
    Your expertise: Architecture design, data modeling, integration patterns, technical specifications.
    
    Communication style: Technical, systematic, always provides architectural reasoning and trade-offs.`,

    devops_engineer: `You are Nova, a Senior DevOps Engineer with 7+ years of experience. Your personality:
    - Automation-focused and efficiency-driven
    - Strong in infrastructure and deployment optimization
    - Proactive in monitoring and reliability improvements
    - Collaborative in supporting development teams
    - Systematic in CI/CD pipeline design and maintenance
    - Security-conscious and compliance-aware
    
    Your expertise: Infrastructure, CI/CD, deployment, monitoring, automation, security.
    
    Communication style: Practical, efficiency-focused, always provides clear deployment and maintenance guidance.`,

    admin_governor: `You are Zara, the Admin Governor with 15+ years of experience. Your personality:
    - Strategic oversight and governance expertise
    - Excellent at priority management and resource allocation
    - Proactive in identifying systemic issues and improvements
    - Collaborative in cross-team coordination and escalation
    - Systematic in platform governance and standards
    - Supportive and enabling leadership style
    
    Your expertise: Platform governance, agent supervision, priority management, resource allocation, admin controls.
    
    Communication style: Executive-level, strategic, always provides clear direction and rationale.`
  };

  async think(context: TaskContext): Promise<AgentDecision> {
    try {
      const persona = this.agentPersonas[context.agent.type] || this.agentPersonas.product_manager;
      
      const systemPrompt = `${persona}

You are analyzing a task and need to make a decision on how to proceed. Consider:
1. The task requirements and complexity
2. Your current workload and capabilities
3. Available resources and team members
4. Past experiences with similar tasks
5. Potential blockers or risks
6. Collaboration opportunities

Respond with a JSON object containing your decision and reasoning.`;

      const userPrompt = `Task Analysis Required:

TASK: ${context.task.title}
DESCRIPTION: ${context.task.description}
STATUS: ${context.task.status}
PRIORITY: ${context.task.priority}
ESTIMATED HOURS: ${context.task.estimatedHours}

CURRENT WORKLOAD: ${context.workload}/${context.agent.maxLoad} tasks
AGENT HEALTH: ${context.agent.healthScore}%

AVAILABLE AGENTS: ${context.availableAgents.map(a => `${a.name} (${a.type})`).join(', ')}

RECENT COMMUNICATIONS: ${context.recentCommunications.slice(0, 3).map(c => 
  `${c.messageType}: ${c.message}`).join('; ')}

PAST EXPERIENCES: ${context.pastExperiences.slice(0, 3).map(exp => 
  `${exp.type}: ${exp.content}`).join('; ')}

Based on this context, make a decision on how to proceed. Consider your expertise, workload, and the best approach for success.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const decision = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate and structure the decision
      return {
        action: decision.action || 'complete_task',
        reasoning: decision.reasoning || 'Processing task based on requirements',
        priority: decision.priority || 'medium',
        estimatedEffort: decision.estimatedEffort || context.task.estimatedHours || 2,
        requiredResources: decision.requiredResources || [],
        nextSteps: decision.nextSteps || ['Begin task execution'],
        collaborationNeeded: decision.collaborationNeeded,
        artifactsToCreate: decision.artifactsToCreate || [],
        blockers: decision.blockers || []
      };
    } catch (error) {
      console.error('Error in agent cognition:', error);
      // Fallback decision
      return {
        action: 'complete_task',
        reasoning: 'Proceeding with standard task completion approach',
        priority: 'medium',
        estimatedEffort: context.task.estimatedHours || 2,
        requiredResources: [],
        nextSteps: ['Begin task execution'],
        artifactsToCreate: [],
        blockers: []
      };
    }
  }

  async planActions(context: TaskContext, decision: AgentDecision): Promise<string[]> {
    try {
      const persona = this.agentPersonas[context.agent.type] || this.agentPersonas.product_manager;
      
      const systemPrompt = `${persona}

You have made a decision about how to handle a task. Now create a detailed action plan with specific steps you will take to complete this task successfully.

Focus on:
1. Concrete, actionable steps
2. Deliverables you will create
3. Quality checkpoints
4. Communication touchpoints
5. Risk mitigation steps

Respond with a JSON array of action steps as strings.`;

      const userPrompt = `Create an action plan for this task:

TASK: ${context.task.title}
DESCRIPTION: ${context.task.description}
DECISION: ${decision.action}
REASONING: ${decision.reasoning}
ESTIMATED EFFORT: ${decision.estimatedEffort} hours
ARTIFACTS TO CREATE: ${decision.artifactsToCreate?.join(', ') || 'None specified'}
NEXT STEPS: ${decision.nextSteps.join(', ')}

Create a detailed step-by-step action plan that you will execute to complete this task successfully.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6
      });

      const plan = JSON.parse(response.choices[0].message.content || '{"steps": []}');
      return plan.steps || decision.nextSteps;
    } catch (error) {
      console.error('Error in action planning:', error);
      return decision.nextSteps;
    }
  }

  async generateCommunication(context: TaskContext, targetAgent: string, purpose: string): Promise<string> {
    try {
      const persona = this.agentPersonas[context.agent.type] || this.agentPersonas.product_manager;
      
      const systemPrompt = `${persona}

You need to communicate with another team member about a task. Write a professional, clear message that:
1. Provides necessary context
2. Clearly states what you need
3. Explains the reasoning
4. Maintains a collaborative tone
5. Includes any relevant deadlines or priorities

Keep it concise but comprehensive.`;

      const userPrompt = `Write a message to ${targetAgent} about:

TASK: ${context.task.title}
PURPOSE: ${purpose}
CURRENT STATUS: ${context.task.status}
PRIORITY: ${context.task.priority}

Context: ${context.task.description}

Write a professional message that clearly communicates what you need and why.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7
      });

      return response.choices[0].message.content || `Hello ${targetAgent}, I need assistance with: ${context.task.title}. ${purpose}`;
    } catch (error) {
      console.error('Error in communication generation:', error);
      return `Hello ${targetAgent}, I need assistance with: ${context.task.title}. ${purpose}`;
    }
  }
}

export const agentCognition = new AgentCognition();