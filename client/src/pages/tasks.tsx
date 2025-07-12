import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TopNavigation } from "@/components/TopNavigation";
import { TaskAssignmentModal } from "@/components/TaskAssignmentModal";

export default function Tasks() {
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    retry: false,
  });

  const { data: agents } = useQuery({
    queryKey: ["/api/agents"],
    retry: false,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "escalated":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-1">Manage and track all system tasks</p>
          </div>
          <Button
            onClick={() => setShowTaskModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <i className="fas fa-plus mr-2"></i>
            New Task
          </Button>
        </div>

        <div className="grid gap-6">
          {tasks?.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{task.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>
                      <i className="fas fa-calendar mr-1"></i>
                      Created {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                    {task.assignedToId && (
                      <span>
                        <i className="fas fa-user mr-1"></i>
                        Assigned to Agent {task.assignedToId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <i className="fas fa-eye mr-1"></i>
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <i className="fas fa-edit mr-1"></i>
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(!tasks || tasks.length === 0) && (
            <div className="text-center py-16">
              <i className="fas fa-tasks text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks yet</h3>
              <p className="text-gray-600 mb-6">Get started by creating your first task.</p>
              <Button
                onClick={() => setShowTaskModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <i className="fas fa-plus mr-2"></i>
                Create Task
              </Button>
            </div>
          )}
        </div>
      </div>

      <TaskAssignmentModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        agents={agents}
      />
    </div>
  );
}
