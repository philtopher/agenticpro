import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: any[];
}

export function TaskAssignmentModal({ isOpen, onClose, agents }: TaskAssignmentModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [tags, setTags] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify(taskData),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task created and assigned successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      onClose();
      resetForm();
    },
    onError: (error) => {
      console.error("Task creation error:", error);
      toast({
        title: "Error", 
        description: `Failed to create task: ${error.message || "Please try again."}`,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setPriority("medium");
    setTags([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Form submitted with data:", {
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      priority,
      tags
    });
    
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      assignedToId: assignedTo ? parseInt(assignedTo) : undefined,
      tags: tags.length > 0 ? tags : undefined,
      workflow: {
        stage: "requirements",
        nextAgent: "product_manager",
        history: []
      }
    };

    console.log("Task data being sent:", taskData);
    createTaskMutation.mutate(taskData);
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6" aria-describedby="task-assignment-description">
        <DialogHeader>
          <DialogTitle>Assign New Task</DialogTitle>
          <div id="task-assignment-description" className="sr-only">
            Create and assign a new task to one of the AI agents
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task requirements..."
              rows={3}
              className="resize-none"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign To
              </label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center space-x-1"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => addTag("Feature")}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm border border-dashed border-gray-300 hover:border-gray-400 transition-colors"
              >
                <i className="fas fa-plus mr-1"></i>Feature
              </button>
              <button
                type="button"
                onClick={() => addTag("Bug Fix")}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm border border-dashed border-gray-300 hover:border-gray-400 transition-colors"
              >
                <i className="fas fa-plus mr-1"></i>Bug Fix
              </button>
              <button
                type="button"
                onClick={() => addTag("Enhancement")}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm border border-dashed border-gray-300 hover:border-gray-400 transition-colors"
              >
                <i className="fas fa-plus mr-1"></i>Enhancement
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createTaskMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              {createTaskMutation.isPending ? "Creating..." : "Assign Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
