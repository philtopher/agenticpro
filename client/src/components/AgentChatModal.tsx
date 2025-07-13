import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Bot, User } from "lucide-react";
import Draggable from 'react-draggable';

interface AgentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: any;
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

export function AgentChatModal({ isOpen, onClose, agent }: AgentChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const { toast } = useToast();

  // Fetch persistent chat history between user and agent
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/communications", agent?.id],
    enabled: !!agent,
    select: (data: any[]) =>
      data
        .filter(
          (msg) =>
            (msg.fromAgentId === agent?.id || msg.toAgentId === agent?.id)
        )
        .map((msg) => ({
          id: msg.id.toString(),
          role: msg.fromAgentId === agent?.id ? ("agent" as const) : ("user" as const),
          content: msg.message,
          timestamp: new Date(msg.createdAt),
        })),
  });

  // Sync persistent history into local state when opening
  useEffect(() => {
    if (isOpen && agent && history && history.length > 0) {
      setMessages(history);
    } else if (isOpen && agent && (!history || history.length === 0)) {
      // Show welcome message if no history
      setMessages([
        {
          id: Date.now().toString(),
          role: "agent",
          content: `Hello! I'm ${agent.name}, your ${agent.type.replace(/_/g, ' ')}. I'm here to help with any questions or tasks you have. How can I assist you today?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, agent, history]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", `/api/agents/${agent.id}/chat`, {
        message,
        context: {
          agentType: agent.type,
          agentName: agent.name,
          previousMessages: messages.slice(-5) // Last 5 messages for context
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      const agentMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "agent",
        content: data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    
    // Send to agent for AI response
    sendMessageMutation.mutate(inputMessage.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Messenger-style and draggable modal
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <Draggable handle=".messenger-header">
        <div>
          <DialogContent className="sm:max-w-[400px] h-[600px] flex flex-col rounded-2xl shadow-2xl bg-white p-0 overflow-hidden">
            <div className="messenger-header cursor-move bg-blue-600 text-white flex items-center justify-between px-4 py-3 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-white" />
                <span className="font-semibold">Chat with {agent?.name}</span>
              </div>
              <button onClick={onClose} className="text-white hover:text-gray-200 text-xl font-bold">×</button>
            </div>
            <div className="flex-1 flex flex-col space-y-4 p-4 pb-2 bg-gray-50">
              <ScrollArea className="flex-1 pr-2">
                <div className="space-y-4">
                  {historyLoading ? (
                    <div className="text-center text-gray-400">Loading chat history...</div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-800 border'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            {message.role === 'agent' && (
                              <Bot className="h-4 w-4 mt-1 flex-shrink-0 text-blue-600" />
                            )}
                            {message.role === 'user' && (
                              <User className="h-4 w-4 mt-1 flex-shrink-0 text-white" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm break-words">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                              }`}>
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {sendMessageMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-white border p-3 rounded-2xl shadow-sm">
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-600">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <form
                className="flex space-x-2 mt-2"
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <Input
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  disabled={sendMessageMutation.isPending}
                  className="rounded-full bg-white border px-4 py-2 flex-1"
                  autoFocus
                />
                <Button
                  type="submit"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                  size="icon"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </DialogContent>
        </div>
      </Draggable>
    </Dialog>
  );
}