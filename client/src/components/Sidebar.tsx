import { Button } from "@/components/ui/button";
import { AgentStatusCard } from "@/components/AgentStatusCard";

interface SidebarProps {
  agents: any[];
  onNewTask: () => void;
}

export function Sidebar({ agents, onNewTask }: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <Button
          onClick={onNewTask}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <i className="fas fa-plus mr-2"></i>
          New Task
        </Button>
      </div>
      
      <div className="flex-1 px-6 pb-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Agent Status
            </h3>
            <div className="space-y-2">
              {agents?.map((agent) => (
                <AgentStatusCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button className="w-full text-left p-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 flex items-center space-x-2">
                <i className="fas fa-tasks text-gray-400"></i>
                <span>View All Tasks</span>
              </button>
              <button className="w-full text-left p-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 flex items-center space-x-2">
                <i className="fas fa-exclamation-triangle text-gray-400"></i>
                <span>Escalated Issues</span>
              </button>
              <button className="w-full text-left p-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 flex items-center space-x-2">
                <i className="fas fa-chart-line text-gray-400"></i>
                <span>Performance Metrics</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
