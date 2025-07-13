import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Send, MessageSquare, Bot, User } from 'lucide-react';

interface Message {
  id: number;
  fromAgentId: number | null;
  toAgentId: number | null;
  taskId: number | null;
  message: string;
  messageType: string;
  createdAt: string;
  metadata: any;
}

interface Agent {
  id: number;
  name: string;
  type: string;
  status: string;
}

export default function Chat() {
  const [message, setMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // WebSocket connection
  const { socket, isConnected } = useWebSocket();

  // Fetch agents
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks'],
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/communications'],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      message: string;
      toAgentId?: number;
      taskId?: number;
    }) => {
      return await apiRequest('/api/communications', {
        method: 'POST',
        body: messageData,
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
    },
  });

  // Auto-create project mutation
  const autoCreateProjectMutation = useMutation({
    mutationFn: async (projectData: {
      description: string;
      title?: string;
      context?: any;
    }) => {
      return await apiRequest('/api/projects/auto-create', {
        method: 'POST',
        body: projectData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (socket) {
      const handleMessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'communication_created') {
          queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
        }
      };

      socket.addEventListener('message', handleMessage);
      return () => socket.removeEventListener('message', handleMessage);
    }
  }, [socket, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    console.log('Submitting message:', message);
    console.log('Selected agent:', selectedAgent);
    console.log('Selected task:', selectedTask);

    const messageData = {
      message: message.trim(),
      toAgentId: selectedAgent ? parseInt(selectedAgent) : undefined,
      taskId: selectedTask ? parseInt(selectedTask) : undefined,
    };

    // Check if message is requesting project creation
    const lowerMessage = message.toLowerCase();
    const projectKeywords = ['create project', 'new project', 'start project', 'build a', 'develop a'];
    const isProjectRequest = projectKeywords.some(keyword => lowerMessage.includes(keyword));

    if (isProjectRequest) {
      autoCreateProjectMutation.mutate({
        description: message,
        context: { selectedAgent, selectedTask }
      });
    } else {
      sendMessageMutation.mutate(messageData);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getAgentName = (agentId: number | null) => {
    if (!agentId) return 'User';
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : `Agent ${agentId}`;
  };

  const getMessageTypeColor = (messageType: string) => {
    switch (messageType) {
      case 'user_message': return 'bg-blue-100 text-blue-800';
      case 'agent_response': return 'bg-green-100 text-green-800';
      case 'task_assignment': return 'bg-purple-100 text-purple-800';
      case 'inter_agent': return 'bg-orange-100 text-orange-800';
      case 'escalation': return 'bg-red-100 text-red-800';
      case 'handoff': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Agent Communication Hub
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Message Display */}
            <ScrollArea className="h-96 border rounded-lg p-4">
              {messagesLoading ? (
                <div className="text-center py-8">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No messages yet. Start a conversation with an agent!
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.fromAgentId ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.fromAgentId 
                            ? 'bg-gray-100 text-gray-900' 
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.fromAgentId ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          <span className="font-medium text-sm">
                            {getAgentName(msg.fromAgentId)}
                          </span>
                          {msg.toAgentId && (
                            <span className="text-xs opacity-70">
                              → {getAgentName(msg.toAgentId)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm">{msg.message}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs opacity-70">
                            {formatTime(msg.createdAt)}
                          </span>
                          <Badge 
                            variant="outline"
                            className={`text-xs ${getMessageTypeColor(msg.messageType)}`}
                          >
                            {msg.messageType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All agents</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name} ({agent.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No task</SelectItem>
                    {tasks.map((task: any) => (
                      <SelectItem key={task.id} value={task.id.toString()}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type your message or create a project..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                  disabled={sendMessageMutation.isPending || autoCreateProjectMutation.isPending}
                />
                <Button 
                  type="submit" 
                  disabled={!message.trim() || sendMessageMutation.isPending || autoCreateProjectMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* Status indicators */}
            <div className="flex gap-2 text-sm text-gray-500">
              <span>
                {sendMessageMutation.isPending ? 'Sending...' : 
                 autoCreateProjectMutation.isPending ? 'Creating project...' : 
                 'Ready'}
              </span>
              <span>•</span>
              <span>{agents.length} agents available</span>
              <span>•</span>
              <span>{tasks.length} tasks active</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}