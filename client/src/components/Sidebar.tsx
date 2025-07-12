import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentStatusCard } from "@/components/AgentStatusCard";
import { 
  Home, 
  CheckSquare, 
  Users, 
  FileText, 
  Plus, 
  MessageCircle,
  FolderOpen,
  Activity,
  AlertCircle
} from "lucide-react";

interface SidebarProps {
  agents: any[];
  onNewTask: () => void;
}

export function Sidebar({ agents, onNewTask }: SidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    { path: "/", icon: Home, label: "Dashboard" },
    { path: "/tasks", icon: CheckSquare, label: "Tasks" },
    { path: "/agents", icon: Users, label: "Agents" },
    { path: "/artifacts", icon: FileText, label: "Artifacts" },
    { path: "/chat", icon: MessageCircle, label: "Agent Chat" },
    { path: "/projects", icon: FolderOpen, label: "Projects" },
  ];

  const activeAgents = agents?.filter(agent => agent.status === "active").length || 0;
  const busyAgents = agents?.filter(agent => agent.status === "busy").length || 0;
  const unhealthyAgents = agents?.filter(agent => agent.status === "unhealthy").length || 0;

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">AgentFlow</h1>
        </div>
        
        <Button
          onClick={onNewTask}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>
      
      <div className="flex-1 px-6 pb-6">
        <div className="space-y-6">
          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Navigation
            </h3>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <a
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {item.label}
                    </a>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Agent Status Summary */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Agent Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Active</span>
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  {activeAgents}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Busy</span>
                <Badge variant="default" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                  {busyAgents}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Issues</span>
                <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                  {unhealthyAgents}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link href="/tasks">
                <a className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <CheckSquare className="h-4 w-4 text-gray-400" />
                  <span>View All Tasks</span>
                </a>
              </Link>
              <Link href="/chat">
                <a className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4 text-gray-400" />
                  <span>Chat with Agents</span>
                </a>
              </Link>
              <Link href="/projects">
                <a className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <FolderOpen className="h-4 w-4 text-gray-400" />
                  <span>Create Project</span>
                </a>
              </Link>
              <button className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <span>Escalated Issues</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
