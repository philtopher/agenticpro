# AgentFlow - Autonomous AI Development System

## Overview

AgentFlow is a comprehensive autonomous AI-powered software development lifecycle orchestration system. It simulates a real-world agile development team with six specialized AI agents that collaborate to complete software development tasks from requirements to deployment.

## Recent Changes (Updated: January 12, 2025)

✓ **Complete AI Agent System Implementation**
- Added full AI agent decision-making system with specific role-based prompts
- Implemented autonomous task processing with agent-to-agent workflow progression
- Created comprehensive agent communication system with proper handoff protocols
- Added artifact generation and storage for all agent outputs
- Integrated real-time WebSocket updates for task progression

✓ **Enhanced User Interface**
- Clickable agents with detailed status information and health scores
- Agent detail modal showing capabilities, current tasks, and communication history
- AI-powered task processing buttons with real-time feedback
- Enhanced task management with workflow progress tracking
- Improved communication interface with agent-specific chat

✓ **Workflow System**
- Automated task routing between agents (Product Manager → Business Analyst → Developer → QA Engineer → Product Owner)
- Task escalation protocols with Engineering Lead oversight
- Memory system for context retention across agent interactions
- Health monitoring system with automatic escalation triggers

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

## Key Components

### Multi-Agent System
Six specialized AI agents with distinct roles and AI-powered decision making:
1. **Product Manager** - Requirements clarification and scope management (AI prompt: Clarifies ambiguous requirements, manages project scope, writes acceptance criteria)
2. **Business Analyst** - User story creation and workflow analysis (AI prompt: Translates features into user stories, identifies edge cases, creates workflows)
3. **Developer** - Code implementation and architecture (AI prompt: Writes clear, well-structured code, handles edge cases, prepares for testing)
4. **QA Engineer** - Test case creation and execution (AI prompt: Generates comprehensive test cases, validates implementations, reports issues)
5. **Product Owner** - Final approval and business validation (AI prompt: Reviews final implementation, gives APPROVED/REJECTED decisions)
6. **Engineering Lead** - Technical oversight and team coordination (AI prompt: Monitors agent health, reassigns tasks, handles escalations)

### Task Orchestration
- **Workflow Engine**: Automated task routing between agents
- **Load Balancing**: Dynamic task assignment based on agent capacity
- **Escalation Handling**: Automatic escalation for blocked or failed tasks
- **Status Tracking**: Real-time task progress monitoring

### Communication System
- **Inter-Agent Messaging**: Structured communication protocols
- **Handoff Management**: Seamless task transitions between agents
- **Notification System**: Email and real-time alerts
- **Audit Trail**: Complete communication history

### Artifact Management
- **Version Control**: Automatic versioning of generated artifacts
- **Type Classification**: Code, specifications, tests, documentation
- **Approval Workflow**: Review and approval processes
- **Storage**: Database-backed artifact persistence

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