import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bot, Activity, Clock, CheckCircle, AlertCircle, Zap } from "lucide-react";

interface AgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: any;
  tasks: any[];
  communications: any[];
}

export function AgentDetailModal({ isOpen, onClose, agent, tasks, communications }: AgentDetailModalProps) {
  if (!agent) return null;

  const agentTasks = tasks.filter(task => task.assignedToId === agent.id);
  const agentCommunications = communications.filter(comm => 
    comm.fromAgentId === agent.id || comm.toAgentId === agent.id
  ).slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "busy":
        return "bg-yellow-100 text-yellow-800";
      case "idle":
        return "bg-blue-100 text-blue-800";
      case "unhealthy":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case "product_manager":
        return "👨‍💼";
      case "business_analyst":
        return "📊";
      case "developer":
        return "💻";
      case "qa_engineer":
        return "🧪";
      case "product_owner":
        return "📋";
      case "engineering_lead":
        return "🔧";
      default:
        return "🤖";
    }
  };

  const loadPercentage = agent.maxLoad > 0 ? (agent.currentLoad / agent.maxLoad) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">{getAgentIcon(agent.type)}</span>
            <div>
              <h2 className="text-xl font-bold">{agent.name}</h2>
              <p className="text-sm text-gray-600">{agent.type.replace("_", " ")}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agent Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(agent.status)}>
                    {agent.status}
                  </Badge>
                  <Activity className="h-4 w-4 text-gray-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{agent.healthScore}%</span>
                  {agent.healthScore >= 80 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : agent.healthScore >= 60 ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Workload</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {agent.currentLoad}/{agent.maxLoad} tasks
                    </span>
                    <span className="text-sm font-medium">
                      {loadPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={loadPercentage} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Capabilities & Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Primary Responsibilities</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {agent.type === "product_manager" && (
                      <>
                        <li>• Requirements gathering and analysis</li>
                        <li>• Project scope definition</li>
                        <li>• Stakeholder communication</li>
                        <li>• Feature prioritization</li>
                      </>
                    )}
                    {agent.type === "business_analyst" && (
                      <>
                        <li>• User story creation</li>
                        <li>• Process documentation</li>
                        <li>• Business requirements analysis</li>
                        <li>• Workflow design</li>
                      </>
                    )}
                    {agent.type === "developer" && (
                      <>
                        <li>• Code implementation</li>
                        <li>• Technical architecture</li>
                        <li>• Code review and optimization</li>
                        <li>• Bug fixing and maintenance</li>
                      </>
                    )}
                    {agent.type === "qa_engineer" && (
                      <>
                        <li>• Test case creation</li>
                        <li>• Quality assurance testing</li>
                        <li>• Bug detection and reporting</li>
                        <li>• Test automation</li>
                      </>
                    )}
                    {agent.type === "product_owner" && (
                      <>
                        <li>• Product vision alignment</li>
                        <li>• Final approval decisions</li>
                        <li>• Release planning</li>
                        <li>• Business validation</li>
                      </>
                    )}
                    {agent.type === "engineering_lead" && (
                      <>
                        <li>• Technical leadership</li>
                        <li>• Team coordination</li>
                        <li>• Architecture decisions</li>
                        <li>• Code quality oversight</li>
                      </>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Skills & Expertise</h4>
                  <div className="flex flex-wrap gap-1">
                    {agent.type === "product_manager" && (
                      <>
                        <Badge variant="secondary">Project Management</Badge>
                        <Badge variant="secondary">Requirements Analysis</Badge>
                        <Badge variant="secondary">Stakeholder Management</Badge>
                      </>
                    )}
                    {agent.type === "business_analyst" && (
                      <>
                        <Badge variant="secondary">Business Analysis</Badge>
                        <Badge variant="secondary">Process Modeling</Badge>
                        <Badge variant="secondary">Documentation</Badge>
                      </>
                    )}
                    {agent.type === "developer" && (
                      <>
                        <Badge variant="secondary">Full-Stack Development</Badge>
                        <Badge variant="secondary">System Architecture</Badge>
                        <Badge variant="secondary">Code Review</Badge>
                      </>
                    )}
                    {agent.type === "qa_engineer" && (
                      <>
                        <Badge variant="secondary">Test Automation</Badge>
                        <Badge variant="secondary">Quality Assurance</Badge>
                        <Badge variant="secondary">Bug Tracking</Badge>
                      </>
                    )}
                    {agent.type === "product_owner" && (
                      <>
                        <Badge variant="secondary">Product Strategy</Badge>
                        <Badge variant="secondary">Business Validation</Badge>
                        <Badge variant="secondary">Release Management</Badge>
                      </>
                    )}
                    {agent.type === "engineering_lead" && (
                      <>
                        <Badge variant="secondary">Technical Leadership</Badge>
                        <Badge variant="secondary">Team Management</Badge>
                        <Badge variant="secondary">Architecture Design</Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Current Tasks ({agentTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No active tasks assigned</p>
              ) : (
                <div className="space-y-3">
                  {agentTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-gray-600">{task.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{task.priority}</Badge>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Communications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Communications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentCommunications.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent communications</p>
              ) : (
                <div className="space-y-3">
                  {agentCommunications.map((comm: any) => (
                    <div key={comm.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">
                            {comm.fromAgentId === agent.id ? "Sent" : "Received"}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(comm.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comm.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}