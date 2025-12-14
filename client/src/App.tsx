import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import DistributionDetail from "@/pages/DistributionDetail";
import NewsPage from "@/pages/NewsPage";
import IsoBrowser from "@/pages/iso-browser";
import AddRelease from "@/pages/admin/add-release";
import BrokenLinks from "@/pages/admin/broken-links";
import Matcher from "@/pages/Matcher";
import Compare from "@/pages/Compare";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/distro/:id" component={DistributionDetail} />
      <Route path="/news" component={NewsPage} />
      <Route path="/iso-browser" component={IsoBrowser} />
      <Route path="/admin/add-release" component={AddRelease} />
      <Route path="/admin/broken-links" component={BrokenLinks} />
      <Route path="/matcher" component={Matcher} />
      <Route path="/compare" component={Compare} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
