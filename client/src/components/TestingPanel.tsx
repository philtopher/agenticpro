import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlayCircle, Zap, Users, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

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

export function TestingPanel() {
  const [selectedProjectType, setSelectedProjectType] = useState("");
  const [selectedMethodology, setSelectedMethodology] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const { sendMessage, lastMessage } = useWebSocket();

  const testWorkflowMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/test/workflow", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (result) => {
      setTestResults(prev => [...prev, {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: "workflow_test",
        status: "success",
        data: result,
      }]);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
    },
    onError: (error) => {
      setTestResults(prev => [...prev, {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: "workflow_test",
        status: "error",
        error: error.message,
      }]);
    }
  });

  const testAgentCommunicationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/agents/${data.agentId}/communicate`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (result) => {
      setTestResults(prev => [...prev, {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: "communication_test",
        status: "success",
        data: result,
      }]);
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
    },
    onError: (error) => {
      setTestResults(prev => [...prev, {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: "communication_test",
        status: "error",
        error: error.message,
      }]);
    }
  });

  const handleTestWorkflow = () => {
    if (!selectedProjectType || !selectedMethodology) return;

    testWorkflowMutation.mutate({
      projectType: selectedProjectType,
      methodology: selectedMethodology,
    });
  };

  const handleTestAgentCommunication = () => {
    // Test communication with Product Manager (assuming agent ID 1)
    testAgentCommunicationMutation.mutate({
      agentId: 1,
      message: "Hello! This is a test message to verify agent communication functionality.",
      messageType: "test_message",
    });
  };

  const handleTestTaskAssignment = () => {
    // Create a test task and assign it to agents
    const testTask = {
      title: "Test Task Assignment",
      description: "Testing automatic task assignment and handover between agents",
      priority: "medium",
      workflow: {
        type: "agile",
        currentStage: "requirements",
        stages: ["requirements", "planning", "development", "testing", "review", "deployment"],
      },
      requirements: ["Test requirement for task assignment"],
      acceptanceCriteria: ["Task should be assigned to appropriate agent"],
      estimatedHours: 8,
      tags: ["test", "assignment"],
    };

    // Send via WebSocket to trigger real-time assignment
    sendMessage({
      type: "test_task_assignment",
      data: testTask,
    });

    setTestResults(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: "task_assignment_test",
      status: "initiated",
      data: testTask,
    }]);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Multi-Agent Testing Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="workflow">Workflow Testing</TabsTrigger>
              <TabsTrigger value="communication">Agent Communication</TabsTrigger>
              <TabsTrigger value="assignment">Task Assignment</TabsTrigger>
            </TabsList>

            <TabsContent value="workflow" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Project Type</label>
                  <Select value={selectedProjectType} onValueChange={setSelectedProjectType}>
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
                  <Select value={selectedMethodology} onValueChange={setSelectedMethodology}>
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

              <Button 
                onClick={handleTestWorkflow}
                disabled={!selectedProjectType || !selectedMethodology || testWorkflowMutation.isPending}
                className="w-full"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {testWorkflowMutation.isPending ? "Testing..." : "Test Multi-Agent Workflow"}
              </Button>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will create a test project and trigger the full agent workflow from requirements gathering to deployment.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="communication" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Test Agent Communication</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Test direct communication with agents to verify messaging and response functionality.
                  </p>
                </div>

                <Button 
                  onClick={handleTestAgentCommunication}
                  disabled={testAgentCommunicationMutation.isPending}
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {testAgentCommunicationMutation.isPending ? "Testing..." : "Test Agent Communication"}
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will send a test message to the Product Manager agent and verify the communication system works.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="assignment" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Test Task Assignment & Handover</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Test automatic task assignment and handover between agents based on workflow stages.
                  </p>
                </div>

                <Button 
                  onClick={handleTestTaskAssignment}
                  className="w-full"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Test Task Assignment Flow
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will create a test task and demonstrate how agents automatically assign and hand over tasks.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Results</CardTitle>
              <Button variant="outline" size="sm" onClick={clearTestResults}>
                Clear Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result) => (
                <div key={result.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.status === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : result.status === "error" ? (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-blue-600" />
                      )}
                      <span className="font-medium">{result.type.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.status === "success" ? "default" : result.status === "error" ? "destructive" : "secondary"}>
                        {result.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {result.error}
                    </div>
                  )}
                  
                  {result.data && (
                    <div className="text-sm bg-gray-50 p-2 rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}