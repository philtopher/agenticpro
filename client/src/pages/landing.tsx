import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-robot text-white text-xl"></i>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">AgentFlow</h1>
          </div>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Autonomous AI-powered Software Development Lifecycle orchestration system
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Get Started
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-users text-blue-600"></i>
                <span>Multi-Agent System</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Six specialized agents working together: Product Manager, Business Analyst, 
                Developer, QA Engineer, Product Owner, and Engineering Lead.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-sync-alt text-green-600"></i>
                <span>Autonomous Workflow</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Intelligent task delegation and workflow progression with automatic 
                handoffs between agents based on task completion.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-shield-alt text-purple-600"></i>
                <span>Health Monitoring</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Real-time agent health monitoring with automatic escalation 
                and email notifications for critical issues.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-plus text-blue-600 text-xl"></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Create Task</h3>
              <p className="text-sm text-gray-600">Assign tasks to agents or let them delegate automatically</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-cogs text-green-600 text-xl"></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Process</h3>
              <p className="text-sm text-gray-600">Agents collaborate through the development lifecycle</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-comments text-purple-600 text-xl"></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Communicate</h3>
              <p className="text-sm text-gray-600">Real-time communication and handoffs between agents</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-check text-yellow-600 text-xl"></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Deliver</h3>
              <p className="text-sm text-gray-600">Automated quality assurance and final approval</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
