import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import Agents from "@/pages/agents";
import Artifacts from "@/pages/artifacts";
import Chat from "@/pages/chat";
import Projects from "@/pages/projects";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/agents" component={Agents} />
      <Route path="/artifacts" component={Artifacts} />
      <Route path="/chat" component={Chat} />
      <Route path="/projects" component={Projects} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
