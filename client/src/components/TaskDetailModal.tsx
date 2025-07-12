import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, User, MessageCircle, FileText, Play, Pause, Edit2, Save } from "lucide-react";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
}

export function TaskDetailModal({ isOpen, onClose, taskId }: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<any>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ["/api/tasks", taskId],
    enabled: !!taskId,
  });

  const { data: communications } = useQuery({
    queryKey: ["/api/tasks", taskId, "communications"],
    enabled: !!taskId,
  });

  const { data: agents } = useQuery({
    queryKey: ["/api/agents"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const processTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tasks/${taskId}/process`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task processing started",
      });
    },
  });

  const handleSave = () => {
    updateTaskMutation.mutate(editedTask);
  };

  const handleEdit = () => {
    setEditedTask(task);
    setIsEditing(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!task) return null;

  const assignedAgent = agents?.find((a: any) => a.id === task.assignedToId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditing ? (
              <Input
                value={editedTask.title || ''}
                onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
                className="flex-1"
              />
            ) : (
              task.title
            )}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} size="sm" disabled={updateTaskMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={handleEdit} size="sm" variant="outline">
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button 
                onClick={() => processTaskMutation.mutate()}
                size="sm"
                disabled={processTaskMutation.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                {processTaskMutation.isPending ? 'Processing...' : 'Process'}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 p-4">
                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  {assignedAgent && (
                    <Badge variant="outline">
                      <User className="h-3 w-3 mr-1" />
                      {assignedAgent.name}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    {isEditing ? (
                      <Select 
                        value={editedTask.status || task.status} 
                        onValueChange={(value) => setEditedTask({...editedTask, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-gray-600">{task.status}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    {isEditing ? (
                      <Select 
                        value={editedTask.priority || task.priority} 
                        onValueChange={(value) => setEditedTask({...editedTask, priority: value})}
                      >
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
                    ) : (
                      <p className="text-sm text-gray-600">{task.priority}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  {isEditing ? (
                    <Textarea
                      value={editedTask.description || ''}
                      onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
                      className="mt-1"
                      rows={6}
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{task.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Created</label>
                    <p className="text-sm text-gray-600">{formatDate(task.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Updated</label>
                    <p className="text-sm text-gray-600">{formatDate(task.updatedAt)}</p>
                  </div>
                </div>

                {task.tags && task.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Tags</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {task.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="communications" className="space-y-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 p-4">
                {communications?.map((comm: any) => (
                  <Card key={comm.id} className="border-l-4 border-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          <span className="font-medium">
                            {comm.fromAgentId ? 
                              agents?.find((a: any) => a.id === comm.fromAgentId)?.name || 'Unknown Agent' : 
                              'User'
                            }
                          </span>
                          {comm.toAgentId && (
                            <>
                              <span className="text-gray-500">→</span>
                              <span className="font-medium">
                                {agents?.find((a: any) => a.id === comm.toAgentId)?.name || 'Unknown Agent'}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatDate(comm.createdAt)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">{comm.message}</p>
                      {comm.metadata && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <pre>{JSON.stringify(comm.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 p-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Workflow Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Stage:</strong> {task.workflow?.stage || 'Not set'}</p>
                      <p><strong>Next Agent:</strong> {task.workflow?.nextAgent || 'Not set'}</p>
                    </div>
                  </CardContent>
                </Card>

                {task.workflow?.history && task.workflow.history.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Workflow History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {task.workflow.history.map((entry: any, index: number) => (
                          <div key={index} className="border-l-2 border-gray-200 pl-4">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{entry.agent}</span>
                              <span className="text-sm text-gray-500">{formatDate(entry.timestamp)}</span>
                            </div>
                            <p className="text-sm text-gray-600">{entry.action}</p>
                            {entry.response && (
                              <p className="text-sm text-gray-700 mt-1">{entry.response}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="artifacts" className="space-y-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 p-4">
                <p className="text-sm text-gray-600">Artifacts generated during task processing will appear here.</p>
                {/* Artifacts will be populated when available */}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}