import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkflowCardProps {
  tasks: any[];
}

export function WorkflowCard({ tasks }: WorkflowCardProps) {
  const activeWorkflows = tasks?.filter(t => t.status === "in_progress").slice(0, 3) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-blue-600";
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "escalated":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "escalated":
        return "Escalated";
      default:
        return "Pending";
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const taskDate = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - taskDate.getTime()) / (1000 * 60));
    
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
          <CardTitle className="text-lg font-semibold text-gray-900">Active Workflows</CardTitle>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeWorkflows.map((workflow) => (
            <div key={workflow.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(workflow.status)}`}></div>
                  <h4 className="font-medium text-gray-900">{workflow.title}</h4>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {getStatusText(workflow.status)}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-clock text-gray-400"></i>
                  <span>{formatTimeAgo(workflow.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-flag text-gray-400"></i>
                  <span>{workflow.priority}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                {['PM', 'BA', 'DEV', 'QA', 'PO'].map((stage, index) => (
                  <div key={stage} className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      index === 0 ? 'bg-green-500' : 
                      index === 1 ? 'bg-green-500' : 
                      index === 2 ? 'bg-yellow-500' : 
                      'bg-gray-300'
                    }`}></div>
                    <span className="text-xs text-gray-600">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {activeWorkflows.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-tasks text-3xl mb-2"></i>
              <p>No active workflows</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
