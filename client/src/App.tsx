import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IsoSelectionProvider } from "./contexts/IsoSelectionContext";
import Home from "@/pages/Home";
import DistributionDetail from "@/pages/DistributionDetail";
import NewsPage from "@/pages/NewsPage";
import AddRelease from "@/pages/admin/add-release";
import BrokenLinks from "@/pages/admin/broken-links";
import Matcher from "@/pages/Matcher";
import Compare from "@/pages/Compare";
import VentoyBuilder from "@/pages/VentoyBuilder";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/distro/:id" component={DistributionDetail} />
      <Route path="/news" component={NewsPage} />
      <Route path="/admin/add-release" component={AddRelease} />
      <Route path="/admin/broken-links" component={BrokenLinks} />
      <Route path="/matcher" component={Matcher} />
      <Route path="/compare" component={Compare} />
      <Route path="/ventoy" component={VentoyBuilder} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <IsoSelectionProvider>
          <Toaster />
          <Router />
        </IsoSelectionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
