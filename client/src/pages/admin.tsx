import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type AdminSettings = {
  teamsIntegrationEnabled: boolean;
  agentChatOnTaskCompleteEnabled: boolean;
};

const fetchSettings = async (): Promise<AdminSettings> => {
  const res = await fetch("/api/admin/settings");
  if (!res.ok) throw new Error("Failed to fetch admin settings");
  return res.json();
};

const updateSettings = async (settings: Partial<AdminSettings>): Promise<AdminSettings> => {
  const res = await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to update admin settings");
  return res.json();
};

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<AdminSettings>({
    queryKey: ["adminSettings"],
    queryFn: fetchSettings,
  });
  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminSettings"] }),
  });

  if (isLoading) return <div className="p-8">Loading admin settings...</div>;
  if (error || !data) return <div className="p-8 text-red-500">Error loading settings.</div>;

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Integration Controls</h2>
        <label className="flex items-center mb-2">
          <input
            type="checkbox"
            checked={data.teamsIntegrationEnabled}
            onChange={e => mutation.mutate({ teamsIntegrationEnabled: e.target.checked })}
            className="mr-2"
          />
          Enable Microsoft Teams Integration
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.agentChatOnTaskCompleteEnabled}
            onChange={e => mutation.mutate({ agentChatOnTaskCompleteEnabled: e.target.checked })}
            className="mr-2"
          />
          Allow agents to respond via chat when task is completed (if user is online)
        </label>
        <p className="text-xs text-gray-500 mt-2">
          If chat is disabled or user is offline, agents will send notifications to user email instead.
        </p>
      </div>
      <div className="text-sm text-gray-400">
        <strong>Note:</strong> This panel is visible to admins only (auth integration coming soon).
      </div>
    </div>
  );
}
