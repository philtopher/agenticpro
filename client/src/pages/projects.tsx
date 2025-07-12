import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Plus, Calendar, Users, Target, Zap, Clock, CheckCircle } from "lucide-react";

const PROJECT_TYPES = [
  { id: "web_app", name: "Web Application", icon: "🌐" },
  { id: "mobile_app", name: "Mobile App", icon: "📱" },
  { id: "api", name: "API Service", icon: "🔗" },
  { id: "desktop_app", name: "Desktop Application", icon: "🖥️" },
  { id: "data_analysis", name: "Data Analysis", icon: "📊" },
  { id: "automation", name: "Automation Script", icon: "🤖" },
];

const METHODOLOGY_TYPES = [
  { id: "agile", name: "Agile/Scrum", description: "Iterative development with sprints" },
  { id: "kanban", name: "Kanban", description: "Continuous flow with work-in-progress limits" },
  { id: "waterfall", name: "Waterfall", description: "Sequential development phases" },
];

export default function Projects() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    type: "",
    methodology: "",
    requirements: "",
    acceptanceCriteria: "",
    estimatedHours: "",
    priority: "medium",
  });

  const queryClient = useQueryClient();
  const { sendMessage } = useWebSocket();

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      return await apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify(projectData),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowCreateDialog(false);
      setNewProject({
        title: "",
        description: "",
        type: "",
        methodology: "",
        requirements: "",
        acceptanceCriteria: "",
        estimatedHours: "",
        priority: "medium",
      });
      
      // Notify agents about new project
      sendMessage({
        type: "project_created",
        data: { project: newProject },
      });
    },
  });

  const handleCreateProject = () => {
    if (!newProject.title || !newProject.description || !newProject.type || !newProject.methodology) {
      return;
    }

    const projectData = {
      title: newProject.title,
      description: newProject.description,
      status: "pending",
      priority: newProject.priority,
      assignedToId: null, // Will be assigned to Product Manager automatically
      workflow: {
        type: newProject.methodology,
        currentStage: "requirements",
        stages: newProject.methodology === "agile" 
          ? ["requirements", "planning", "development", "testing", "review", "deployment"]
          : newProject.methodology === "kanban"
          ? ["backlog", "to_do", "in_progress", "testing", "done"]
          : ["requirements", "design", "development", "testing", "deployment"],
        projectType: newProject.type,
      },
      requirements: newProject.requirements ? [newProject.requirements] : [],
      acceptanceCriteria: newProject.acceptanceCriteria ? [newProject.acceptanceCriteria] : [],
      estimatedHours: newProject.estimatedHours ? parseInt(newProject.estimatedHours) : null,
      tags: [newProject.type, newProject.methodology],
    };

    createProjectMutation.mutate(projectData);
  };

  const projects = tasks.filter((task: any) => task.workflow?.projectType);
  const regularTasks = tasks.filter((task: any) => !task.workflow?.projectType);

  const getProjectProgress = (project: any) => {
    const workflow = project.workflow;
    if (!workflow?.stages) return 0;
    
    const currentStageIndex = workflow.stages.findIndex((stage: string) => stage === workflow.currentStage);
    return Math.round(((currentStageIndex + 1) / workflow.stages.length) * 100);
  };

  const getProjectTypeIcon = (type: string) => {
    const projectType = PROJECT_TYPES.find(pt => pt.id === type);
    return projectType ? projectType.icon : "📁";
  };

  const getBoardColumns = (methodology: string) => {
    switch (methodology) {
      case "agile":
        return [
          { id: "requirements", name: "Requirements", color: "bg-red-100 text-red-800" },
          { id: "planning", name: "Planning", color: "bg-yellow-100 text-yellow-800" },
          { id: "development", name: "Development", color: "bg-blue-100 text-blue-800" },
          { id: "testing", name: "Testing", color: "bg-purple-100 text-purple-800" },
          { id: "review", name: "Review", color: "bg-orange-100 text-orange-800" },
          { id: "deployment", name: "Deployment", color: "bg-green-100 text-green-800" },
        ];
      case "kanban":
        return [
          { id: "backlog", name: "Backlog", color: "bg-gray-100 text-gray-800" },
          { id: "to_do", name: "To Do", color: "bg-red-100 text-red-800" },
          { id: "in_progress", name: "In Progress", color: "bg-blue-100 text-blue-800" },
          { id: "testing", name: "Testing", color: "bg-purple-100 text-purple-800" },
          { id: "done", name: "Done", color: "bg-green-100 text-green-800" },
        ];
      default:
        return [
          { id: "requirements", name: "Requirements", color: "bg-red-100 text-red-800" },
          { id: "design", name: "Design", color: "bg-yellow-100 text-yellow-800" },
          { id: "development", name: "Development", color: "bg-blue-100 text-blue-800" },
          { id: "testing", name: "Testing", color: "bg-purple-100 text-purple-800" },
          { id: "deployment", name: "Deployment", color: "bg-green-100 text-green-800" },
        ];
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Project Management</h1>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Project Title</label>
                  <Input
                    placeholder="Enter project title"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select value={newProject.priority} onValueChange={(value) => setNewProject({ ...newProject, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Describe your project..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Project Type</label>
                  <Select value={newProject.type} onValueChange={(value) => setNewProject({ ...newProject, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.icon} {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Methodology</label>
                  <Select value={newProject.methodology} onValueChange={(value) => setNewProject({ ...newProject, methodology: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select methodology" />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODOLOGY_TYPES.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Requirements</label>
                <Textarea
                  placeholder="List the main requirements..."
                  value={newProject.requirements}
                  onChange={(e) => setNewProject({ ...newProject, requirements: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Acceptance Criteria</label>
                <Textarea
                  placeholder="Define what success looks like..."
                  value={newProject.acceptanceCriteria}
                  onChange={(e) => setNewProject({ ...newProject, acceptanceCriteria: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Estimated Hours</label>
                <Input
                  type="number"
                  placeholder="Enter estimated hours"
                  value={newProject.estimatedHours}
                  onChange={(e) => setNewProject({ ...newProject, estimatedHours: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="board">Project Board</TabsTrigger>
          <TabsTrigger value="tasks">Individual Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-gray-600 mb-4">Create your first project to get started with multi-agent development</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project: any) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedProject(project)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getProjectTypeIcon(project.workflow?.projectType)}</span>
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                      </div>
                      <Badge variant={project.status === "completed" ? "default" : "outline"}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{getProjectProgress(project)}%</span>
                        </div>
                        <Progress value={getProjectProgress(project)} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Methodology</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {project.workflow?.type || "Unknown"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>Priority</span>
                        </div>
                        <Badge variant={project.priority === "high" || project.priority === "urgent" ? "destructive" : "outline"}>
                          {project.priority}
                        </Badge>
                      </div>
                      
                      {project.estimatedHours && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Estimated</span>
                          </div>
                          <span>{project.estimatedHours}h</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="board" className="space-y-4">
          {selectedProject ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{selectedProject.title} Board</h2>
                <Badge variant="outline">{selectedProject.workflow?.type || "Unknown"} Board</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {getBoardColumns(selectedProject.workflow?.type || "agile").map((column) => (
                  <Card key={column.id} className="min-h-[300px]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        <Badge className={column.color}>{column.name}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {column.id === selectedProject.workflow?.currentStage && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Current Stage</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {selectedProject.title}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a project</h3>
                <p className="text-gray-600">Choose a project from the Projects tab to view its board</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {regularTasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No individual tasks</h3>
                <p className="text-gray-600">All tasks are part of projects. Individual tasks will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {regularTasks.map((task: any) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span>Priority: {task.priority}</span>
                      </div>
                      {task.estimatedHours && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{task.estimatedHours}h</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}