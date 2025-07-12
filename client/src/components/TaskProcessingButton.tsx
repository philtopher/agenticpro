import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bot, Loader2 } from "lucide-react";

interface TaskProcessingButtonProps {
  taskId: number;
  variant?: "default" | "outline" | "secondary";
  size?: "sm" | "default" | "lg";
}

export function TaskProcessingButton({ 
  taskId, 
  variant = "default", 
  size = "default" 
}: TaskProcessingButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const processTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tasks/${taskId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task processing started. Agents are working on it!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artifacts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start task processing. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      onClick={() => processTaskMutation.mutate()}
      disabled={processTaskMutation.isPending}
      variant={variant}
      size={size}
      className="flex items-center gap-2"
    >
      {processTaskMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bot className="h-4 w-4" />
      )}
      {processTaskMutation.isPending ? "Processing..." : "Process with AI"}
    </Button>
  );
}