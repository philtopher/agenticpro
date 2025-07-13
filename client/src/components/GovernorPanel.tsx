import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

export function GovernorPanel() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("/api/governor/agents")
      .then((r) => r.json())
      .then(setActions)
      .catch(() => setError("Failed to load governance actions"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Governor Oversight Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : actions.length === 0 ? (
          <p className="text-gray-500">No recent interventions or oversight actions.</p>
        ) : (
          <div className="space-y-3">
            {actions.map((action, idx) => (
              <div key={action.id || idx} className="border-l-2 border-red-300 pl-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{action.agentName || action.agentId || "Agent"}</span>
                  <Badge variant="outline">{action.type || "Intervention"}</Badge>
                  <span className="text-xs text-gray-400">{action.timestamp ? new Date(action.timestamp).toLocaleString() : ""}</span>
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-line">{action.description || action.reason || action.action}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
