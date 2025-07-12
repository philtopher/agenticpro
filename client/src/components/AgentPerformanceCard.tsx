import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AgentPerformanceCardProps {
  agents: any[];
}

export function AgentPerformanceCard({ agents }: AgentPerformanceCardProps) {
  const getPerformanceColor = (score: number) => {
    if (score >= 95) return "text-green-600";
    if (score >= 85) return "text-yellow-600";
    return "text-red-600";
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Agent Performance</CardTitle>
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agents?.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className={`${getAgentIcon(agent.type)} text-blue-600 text-sm`}></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{agent.name}</p>
                  <p className="text-xs text-gray-600">{agent.currentLoad} active tasks</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${getPerformanceColor(agent.healthScore)}`}>
                  {agent.healthScore}%
                </p>
                <p className="text-xs text-gray-600">Health Score</p>
              </div>
            </div>
          ))}
          
          {(!agents || agents.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-chart-bar text-3xl mb-2"></i>
              <p>No agent performance data</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
