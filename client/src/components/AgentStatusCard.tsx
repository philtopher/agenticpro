interface AgentStatusCardProps {
  agent: {
    id: number;
    name: string;
    status: string;
    currentLoad: number;
    maxLoad: number;
    healthScore: number;
  };
}

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "busy":
        return "bg-yellow-500";
      case "unhealthy":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "busy":
        return "Busy";
      case "unhealthy":
        return "Unhealthy";
      default:
        return "Offline";
    }
  };

  return (
    <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
      <div className="flex items-center space-x-3">
        <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></div>
        <div>
          <span className="text-sm font-medium text-gray-900">{agent.name}</span>
          <div className="text-xs text-gray-500">
            {agent.currentLoad}/{agent.maxLoad} tasks
          </div>
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs text-gray-500">{getStatusText(agent.status)}</span>
        <div className="text-xs text-gray-400">
          {agent.healthScore}%
        </div>
      </div>
    </div>
  );
}
