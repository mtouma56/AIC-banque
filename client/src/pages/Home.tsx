import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Receipt,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { data: factures = [] } = trpc.ventes.getFactures.useQuery();
  const { data: bonsCommande = [] } = trpc.achats.getBonsCommande.useQuery();
  const { data: articles = [] } = trpc.stock.getArticles.useQuery();
  const { data: ecritures = [] } = trpc.comptabilite.getEcritures.useQuery();

  const totalCA = factures.reduce((sum: number, f: any) => sum + (f.montant_ttc || 0), 0);

  const kpis = [
    { title: "Chiffre d'affaires", value: `${totalCA.toLocaleString("fr-FR")} FCFA`, icon: TrendingUp, change: "+0%", color: "text-green-500" },
    { title: "Charges totales", value: "0 FCFA", icon: TrendingDown, change: "0%", color: "text-red-500" },
    { title: "Trésorerie", value: "0 FCFA", icon: Wallet, change: "0%", color: "text-[#daa520]" },
    { title: "Résultat net", value: "0 FCFA", icon: TrendingUp, change: "0%", color: "text-blue-500" },
  ];

  const modules = [
    { title: "Comptabilité", description: "Plan comptable SYSCOHADA, journaux, écritures", icon: BookOpen, count: `${ecritures.length} écritures` },
    { title: "Ventes", description: "Devis, factures, suivi clients", icon: Receipt, count: `${factures.length} factures` },
    { title: "Achats", description: "Bons de commande, réceptions, fournisseurs", icon: ShoppingCart, count: `${bonsCommande.length} commandes` },
    { title: "Stock", description: "Articles, mouvements, traçabilité", icon: Package, count: `${articles.length} articles` },
    { title: "Paie & RH", description: "Employés, fiches de paie, congés", icon: Users, count: "7 salariés" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Africa Invest Capital - Vue d'ensemble</p>
        </div>
        <div className="text-sm text-muted-foreground">Exercice 2026 | Monnaie: FCFA</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{kpi.value}</div>
              <p className={`text-xs ${kpi.color} mt-1`}>{kpi.change} vs mois précédent</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Modules</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.title} className="border-border/50 hover:border-[#daa520]/30 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="h-10 w-10 rounded-lg bg-[#daa520]/10 flex items-center justify-center">
                  <module.icon className="h-5 w-5 text-[#daa520]" />
                </div>
                <div>
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{module.description}</p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{module.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-[#daa520]/20 bg-[#daa520]/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-[#daa520]/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-[#daa520]" />
            </div>
            <div>
              <p className="font-medium text-sm">Système SYSCOHADA</p>
              <p className="text-xs text-muted-foreground mt-1">
                Plan comptable conforme aux normes OHADA. TVA à 18% (Côte d'Ivoire). Monnaie: Franc CFA (XOF).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
