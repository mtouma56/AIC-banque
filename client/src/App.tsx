import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Comptabilite from "./pages/Comptabilite";
import Analytique from "./pages/Analytique";
import Auxiliaire from "./pages/Auxiliaire";
import Ventes from "./pages/Ventes";
import Achats from "./pages/Achats";
import Stock from "./pages/Stock";
import RH from "./pages/RH";
import EtatsFinanciers from "./pages/EtatsFinanciers";
import Audit from "./pages/Audit";
import Notifications from "./pages/Notifications";
import Parametres from "./pages/Parametres";
import Rapprochement from "./pages/Rapprochement";
import Clotures from "./pages/Clotures";
import Devis from "./pages/Devis";
import Receptions from "./pages/Receptions";
import DeclarationsFiscales from "./pages/DeclarationsFiscales";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/comptabilite" component={Comptabilite} />
        <Route path="/analytique" component={Analytique} />
        <Route path="/auxiliaire" component={Auxiliaire} />
        <Route path="/ventes" component={Ventes} />
        <Route path="/achats" component={Achats} />
        <Route path="/stock" component={Stock} />
        <Route path="/rh" component={RH} />
        <Route path="/etats-financiers" component={EtatsFinanciers} />
        <Route path="/audit" component={Audit} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/rapprochement" component={Rapprochement} />
        <Route path="/clotures" component={Clotures} />
        <Route path="/devis" component={Devis} />
        <Route path="/receptions" component={Receptions} />
        <Route path="/declarations-fiscales" component={DeclarationsFiscales} />
        <Route path="/parametres" component={Parametres} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
