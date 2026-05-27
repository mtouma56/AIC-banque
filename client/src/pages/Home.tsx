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
  BarChart3,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useMemo } from "react";

function formatMontant(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString("fr-FR");
}

function EvolutionChart({ data }: { data: Array<{ label: string; ca: number; charges: number; tresorerie: number }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Margins
    const ml = 60, mr = 20, mt = 20, mb = 50;
    const cw = W - ml - mr;
    const ch = H - mt - mb;

    // Find max value
    const allVals = data.flatMap(d => [d.ca, d.charges, d.tresorerie]);
    const maxVal = Math.max(...allVals, 1);
    const yScale = ch / maxVal;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const y = mt + (ch / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(ml, y);
      ctx.lineTo(ml + cw, y);
      ctx.stroke();

      // Y labels
      const val = maxVal - (maxVal / gridSteps) * i;
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(formatMontant(val), ml - 8, y + 4);
    }

    // X labels
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px system-ui";
    const step = cw / (data.length - 1 || 1);
    data.forEach((d, i) => {
      const x = ml + step * i;
      // Show every other label if too many
      if (data.length <= 12 || i % 2 === 0) {
        ctx.fillText(d.label.split(" ")[0], x, H - mb + 18);
      }
    });

    // Draw lines
    const drawLine = (values: number[], color: string, dash: number[] = []) => {
      if (values.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(dash);
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = ml + step * i;
        const y = mt + ch - v * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Area fill
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = color;
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = ml + step * i;
        const y = mt + ch - v * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(ml + step * (values.length - 1), mt + ch);
      ctx.lineTo(ml, mt + ch);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Dots
      values.forEach((v, i) => {
        const x = ml + step * i;
        const y = mt + ch - v * yScale;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    drawLine(data.map(d => d.ca), "#daa520");
    drawLine(data.map(d => d.charges), "#ef4444");
    drawLine(data.map(d => d.tresorerie), "#3b82f6", [6, 3]);

  }, [data]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "280px" }}
      />
      <div className="flex items-center justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#daa520] rounded" />
          <span className="text-muted-foreground">Chiffre d'affaires</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-red-500 rounded" />
          <span className="text-muted-foreground">Charges</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-500 rounded border-dashed" />
          <span className="text-muted-foreground">Trésorerie</span>
        </div>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: Array<{ label: string; ca: number; charges: number }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const ml = 60, mr = 20, mt = 15, mb = 50;
    const cw = W - ml - mr;
    const ch = H - mt - mb;

    const allVals = data.flatMap(d => [d.ca, d.charges]);
    const maxVal = Math.max(...allVals, 1);
    const yScale = ch / maxVal;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = mt + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(ml, y);
      ctx.lineTo(ml + cw, y);
      ctx.stroke();
      const val = maxVal - (maxVal / 4) * i;
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(formatMontant(val), ml - 8, y + 4);
    }

    const barGroupWidth = cw / data.length;
    const barWidth = Math.min(barGroupWidth * 0.3, 20);
    const gap = 3;

    data.forEach((d, i) => {
      const groupX = ml + barGroupWidth * i + barGroupWidth / 2;

      // CA bar
      const caH = d.ca * yScale;
      const caX = groupX - barWidth - gap / 2;
      ctx.fillStyle = "#daa520";
      ctx.beginPath();
      ctx.roundRect(caX, mt + ch - caH, barWidth, caH, [3, 3, 0, 0]);
      ctx.fill();

      // Charges bar
      const chH = d.charges * yScale;
      const chX = groupX + gap / 2;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.roundRect(chX, mt + ch - chH, barWidth, chH, [3, 3, 0, 0]);
      ctx.fill();

      // X label
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      if (data.length <= 12 || i % 2 === 0) {
        ctx.fillText(d.label.split(" ")[0], groupX, H - mb + 18);
      }
    });

  }, [data]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "240px" }}
      />
      <div className="flex items-center justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#daa520] rounded-sm" />
          <span className="text-muted-foreground">CA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-sm" />
          <span className="text-muted-foreground">Charges</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: kpis } = trpc.dashboard.getKpis.useQuery();
  const { data: evolution = [] } = trpc.dashboard.getEvolution.useQuery();

  // Calcul variation mois précédent
  const lastMonth = evolution.length >= 2 ? evolution[evolution.length - 2] : null;
  const currentMonth = evolution.length >= 1 ? evolution[evolution.length - 1] : null;

  const caVariation = useMemo(() => {
    if (!lastMonth || !currentMonth || lastMonth.ca === 0) return null;
    return ((currentMonth.ca - lastMonth.ca) / lastMonth.ca * 100);
  }, [lastMonth, currentMonth]);

  const chargesVariation = useMemo(() => {
    if (!lastMonth || !currentMonth || lastMonth.charges === 0) return null;
    return ((currentMonth.charges - lastMonth.charges) / lastMonth.charges * 100);
  }, [lastMonth, currentMonth]);

  const kpiCards = [
    {
      title: "Chiffre d'affaires",
      value: kpis ? `${kpis.totalCA.toLocaleString("fr-FR")} FCFA` : "...",
      icon: TrendingUp,
      change: caVariation !== null ? `${caVariation >= 0 ? "+" : ""}${caVariation.toFixed(1)}%` : "—",
      positive: caVariation === null || caVariation >= 0,
      color: "text-[#daa520]",
      bgColor: "bg-[#daa520]/10",
    },
    {
      title: "Charges totales",
      value: kpis ? `${kpis.totalCharges.toLocaleString("fr-FR")} FCFA` : "...",
      icon: TrendingDown,
      change: chargesVariation !== null ? `${chargesVariation >= 0 ? "+" : ""}${chargesVariation.toFixed(1)}%` : "—",
      positive: chargesVariation !== null && chargesVariation <= 0,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Trésorerie",
      value: kpis ? `${kpis.totalTresorerie.toLocaleString("fr-FR")} FCFA` : "...",
      icon: Wallet,
      change: "",
      positive: kpis ? kpis.totalTresorerie >= 0 : true,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Résultat net",
      value: kpis ? `${kpis.resultatNet.toLocaleString("fr-FR")} FCFA` : "...",
      icon: DollarSign,
      change: "",
      positive: kpis ? kpis.resultatNet >= 0 : true,
      color: kpis && kpis.resultatNet >= 0 ? "text-green-500" : "text-red-500",
      bgColor: kpis && kpis.resultatNet >= 0 ? "bg-green-500/10" : "bg-red-500/10",
    },
  ];

  const secondaryKpis = [
    { title: "Valeur du stock", value: kpis ? `${kpis.valeurStock.toLocaleString("fr-FR")} FCFA` : "...", icon: Package },
    { title: "Masse salariale", value: kpis ? `${kpis.masseSalariale.toLocaleString("fr-FR")} FCFA/mois` : "...", icon: Users },
    { title: "Achats en cours", value: kpis ? `${kpis.achatsEnCours.toLocaleString("fr-FR")} FCFA` : "...", icon: ShoppingCart },
    { title: "Factures", value: kpis ? `${kpis.nbFactures}` : "...", icon: Receipt },
  ];

  const modules = [
    { title: "Comptabilité", description: "Plan comptable SYSCOHADA, journaux, écritures", icon: BookOpen, path: "/comptabilite" },
    { title: "Ventes", description: "Devis, factures, suivi clients", icon: Receipt, path: "/ventes" },
    { title: "Achats", description: "Bons de commande, réceptions, fournisseurs", icon: ShoppingCart, path: "/achats" },
    { title: "Stock", description: "Articles, mouvements, traçabilité", icon: Package, path: "/stock" },
    { title: "Paie & RH", description: `${kpis?.nbEmployes || 0} salariés`, icon: Users, path: "/rh" },
    { title: "États financiers", description: "Bilan, compte de résultat, SIG", icon: BarChart3, path: "/etats-financiers" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Africa Invest Capital - Vue d'ensemble</p>
        </div>
        <div className="text-sm text-muted-foreground bg-card/50 border border-border/50 rounded-lg px-3 py-1.5">
          Exercice {new Date().getFullYear()} | Monnaie: FCFA
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="border-border/50 hover:border-border transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <div className={`h-8 w-8 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{kpi.value}</div>
              {kpi.change && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${kpi.positive ? "text-green-500" : "text-red-500"}`}>
                  {kpi.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.change} vs mois précédent
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPIs secondaires */}
      <div className="grid gap-3 md:grid-cols-4">
        {secondaryKpis.map((kpi) => (
          <Card key={kpi.title} className="border-border/30">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{kpi.title}</p>
                <p className="text-sm font-semibold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Évolution sur 12 mois</CardTitle>
            <p className="text-xs text-muted-foreground">CA, charges et trésorerie</p>
          </CardHeader>
          <CardContent>
            {evolution.length > 0 ? (
              <EvolutionChart data={evolution} />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CA vs Charges par mois</CardTitle>
            <p className="text-xs text-muted-foreground">Comparaison mensuelle</p>
          </CardHeader>
          <CardContent>
            {evolution.length > 0 ? (
              <BarChart data={evolution} />
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modules */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Accès rapide</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <a key={module.title} href={module.path}>
              <Card className="border-border/50 hover:border-[#daa520]/30 transition-all hover:shadow-md cursor-pointer group">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="h-10 w-10 rounded-lg bg-[#daa520]/10 flex items-center justify-center group-hover:bg-[#daa520]/20 transition-colors">
                    <module.icon className="h-5 w-5 text-[#daa520]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                </CardHeader>
              </Card>
            </a>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <Card className="border-[#daa520]/20 bg-[#daa520]/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#daa520]/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-[#daa520]" />
            </div>
            <div>
              <p className="font-medium text-sm">Système SYSCOHADA</p>
              <p className="text-xs text-muted-foreground">
                Plan comptable conforme aux normes OHADA. TVA à 18% (Côte d'Ivoire). Monnaie: Franc CFA (XOF).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
