import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TopNavigation } from "@/components/TopNavigation";
import { AgentDetailModal } from "@/components/AgentDetailModal";
import { Bot, Activity, Clock, AlertCircle, CheckCircle, Zap, Eye } from "lucide-react";

export default function Agents() {
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { data: agents, isLoading } = useQuery({
    queryKey: ["/api/agents"],
    retry: false,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    retry: false,
  });

  const { data: communications = [] } = useQuery({
    queryKey: ["/api/communications"],
    retry: false,
  });

  const handleViewDetails = (agent: any) => {
    setSelectedAgent(agent);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "busy":
        return "bg-yellow-100 text-yellow-800";
      case "unhealthy":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case "product_manager":
        return "fas fa-user-tie";
      case "business_analyst":
        return "fas fa-chart-line";
      case "developer":
        return "fas fa-code";
      case "qa_engineer":
        return "fas fa-bug";
      case "product_owner":
        return "fas fa-crown";
      case "engineering_lead":
        return "fas fa-users-cog";
      default:
        return "fas fa-user";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavigation />
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all system agents</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents?.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className={`${getAgentIcon(agent.type)} text-blue-600 text-lg`}></i>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <p className="text-sm text-gray-600 capitalize">
                        {agent.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(agent.status)}>
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Current Load</span>
                      <span className="text-sm text-gray-600">
                        {agent.currentLoad}/{agent.maxLoad}
                      </span>
                    </div>
                    <Progress 
                      value={(agent.currentLoad / agent.maxLoad) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Health Score</span>
                      <span className="text-sm text-gray-600">{agent.healthScore}%</span>
                    </div>
                    <Progress 
                      value={agent.healthScore} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Last Activity</span>
                      <span>
                        {new Date(agent.lastActivity).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities?.skills?.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => handleViewDetails(agent)}
                      className="w-full"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {(!agents || agents.length === 0) && (
          <div className="text-center py-16">
            <i className="fas fa-robot text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No agents found</h3>
            <p className="text-gray-600">Agents will appear here once they are initialized.</p>
          </div>
        )}
      </div>

      {/* Agent Detail Modal */}
      <AgentDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        agent={selectedAgent}
        tasks={tasks}
        communications={communications}
      />
    </div>
  );
}
