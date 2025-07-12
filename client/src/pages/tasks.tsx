import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TopNavigation } from "@/components/TopNavigation";
import { TaskProcessingButton } from "@/components/TaskProcessingButton";
import { Calendar, Clock, User, Bot, AlertCircle } from "lucide-react";

export default function Tasks() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    retry: false,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
    retry: false,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "escalated":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAgentName = (agentId: number) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : "Unassigned";
  };

  const getAgentType = (agentId: number) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.type.replace("_", " ") : "Unknown";
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
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all project tasks</p>
        </div>

        {/* Task Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {tasks.filter(t => t.status === 'in_progress').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'completed').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {tasks.filter(t => t.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.map((task: any) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TaskProcessingButton 
                      taskId={task.id} 
                      variant="outline" 
                      size="sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>Assigned to: {getAgentName(task.assignedToId)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Bot className="h-4 w-4" />
                    <span>Agent: {getAgentType(task.assignedToId)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Workflow Progress */}
                {task.workflow && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Workflow Progress
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Current Stage:</span>
                        <span className="font-medium capitalize">
                          {task.workflow.stage?.replace("_", " ")}
                        </span>
                      </div>
                      {task.workflow.nextAgent && (
                        <div className="flex items-center justify-between text-sm">
                          <span>Next Agent:</span>
                          <span className="font-medium capitalize">
                            {task.workflow.nextAgent.replace("_", " ")}
                          </span>
                        </div>
                      )}
                      {task.workflow.history && task.workflow.history.length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm font-medium">Recent History:</span>
                          <div className="mt-1 max-h-20 overflow-y-auto">
                            {task.workflow.history.slice(-3).map((entry: any, index: number) => (
                              <div key={index} className="text-xs text-gray-600 py-1">
                                {entry.agent} completed {entry.stage} stage
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-16">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600">Create a new task to get started with the agent workflow.</p>
          </div>
        )}
      </div>
    </div>
  );
}