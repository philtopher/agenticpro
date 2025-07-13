import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bot, Activity, Clock, CheckCircle, AlertCircle, Zap, BookOpen, Info } from "lucide-react";
import React, { useState, useEffect } from "react";

interface AgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: any;
  tasks: any[];
  communications: any[];
}

export function AgentDetailModal({ isOpen, onClose, agent, tasks, communications }: AgentDetailModalProps) {

  const [tab, setTab] = useState<'overview' | 'memory' | 'explainability'>("overview");
  const [memory, setMemory] = useState<any[]>([]);
  const [explainLog, setExplainLog] = useState<any[]>([]);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [errorMemory, setErrorMemory] = useState("");
  const [errorExplain, setErrorExplain] = useState("");
  const [memoryQuery, setMemoryQuery] = useState("");
  const [memoryTag, setMemoryTag] = useState("");
  const [memoryDate, setMemoryDate] = useState("");

  // Advanced memory query
  const fetchMemory = () => {
    setLoadingMemory(true);
    setErrorMemory("");
    let url = `/api/agents/${agent.id}/memory`;
    const params: string[] = [];
    if (memoryQuery) params.push(`q=${encodeURIComponent(memoryQuery)}`);
    if (memoryTag) params.push(`tag=${encodeURIComponent(memoryTag)}`);
    if (memoryDate) params.push(`date=${encodeURIComponent(memoryDate)}`);
    if (params.length) url += `?${params.join("&")}`;
    fetch(url)
      .then(r => r.json())
      .then(setMemory)
      .catch(() => setErrorMemory("Failed to load memory"))
      .finally(() => setLoadingMemory(false));
  };

  useEffect(() => {
    if (!agent) return;
    if (tab === "memory") {
      fetchMemory();
    } else if (tab === "explainability") {
      setLoadingExplain(true);
      setErrorExplain("");
      fetch(`/api/agents/${agent.id}/explain`).then(r => r.json()).then(setExplainLog).catch(() => setErrorExplain("Failed to load explainability log")).finally(() => setLoadingExplain(false));
    }
    // eslint-disable-next-line
  }, [tab, agent]);

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

        {/* Tabs */}
        <div className="flex gap-2 mt-2 mb-6">
          <Button variant={tab === "overview" ? "default" : "outline"} size="sm" onClick={() => setTab("overview")}>Overview</Button>
          <Button variant={tab === "memory" ? "default" : "outline"} size="sm" onClick={() => setTab("memory")}>Memory <BookOpen className="ml-1 h-4 w-4" /></Button>
          <Button variant={tab === "explainability" ? "default" : "outline"} size="sm" onClick={() => setTab("explainability")}>Explainability <Info className="ml-1 h-4 w-4" /></Button>
        </div>

        {tab === "overview" && (
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
                      {/* ...existing code for responsibilities... */}
                      {agent.type === "product_manager" && (<><li>• Requirements gathering and analysis</li><li>• Project scope definition</li><li>• Stakeholder communication</li><li>• Feature prioritization</li></>)}
                      {agent.type === "business_analyst" && (<><li>• User story creation</li><li>• Process documentation</li><li>• Business requirements analysis</li><li>• Workflow design</li></>)}
                      {agent.type === "developer" && (<><li>• Code implementation</li><li>• Technical architecture</li><li>• Code review and optimization</li><li>• Bug fixing and maintenance</li></>)}
                      {agent.type === "qa_engineer" && (<><li>• Test case creation</li><li>• Quality assurance testing</li><li>• Bug detection and reporting</li><li>• Test automation</li></>)}
                      {agent.type === "product_owner" && (<><li>• Product vision alignment</li><li>• Final approval decisions</li><li>• Release planning</li><li>• Business validation</li></>)}
                      {agent.type === "engineering_lead" && (<><li>• Technical leadership</li><li>• Team coordination</li><li>• Architecture decisions</li><li>• Code quality oversight</li></>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Skills & Expertise</h4>
                    <div className="flex flex-wrap gap-1">
                      {/* ...existing code for skills... */}
                      {agent.type === "product_manager" && (<><Badge variant="secondary">Project Management</Badge><Badge variant="secondary">Requirements Analysis</Badge><Badge variant="secondary">Stakeholder Management</Badge></>)}
                      {agent.type === "business_analyst" && (<><Badge variant="secondary">Business Analysis</Badge><Badge variant="secondary">Process Modeling</Badge><Badge variant="secondary">Documentation</Badge></>)}
                      {agent.type === "developer" && (<><Badge variant="secondary">Full-Stack Development</Badge><Badge variant="secondary">System Architecture</Badge><Badge variant="secondary">Code Review</Badge></>)}
                      {agent.type === "qa_engineer" && (<><Badge variant="secondary">Test Automation</Badge><Badge variant="secondary">Quality Assurance</Badge><Badge variant="secondary">Bug Tracking</Badge></>)}
                      {agent.type === "product_owner" && (<><Badge variant="secondary">Product Strategy</Badge><Badge variant="secondary">Business Validation</Badge><Badge variant="secondary">Release Management</Badge></>)}
                      {agent.type === "engineering_lead" && (<><Badge variant="secondary">Technical Leadership</Badge><Badge variant="secondary">Team Management</Badge><Badge variant="secondary">Architecture Design</Badge></>)}
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
        )}
        {tab === "memory" && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center"><BookOpen className="mr-2 h-5 w-5" />Agent Memory</h3>
            <form className="flex flex-wrap gap-2 mb-4" onSubmit={e => { e.preventDefault(); fetchMemory(); }}>
              <input
                type="text"
                placeholder="Search text..."
                className="border rounded px-2 py-1 text-sm"
                value={memoryQuery}
                onChange={e => setMemoryQuery(e.target.value)}
              />
              <input
                type="text"
                placeholder="Tag..."
                className="border rounded px-2 py-1 text-sm"
                value={memoryTag}
                onChange={e => setMemoryTag(e.target.value)}
              />
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm"
                value={memoryDate}
                onChange={e => setMemoryDate(e.target.value)}
              />
              <Button type="submit" size="sm">Filter</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setMemoryQuery(""); setMemoryTag(""); setMemoryDate(""); fetchMemory(); }}>Clear</Button>
            </form>
            {loadingMemory ? <p>Loading memory...</p> : errorMemory ? <p className="text-red-500">{errorMemory}</p> : (
              <div className="space-y-3">
                {memory.length === 0 ? <p className="text-gray-500">No memory entries found.</p> : memory.map((entry, idx) => (
                  <Card key={entry.id || idx}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ""}</span>
                        {entry.tags && entry.tags.map((tag: string) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                      </div>
                      <div className="text-sm text-gray-800 whitespace-pre-line">{entry.content}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "explainability" && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center"><Info className="mr-2 h-5 w-5" />Agent Explainability Log</h3>
            {loadingExplain ? <p>Loading explainability log...</p> : errorExplain ? <p className="text-red-500">{errorExplain}</p> : (
              <div className="space-y-3">
                {explainLog.length === 0 ? <p className="text-gray-500">No explainability log entries found.</p> : explainLog.map((entry, idx) => (
                  <Card key={entry.id || idx}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ""}</span>
                        {entry.tags && entry.tags.map((tag: string) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                      </div>
                      <div className="text-sm text-gray-800 whitespace-pre-line">{entry.content}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}