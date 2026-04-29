import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import HostDashboard from "./pages/HostDashboard";
import PlayerJoin from "./pages/PlayerJoin";
import PlayerGame from "./pages/PlayerGame";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/host"} component={HostDashboard} />
      <Route path={"/join"} component={PlayerJoin} />
      <Route path={"/player/:roomId"} component={PlayerGame} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
