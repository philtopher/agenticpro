import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ArtifactCardProps {
  artifacts: any[];
  agents: any[];
}

export function ArtifactCard({ artifacts, agents }: ArtifactCardProps) {
  const recentArtifacts = artifacts?.slice(0, 4) || [];
  
  const getAgentName = (agentId: number) => {
    const agent = agents?.find(a => a.id === agentId);
    return agent?.name || "Unknown Agent";
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case "code":
        return "fas fa-file-code";
      case "specification":
        return "fas fa-file-alt";
      case "test_case":
        return "fas fa-vial";
      case "documentation":
        return "fas fa-book";
      case "report":
        return "fas fa-chart-pie";
      default:
        return "fas fa-file";
    }
  };

  const getArtifactColor = (type: string) => {
    switch (type) {
      case "code":
        return "bg-blue-100 text-blue-600";
      case "specification":
        return "bg-green-100 text-green-600";
      case "test_case":
        return "bg-purple-100 text-purple-600";
      case "documentation":
        return "bg-yellow-100 text-yellow-600";
      case "report":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const artifactDate = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - artifactDate.getTime()) / (1000 * 60));
    
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
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Artifacts</CardTitle>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentArtifacts.map((artifact) => (
            <div key={artifact.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getArtifactColor(artifact.type)}`}>
                <i className={`${getArtifactIcon(artifact.type)} text-sm`}></i>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{artifact.name}</p>
                <p className="text-xs text-gray-600">{artifact.description}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {getAgentName(artifact.createdById)}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(artifact.createdAt)}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">v{artifact.version}</span>
                </div>
              </div>
              <i className="fas fa-download text-gray-400 text-sm"></i>
            </div>
          ))}
          
          {recentArtifacts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-file-alt text-3xl mb-2"></i>
              <p>No recent artifacts</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
