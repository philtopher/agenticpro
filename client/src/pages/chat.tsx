import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Bot, User } from "lucide-react";

export default function Chat() {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [taskId, setTaskId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { sendMessage } = useWebSocket();

  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: communications = [] } = useQuery({
    queryKey: ["/api/communications"],
  });

  const sendCommunicationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/communicate", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      setMessage("");
    },
  });

  const selectedAgentData = agents.find((agent: any) => agent.id === selectedAgent);
  const filteredCommunications = selectedAgent
    ? communications.filter((comm: any) => 
        comm.fromAgentId === selectedAgent || comm.toAgentId === selectedAgent
      )
    : communications;

  const handleSendMessage = () => {
    console.log("handleSendMessage called");
    console.log("message:", message);
    console.log("selectedAgent:", selectedAgent);
    console.log("message.trim():", message.trim());
    
    if (!message.trim() || !selectedAgent) {
      console.log("Validation failed - message or agent not selected");
      return;
    }

    const communicationData = {
      fromAgentId: null, // User message
      toAgentId: selectedAgent,
      taskId: taskId,
      message: message.trim(),
      messageType: "user_message",
      metadata: {
        timestamp: new Date().toISOString(),
        userInitiated: true,
      },
    };

    console.log("Sending communication data:", communicationData);
    sendCommunicationMutation.mutate(communicationData);
    
    // Send WebSocket message for real-time updates
    sendMessage({
      type: "user_message",
      data: communicationData,
    });
  };

  const handleAgentResponse = (agentId: number, responseMessage: string) => {
    const responseData = {
      fromAgentId: agentId,
      toAgentId: null, // Response to user
      taskId: taskId,
      message: responseMessage,
      messageType: "agent_response",
      metadata: {
        timestamp: new Date().toISOString(),
        isResponse: true,
      },
    };

    sendCommunicationMutation.mutate(responseData);
    
    sendMessage({
      type: "agent_response",
      data: responseData,
    });
  };

  const getAgentName = (agentId: number) => {
    const agent = agents.find((a: any) => a.id === agentId);
    return agent ? agent.name : "Unknown Agent";
  };

  const getAgentType = (agentId: number) => {
    const agent = agents.find((a: any) => a.id === agentId);
    return agent ? agent.type : "unknown";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Agent Chat</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Selection & Chat Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Chat Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Agent</label>
              <Select value={selectedAgent?.toString() || ""} onValueChange={(value) => setSelectedAgent(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent to chat with" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name} - {agent.type.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Related Task (Optional)</label>
              <Select value={taskId?.toString() || "none"} onValueChange={(value) => setTaskId(value === "none" ? null : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to a task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No task selected</SelectItem>
                  {tasks.map((task: any) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.title} - {task.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAgentData && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{selectedAgentData.name}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedAgentData.type.replace("_", " ")} - {selectedAgentData.status}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  Load: {selectedAgentData.currentLoad}/{selectedAgentData.maxLoad} | 
                  Health: {selectedAgentData.healthScore}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedAgent ? `Chat with ${getAgentName(selectedAgent)}` : "Select an agent to start chatting"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full border rounded-md p-4 mb-4">
              {filteredCommunications.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No messages yet. Start a conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCommunications.map((comm: any) => (
                    <div
                      key={comm.id}
                      className={`flex items-start gap-3 ${
                        comm.fromAgentId === null ? "justify-end" : "justify-start"
                      }`}
                    >
                      {comm.fromAgentId !== null && (
                        <div className="flex-shrink-0">
                          <Bot className="h-8 w-8 p-1 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600" />
                        </div>
                      )}
                      <div className={`max-w-xs lg:max-w-md ${comm.fromAgentId === null ? "order-first" : ""}`}>
                        <div
                          className={`p-3 rounded-lg ${
                            comm.fromAgentId === null
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 dark:bg-gray-800"
                          }`}
                        >
                          <p className="text-sm">{comm.message}</p>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {comm.fromAgentId === null ? "You" : getAgentName(comm.fromAgentId)} • 
                          {new Date(comm.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      {comm.fromAgentId === null && (
                        <div className="flex-shrink-0">
                          <User className="h-8 w-8 p-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder={selectedAgent ? `Type a message to ${getAgentName(selectedAgent)}...` : "Select an agent first"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={!selectedAgent}
                rows={3}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Button clicked");
                  handleSendMessage();
                }}
                disabled={!selectedAgent || !message.trim() || sendCommunicationMutation.isPending}
                className="self-end"
                type="button"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Actions */}
            {selectedAgent && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage("What tasks are you currently working on?")}
                >
                  Ask about current tasks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage("Can you help me with a new project?")}
                >
                  Request project help
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage("What's your current workload?")}
                >
                  Check workload
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage("Do you need any clarification on requirements?")}
                >
                  Ask for clarification
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent: any) => (
              <div
                key={agent.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedAgent === agent.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                onClick={() => setSelectedAgent(agent.id)}
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-8 w-8 text-blue-600" />
                  <div className="flex-1">
                    <h3 className="font-medium">{agent.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {agent.type.replace("_", " ")}
                    </p>
                  </div>
                  <Badge variant={agent.status === "active" ? "default" : "secondary"}>
                    {agent.status}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Load: {agent.currentLoad}/{agent.maxLoad} | Health: {agent.healthScore}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}