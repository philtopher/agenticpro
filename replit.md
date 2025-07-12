# AgentFlow - Autonomous AI Development System

## Overview

AgentFlow is a comprehensive autonomous AI-powered software development lifecycle orchestration system. It simulates a real-world agile development team with six specialized AI agents that collaborate to complete software development tasks from requirements to deployment.

## Recent Changes (Updated: January 12, 2025)

✅ **AUTONOMOUS AGENT SYSTEM FULLY IMPLEMENTED**
- **Automatic Task Processing**: Tasks now start processing immediately when assigned - no manual buttons required
- **Complex Instruction Parsing**: System can execute multi-step instructions like "Write user story, send to Product owner, tell Product owner to send to Product Manager, get back to me"
- **Real-time Agent Communication**: Agents automatically communicate and handoff tasks based on instructions
- **Intelligent Task Routing**: Tasks flow through multiple agents based on natural language instructions
- **Comprehensive Task Management**: Full CRUD operations with clickable, editable task and agent interfaces

✅ **COMPLETE AUTONOMOUS AI AGENT SYSTEM IMPLEMENTED**
- **Zero-Click Automation**: Tasks automatically start processing when assigned - no manual intervention needed
- **Natural Language Instructions**: Agents parse complex multi-step instructions and execute them autonomously
- **Multi-Agent Workflows**: Agents automatically communicate, handoff tasks, and notify users based on instructions
- **Intelligent Task Routing**: System understands instructions like "send to Product owner" and routes accordingly
- **Agent Pause/Resume**: Users can pause agents while maintaining automatic execution by default
- **Clickable Task/Agent Interface**: All tasks and agents are clickable for detailed viewing and editing
- **Real-time Communication Tracking**: Complete visibility into all agent-to-agent and user interactions
- **Task Detail Modal**: Comprehensive task management with communication history and workflow tracking

✅ **ADVANCED AI AGENT CAPABILITIES IMPLEMENTED**
- **Planner Agents**: Strategic planning with JSON-based action planning for each agent
- **Reminder System**: Automated monitoring and nudging for overdue tasks
- **Governor/Orchestrator**: Intelligent agent supervision, load balancing, and reassignment
- **Diagram Generation**: Mermaid-based workflow and task flow visualization
- **Enhanced Prompts**: Role-specific planner, reminder, and governor prompts for each agent
- **Inter-Agent Coordination**: Advanced communication parsing and routing protocols
- **File Summarization**: AI-powered document analysis and task generation
- **Message Routing**: Intelligent inter-agent communication parsing

✅ **AUTONOMOUS SYSTEM VALIDATION COMPLETE**
- **Automatic Task Processing**: ✅ CONFIRMED - Tasks start processing immediately upon assignment
- **Complex Instruction Execution**: ✅ CONFIRMED - Multi-step instructions like "Write user story, send to Product owner, tell Product owner to send to Product Manager, get back to me" fully executed
- **Natural Language Parsing**: ✅ CONFIRMED - System correctly identifies target agents and actions from instructions
- **Multi-Agent Communication**: ✅ CONFIRMED - Agents automatically communicate and handoff tasks based on parsed instructions
- **Real-time Updates**: ✅ CONFIRMED - WebSocket broadcasts all agent activities and task progression
- **Task Management**: ✅ CONFIRMED - Full CRUD operations with clickable task cards and detailed modal views
- **Agent Controls**: ✅ CONFIRMED - Pause/resume functionality while maintaining automatic processing by default
- **Communication Tracking**: ✅ CONFIRMED - Complete visibility into all agent interactions per task
- **User Notifications**: ✅ CONFIRMED - "Get back to me" instructions trigger automatic user notifications
- **End-to-End Workflow**: ✅ CONFIRMED - Tasks flow through Business Analyst → Product Owner → Product Manager → User notification automatically

✅ **USER INTERFACE ENHANCEMENTS**
- **Agent Dashboard**: Clickable agents with detailed status and health scores
- **Task Management**: Enhanced task cards with workflow progress tracking
- **Processing Controls**: AI-powered task processing buttons integrated
- **Real-time Feed**: Live updates via WebSocket for task progression
- **Communication History**: Complete agent interaction logs displayed

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Real-time Communication**: WebSocket for live updates
- **Session Management**: PostgreSQL-based session store

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for type safety across frontend/backend
- **Key Tables**:
  - `users` - User authentication and profile data
  - `agents` - AI agent definitions and status
  - `tasks` - Work items and workflow state
  - `communications` - Inter-agent messages
  - `artifacts` - Generated code, docs, and deliverables
  - `health_events` - System monitoring and diagnostics

## Platform Features

✅ **Multi-agent SDLC Coverage**
- AI-generated: Epics, Features, User Stories, Acceptance Criteria (min 5), Test Cases
- BPMN, DFD, ER diagrams, architecture sketches
- Figma-style UX mockups or stubs
- Developer prompts compatible with Copilot, Replit, Loveable
- Infra templates: Azure PaaS, GitHub workflows, CI/CD pipelines

✅ **Instruction & Policy Awareness**
- Users can upload project-specific instructions, policy documents, or design rules
- Prompts, stories, code, and tests must abide by these documents
- If a document is mentioned in the input prompt, its content is enforced in the output

✅ **Smart Prompt Scheduling**
- Each user receives a Daily Prompt Panel with prioritized task prompts
- Prompts show the task, suggested priority (1–4), and allow reordering
- An AI assistant sidebar explains each task and assists with cross-project context

✅ **Role-Based Access Control**
- Admin defines who can create/export projects, upload docs, invite/remove users
- Access controlled at: platform, project, and feature level
- Users onboard via email invite > verify > join (best practices from Jira/ADO)

✅ **Integrations**
- Jira, Azure DevOps, GitHub Issues
- Import stories, tasks, test cases
- Export AI-generated assets back to those platforms
- Sync with boards and burndown charts

✅ **Prompt-Aware Prioritisation System**
- Agents classify prompts based on urgency and category:
  Critical Ops > Live Bug > Blocker > Feature > Idea
- Zara (Admin Governor) can adjust daily prompt frequency or divide incoming prompts across projects
- Admins can override priority settings

✅ **Feedback & Iteration**
- Users can give feedback on AI outputs
- Agents will ask follow-up clarifications if requirements are vague or incomplete
- Continuous improvement through instruction fine-tuning

## Key Components

### Multi-Agent System
Ten specialized AI agents with distinct roles and advanced AI-powered decision making:
1. **Sam (Senior Product Manager)** - Requirements clarification and scope management 
   - AI Prompts: Main system prompt, planner agent, reminder agent, governor oversight
   - Capabilities: Strategic planning, requirement analysis, acceptance criteria creation, epics, features
2. **Ollie (Product Owner)** - Final approval and business validation
   - AI Prompts: Main system prompt, planner agent, reminder agent, governor oversight
   - Capabilities: Final approval decisions, business validation, stakeholder communication
3. **Bailey (Senior Business Analyst)** - User story creation and workflow analysis
   - AI Prompts: Main system prompt, planner agent, reminder agent, governor oversight
   - Capabilities: User story generation, workflow documentation, edge case identification, BPMN diagrams
4. **Sienna (Senior Solution Designer)** - UI/UX design and system interfaces
   - AI Prompts: Main system prompt, planner agent, reminder agent, governor oversight
   - Capabilities: UI/UX wireframes, mockups, DFD diagrams, design prototypes
5. **Aria (Senior Solutions Architect)** - Technical architecture and data modeling
   - AI Prompts: Main system prompt, planner agent, reminder agent, governor oversight
   - Capabilities: Architecture blueprints, data modeling, integration patterns, technical specifications
6. **Dex (Senior Developer)** - Code implementation and scaffolding
   - AI Prompts: Main system prompt, planner agent, reminder agent, governor oversight
   - Capabilities: Code generation, scaffolding prompts, technical implementation, policy-aware coding
7. **Tess (Senior QA/Test Engineer)** - Test case creation and execution
   - AI Prompts: Main system prompt, planner agent, reminder agent, governor oversight
   - Capabilities: Test case generation, quality validation, bug reporting, test automation
8. **Nova (Senior DevOps/Infra Engineer)** - Infrastructure and CI/CD
   - AI Prompts: Main system prompt, planner agent, reminder agent, governor oversight
   - Capabilities: Infrastructure-as-code, CI/CD pipelines, deployment automation, monitoring
9. **Emi (Engineering Manager/Tech Lead)** - Technical leadership and coordination
   - AI Prompts: Main system prompt, planner agent, reminder agent, governor oversight
   - Capabilities: Team coordination, technical leadership, mentoring, resource management
10. **Zara (Admin + Platform Governor)** - Platform governance and oversight
    - AI Prompts: Main system prompt, planner agent, reminder agent, governor oversight
    - Capabilities: Platform governance, agent supervision, priority management, admin controls

### Task Orchestration
- **Workflow Engine**: Automated task routing between agents
- **Load Balancing**: Dynamic task assignment based on agent capacity
- **Escalation Handling**: Automatic escalation for blocked or failed tasks
- **Status Tracking**: Real-time task progress monitoring
- **Advanced Planning**: JSON-based action planning for each agent with strategic decision-making
- **Governor Oversight**: Intelligent supervision and automatic task reassignment
- **Reminder System**: Automated monitoring and nudging for overdue tasks

### Communication System
- **Inter-Agent Messaging**: Structured communication protocols
- **Handoff Management**: Seamless task transitions between agents
- **Notification System**: Email and real-time alerts
- **Audit Trail**: Complete communication history
- **Advanced Parsing**: Inter-agent request parsing and routing
- **Governor Coordination**: Intelligent agent supervision and intervention
- **Reminder Notifications**: Automated follow-up system for task progress

### Artifact Management
- **Version Control**: Automatic versioning of generated artifacts
- **Type Classification**: Code, specifications, tests, documentation
- **Approval Workflow**: Review and approval processes
- **Storage**: Database-backed artifact persistence
- **Diagram Generation**: Mermaid-based workflow and task flow visualization
- **Visual Analytics**: Agent load diagrams and performance visualization
- **File Processing**: AI-powered document analysis and summarization
- **Communication Intelligence**: Inter-agent message parsing and routing

## Data Flow

1. **Task Creation**: Users create tasks via the web interface
2. **Agent Assignment**: Product Manager initially receives all new tasks
3. **Workflow Progression**: Tasks move through defined stages (requirements → analysis → development → testing → approval)
4. **Communication**: Agents communicate via structured messages
5. **Artifact Generation**: Each agent produces relevant deliverables
6. **Real-time Updates**: WebSocket broadcasts system state changes
7. **Monitoring**: Health service tracks agent performance and system metrics

## External Dependencies

### Production Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth service
- **UI Components**: Radix UI primitives with shadcn/ui
- **Real-time**: Native WebSocket implementation
- **Email**: Placeholder service (ready for integration)

### Development Dependencies
- **Build Tools**: Vite, TypeScript, ESBuild
- **Development Server**: Express with Vite middleware
- **Database Tools**: Drizzle Kit for migrations
- **Code Quality**: TypeScript strict mode

## Deployment Strategy

### Development Environment
- **Dev Server**: Vite dev server with HMR
- **Database**: Neon PostgreSQL with auto-migration
- **Authentication**: Replit Auth integration
- **Real-time**: WebSocket server on same port

### Production Build
- **Frontend**: Vite production build to `dist/public`
- **Backend**: ESBuild bundle to `dist/index.js`
- **Static Assets**: Served via Express static middleware
- **Database**: Production PostgreSQL with connection pooling

### Architecture Decisions

**Monorepo Structure**: Single repository with shared types between frontend and backend eliminates API contract issues and enables rapid development.

**Drizzle ORM**: Chosen for type safety, performance, and excellent TypeScript integration. Supports both development and production database scenarios.

**Replit Auth**: Integrated authentication system eliminates need for custom auth implementation while providing enterprise-grade security.

**WebSocket Communication**: Real-time updates enhance user experience and enable live collaboration monitoring without complex state synchronization.

**Service-Oriented Backend**: Modular service classes (AgentService, TaskService, etc.) provide clear separation of concerns and easy testing.

**Shared Schema**: Common type definitions in `shared/schema.ts` ensure frontend and backend stay synchronized and provide end-to-end type safety.