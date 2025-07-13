import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { TaskAssignmentModal } from "@/components/TaskAssignmentModal";
import { AgentChatModal } from "@/components/AgentChatModal";
import { AgentStatusCard } from "@/components/AgentStatusCard";
import { WorkflowCard } from "@/components/WorkflowCard";
import { CommunicationFeed } from "@/components/CommunicationFeed";
import { AgentPerformanceCard } from "@/components/AgentPerformanceCard";
import { ArtifactCard } from "@/components/ArtifactCard";
import { TopNavigation } from "@/components/TopNavigation";
import { Sidebar } from "@/components/Sidebar";
import { TestingPanel } from "@/components/TestingPanel";
import { GovernorPanel } from "@/components/GovernorPanel";
import { CollaborationPanel } from "@/components/CollaborationPanel";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const { toast } = useToast();
  const { isConnected } = useWebSocket();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  // Use correct types and default values for queries
  const { data: metrics = {}, isLoading: metricsLoading } = useQuery<any>({
    queryKey: ["/api/metrics"],
    retry: false,
  });

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ["/api/agents"],
    retry: false,
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    retry: false,
  });

  const { data: communications = [] } = useQuery<any[]>({
    queryKey: ["/api/communications"],
    retry: false,
  });

  const { data: artifacts = [] } = useQuery<any[]>({
    queryKey: ["/api/artifacts"],
    retry: false,
  });

  if (metricsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      
      <div className="flex">
        <Sidebar agents={agents} onNewTask={() => setShowTaskModal(true)} />
        
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">System Dashboard</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{Array.isArray(agents) ? agents.filter((a: any) => a.status === "active").length : 0} agents active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>{Array.isArray(agents) ? agents.filter((a: any) => a.status === "busy").length : 0} agents busy</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>WebSocket {isConnected ? 'connected' : 'disconnected'}</span>
                </div>
              </div>
            </div>

            {/* Admin Section Link */}
            <div className="flex justify-end p-4">
              <Link to="/admin" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Admin Panel</Link>
            </div>

            {/* System Health Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {metrics.activeTasks || 0}
                    </span>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-tasks text-blue-600"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Completed Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {metrics.completedTasks || 0}
                    </span>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-check-circle text-green-600"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Escalated Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {metrics.escalatedIssues || 0}
                    </span>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-exclamation-triangle text-yellow-600"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Artifacts Created</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {metrics.artifacts || 0}
                    </span>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-file-alt text-purple-600"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Collaboration & Oversight */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <CollaborationPanel />
              <GovernorPanel />
            </div>

            {/* Active Workflows & Communications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <WorkflowCard tasks={tasks} />
              <CommunicationFeed communications={communications} agents={agents} />
            </div>

            {/* Agent Performance & Artifacts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <AgentPerformanceCard agents={agents} />
              <ArtifactCard artifacts={artifacts} agents={agents} />
            </div>

            {/* Testing Panel */}
            <TestingPanel />
          </div>
        </div>
      </div>

      {/* Task Assignment Modal */}
      <TaskAssignmentModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        agents={agents}
      />

      {/* Agent Chat Modal */}
      <AgentChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        agent={selectedAgent}
      />
    </div>
  );
}
