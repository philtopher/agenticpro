import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Handshake, Vote } from "lucide-react";

export function CollaborationPanel() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("/api/collaborate?sessions=1")
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => setError("Failed to load collaboration sessions"))
      .finally(() => setLoading(false));
  }, []);

  // Optionally, add a form to initiate a new collaboration session

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Collaboration Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : sessions.length === 0 ? (
          <p className="text-gray-500">No active collaboration sessions.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, idx) => (
              <div key={session.id || idx} className="border-l-2 border-blue-300 pl-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{session.topic || "Session"}</span>
                  <Badge variant="outline">{session.state || "Active"}</Badge>
                  <span className="text-xs text-gray-400">{session.timestamp ? new Date(session.timestamp).toLocaleString() : ""}</span>
                </div>
                <div className="text-xs text-gray-500 mb-1">Agents: {session.agentIds?.join(", ")}</div>
                <div className="text-sm text-gray-800 whitespace-pre-line">{session.context || session.description}</div>
                {session.votes && (
                  <div className="mt-2 flex items-center gap-2">
                    <Vote className="h-4 w-4 text-green-500" />
                    <span className="text-xs">Votes: {JSON.stringify(session.votes)}</span>
                  </div>
                )}
                {session.negotiation && (
                  <div className="mt-2 flex items-center gap-2">
                    <Handshake className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs">Negotiation: {session.negotiation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
