import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CommunicationFeedProps {
  communications: any[];
  agents: any[];
}

export function CommunicationFeed({ communications, agents }: CommunicationFeedProps) {
  const recentCommunications = communications?.slice(0, 4) || [];
  
  const getAgentName = (agentId: number) => {
    const agent = agents?.find(a => a.id === agentId);
    return agent?.name || "Unknown Agent";
  };

  const getMessageTypeColor = (messageType: string) => {
    switch (messageType) {
      case "handoff":
        return "bg-blue-100 text-blue-800";
      case "escalation":
        return "bg-red-100 text-red-800";
      case "approval":
        return "bg-green-100 text-green-800";
      case "rejection":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case "handoff":
        return "fas fa-exchange-alt";
      case "escalation":
        return "fas fa-exclamation-triangle";
      case "approval":
        return "fas fa-check-circle";
      case "rejection":
        return "fas fa-times-circle";
      default:
        return "fas fa-comment";
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const commDate = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - commDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffMinutes / 1440)}d ago`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Communications</CardTitle>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentCommunications.map((communication) => (
            <div key={communication.id} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className={`${getMessageTypeIcon(communication.messageType)} text-blue-600 text-sm`}></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">
                    {getAgentName(communication.fromAgentId)}
                  </span>
                  <span className="text-xs text-gray-500">→</span>
                  <span className="text-sm text-gray-600">
                    {getAgentName(communication.toAgentId)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(communication.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{communication.message}</p>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getMessageTypeColor(communication.messageType)}`}>
                    {communication.messageType.charAt(0).toUpperCase() + communication.messageType.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {recentCommunications.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-comments text-3xl mb-2"></i>
              <p>No recent communications</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
