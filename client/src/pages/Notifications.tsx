import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

export default function Notifications() {
  const notifications = [
    {
      id: 1,
      type: "info",
      titre: "Bienvenue sur AIC ERP",
      message: "Votre système de gestion intégré est prêt à l'emploi.",
      date: "2026-05-27 15:30",
      lu: false,
    },
    {
      id: 2,
      type: "warning",
      titre: "Configuration initiale",
      message: "Veuillez compléter les informations de votre entreprise et les données des employés.",
      date: "2026-05-27 15:30",
      lu: false,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "urgent":
        return <Bell className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-[#daa520]" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Alertes et notifications du système</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{notifications.filter((n) => !n.lu).length} non lues</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bon à payer</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">en attente de validation</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Échéances proches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">dans les 7 prochains jours</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertes trésorerie</CardTitle>
            <Bell className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">alertes actives</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => (
          <Card
            key={notif.id}
            className={`border-border/50 ${!notif.lu ? "border-l-2 border-l-[#daa520]" : ""}`}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {getIcon(notif.type)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{notif.titre}</h3>
                    <span className="text-xs text-muted-foreground">{notif.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[#daa520]/20 bg-[#daa520]/5">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Notifications automatiques :</strong> Vous recevrez des alertes pour les bons à payer, validations hiérarchiques, alertes de trésorerie et échéances fournisseurs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
