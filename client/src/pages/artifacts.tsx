import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopNavigation } from "@/components/TopNavigation";
import { useState } from "react";

export default function Artifacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: artifacts, isLoading } = useQuery({
    queryKey: ["/api/artifacts"],
    retry: false,
  });

  const { data: agents } = useQuery({
    queryKey: ["/api/agents"],
    retry: false,
  });

  const getAgentName = (agentId: number) => {
    const agent = agents?.find(a => a.id === agentId);
    return agent?.name || "Unknown Agent";
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case "code":
        return "fas fa-file-code";
      case "specification":
        return "fas fa-file-alt";
      case "test_case":
        return "fas fa-vial";
      case "documentation":
        return "fas fa-book";
      case "report":
        return "fas fa-chart-pie";
      default:
        return "fas fa-file";
    }
  };

  const getArtifactColor = (type: string) => {
    switch (type) {
      case "code":
        return "bg-blue-100 text-blue-600";
      case "specification":
        return "bg-green-100 text-green-600";
      case "test_case":
        return "bg-purple-100 text-purple-600";
      case "documentation":
        return "bg-yellow-100 text-yellow-600";
      case "report":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "review":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-blue-100 text-blue-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const artifactDate = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - artifactDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffMinutes / 1440)}d ago`;
    }
  };

  const filteredArtifacts = artifacts?.filter(artifact => {
    const matchesSearch = artifact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         artifact.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || artifact.type === filterType;
    const matchesStatus = !filterStatus || artifact.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavigation />
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Artifacts</h1>
          <p className="text-gray-600 mt-1">View and manage all generated artifacts</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <Input
                placeholder="Search artifacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="specification">Specification</SelectItem>
                  <SelectItem value="test_case">Test Case</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Artifacts Grid */}
        <div className="grid gap-6">
          {filteredArtifacts.map((artifact) => (
            <Card key={artifact.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getArtifactColor(artifact.type)}`}>
                      <i className={`${getArtifactIcon(artifact.type)} text-lg`}></i>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{artifact.name}</CardTitle>
                      <p className="text-sm text-gray-600">{artifact.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(artifact.status)}>
                      {artifact.status}
                    </Badge>
                    <Badge variant="outline">
                      v{artifact.version}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>
                      <i className="fas fa-user mr-1"></i>
                      {getAgentName(artifact.createdById)}
                    </span>
                    <span>
                      <i className="fas fa-calendar mr-1"></i>
                      {formatTimeAgo(artifact.createdAt)}
                    </span>
                    <span>
                      <i className="fas fa-tag mr-1"></i>
                      {artifact.type.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <i className="fas fa-eye mr-1"></i>
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <i className="fas fa-download mr-1"></i>
                      Download
                    </Button>
                    {artifact.status === "draft" && (
                      <Button variant="outline" size="sm">
                        <i className="fas fa-edit mr-1"></i>
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredArtifacts.length === 0 && (
          <div className="text-center py-16">
            <i className="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || filterType || filterStatus ? "No artifacts match your filters" : "No artifacts yet"}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterType || filterStatus 
                ? "Try adjusting your search criteria or filters." 
                : "Artifacts will appear here as agents complete their tasks."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
