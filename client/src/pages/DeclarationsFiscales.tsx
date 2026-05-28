import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, AlertTriangle, CheckCircle2, Clock, Plus, Send, Calculator } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const MOIS_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const TYPE_LABELS: Record<string, { label: string; description: string }> = {
  its: { label: "ITS", description: "Impôt sur Traitements et Salaires" },
  tva: { label: "TVA", description: "Taxe sur la Valeur Ajoutée" },
  cnps: { label: "CNPS", description: "Caisse Nationale de Prévoyance Sociale" },
  patente: { label: "Patente", description: "Contribution des patentes" },
  is: { label: "IS", description: "Impôt sur les Sociétés" },
};

const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-gray-500",
  a_declarer: "bg-yellow-500",
  declaree: "bg-blue-500",
  payee: "bg-green-500",
  en_retard: "bg-red-500",
};

export default function DeclarationsFiscales() {
  const utils = trpc.useUtils();
  const { data: declarations = [], isLoading, error } = trpc.fiscalite.getDeclarations.useQuery();
  const { data: bulletins = [] } = trpc.rh.getBulletins.useQuery({});
  const { data: factures = [] } = trpc.ventes.getFactures.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [form, setForm] = useState({
    type_declaration: "its" as string,
    mois: (new Date().getMonth() + 1).toString(),
    annee: new Date().getFullYear().toString(),
    montant_base: 0,
    montant_impot: 0,
    notes: "",
  });

  const createDeclaration = trpc.fiscalite.createDeclaration.useMutation({
    onSuccess: () => {
      toast.success("Déclaration créée avec succès");
      setShowCreate(false);
      utils.fiscalite.getDeclarations.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.fiscalite.updateDeclarationStatus.useMutation({
    onSuccess: () => {
      toast.success("Statut mis à jour");
      utils.fiscalite.getDeclarations.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const formatMontant = (n: number) => Math.round(n).toLocaleString("fr-FR");

  // Filtrer par année
  const filteredDeclarations = useMemo(() => {
    return (declarations as any[]).filter((d: any) => d.annee?.toString() === selectedYear);
  }, [declarations, selectedYear]);

  // KPIs
  const kpis = useMemo(() => {
    const filtered = filteredDeclarations;
    const totalImpots = filtered.reduce((s: number, d: any) => s + Number(d.montant_impot || 0), 0);
    const payees = filtered.filter((d: any) => d.statut === "payee").length;
    const enRetard = filtered.filter((d: any) => d.statut === "en_retard").length;
    const aFaire = filtered.filter((d: any) => d.statut === "a_declarer" || d.statut === "brouillon").length;
    return { totalImpots, payees, enRetard, aFaire, total: filtered.length };
  }, [filteredDeclarations]);

  // Calcul automatique ITS basé sur les bulletins
  const calculerITS = () => {
    const mois = parseInt(form.mois);
    const annee = parseInt(form.annee);
    const bulletinsMois = (bulletins as any[]).filter((b: any) => b.mois === mois && b.annee === annee);
    if (bulletinsMois.length === 0) {
      toast.error("Aucun bulletin de paie trouvé pour cette période");
      return;
    }
    const totalITS = bulletinsMois.reduce((s: number, b: any) => s + Number(b.its_net || 0), 0);
    const totalIGR = bulletinsMois.reduce((s: number, b: any) => s + Number(b.igr || 0), 0);
    const totalCN = bulletinsMois.reduce((s: number, b: any) => s + Number(b.contribution_nationale || 0), 0);
    const totalBase = bulletinsMois.reduce((s: number, b: any) => s + Number(b.brut_total || 0), 0);
    setForm(f => ({ ...f, montant_base: totalBase, montant_impot: totalITS + totalIGR + totalCN }));
    toast.success(`Calcul ITS: ${bulletinsMois.length} bulletins analysés`);
  };

  // Calcul automatique TVA (TVA collectée sur ventes - TVA déductible sur achats)
  const calculerTVA = () => {
    const mois = parseInt(form.mois);
    const annee = parseInt(form.annee);
    // TVA collectée = TVA sur les factures du mois
    const facturesMois = (factures as any[]).filter((f: any) => {
      if (!f.date_facture) return false;
      const d = new Date(f.date_facture);
      return d.getMonth() + 1 === mois && d.getFullYear() === annee;
    });
    if (facturesMois.length === 0) {
      toast.error("Aucune facture trouvée pour cette période");
      return;
    }
    const tvaCollectee = facturesMois.reduce((s: number, f: any) => s + Number(f.montant_tva || 0), 0);
    const baseHT = facturesMois.reduce((s: number, f: any) => s + Number(f.montant_ht || 0), 0);
    // TVA nette = TVA collectée (simplifié, la TVA déductible sera ajoutée quand les achats auront la TVA)
    setForm(f => ({ ...f, montant_base: baseHT, montant_impot: tvaCollectee }));
    toast.success(`Calcul TVA: ${facturesMois.length} factures analysées - TVA collectée: ${Math.round(tvaCollectee).toLocaleString("fr-FR")} FCFA`);
  };

  // Calcul automatique CNPS
  const calculerCNPS = () => {
    const mois = parseInt(form.mois);
    const annee = parseInt(form.annee);
    const bulletinsMois = (bulletins as any[]).filter((b: any) => b.mois === mois && b.annee === annee);
    if (bulletinsMois.length === 0) {
      toast.error("Aucun bulletin de paie trouvé pour cette période");
      return;
    }
    const totalCNPSSalarie = bulletinsMois.reduce((s: number, b: any) => s + Number(b.cnps_salarie || 0), 0);
    const totalCNPSPatron = bulletinsMois.reduce((s: number, b: any) => s + Number(b.cnps_patron || 0), 0);
    const totalBase = bulletinsMois.reduce((s: number, b: any) => s + Number(b.brut_total || 0), 0);
    setForm(f => ({ ...f, montant_base: totalBase, montant_impot: totalCNPSSalarie + totalCNPSPatron }));
    toast.success(`Calcul CNPS: ${bulletinsMois.length} bulletins analysés`);
  };

  const handleSubmit = () => {
    if (form.montant_impot <= 0) {
      toast.error("Le montant de l'impôt doit être supérieur à 0");
      return;
    }
    createDeclaration.mutate({
      type_declaration: form.type_declaration,
      mois: parseInt(form.mois),
      annee: parseInt(form.annee),
      montant_base: form.montant_base,
      montant_impot: form.montant_impot,
      notes: form.notes,
    });
  };

  if (error) return <div className="p-8 text-center text-red-500">Erreur: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Déclarations Fiscales</h1>
          <p className="text-muted-foreground">Gestion des obligations ITS, TVA, CNPS - Conformité CGI Côte d'Ivoire</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />Nouvelle déclaration
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total impôts {selectedYear}</CardTitle>
            <FileText className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatMontant(kpis.totalImpots)} FCFA</div>
            <p className="text-xs text-muted-foreground">{kpis.total} déclarations</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payées</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-500">{kpis.payees}</div>
            <p className="text-xs text-muted-foreground">déclarations réglées</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En retard</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-500">{kpis.enRetard}</div>
            <p className="text-xs text-muted-foreground">à régulariser</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">À déclarer</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-yellow-500">{kpis.aFaire}</div>
            <p className="text-xs text-muted-foreground">en attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des déclarations par type */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="its">ITS</TabsTrigger>
          <TabsTrigger value="tva">TVA</TabsTrigger>
          <TabsTrigger value="cnps">CNPS</TabsTrigger>
          <TabsTrigger value="patente">Patente</TabsTrigger>
          <TabsTrigger value="is">IS</TabsTrigger>
        </TabsList>

        {["all", "its", "tva", "cnps", "patente", "is"].map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">
                  {tab === "all" ? "Toutes les déclarations" : TYPE_LABELS[tab]?.label + " - " + TYPE_LABELS[tab]?.description}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Chargement...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead className="text-right">Base imposable</TableHead>
                        <TableHead className="text-right">Montant impôt</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeclarations
                        .filter((d: any) => tab === "all" || d.type_declaration === tab)
                        .map((d: any) => (
                          <TableRow key={d.id}>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {TYPE_LABELS[d.type_declaration]?.label || d.type_declaration}
                              </Badge>
                            </TableCell>
                            <TableCell>{MOIS_LABELS[(d.mois || 1) - 1]} {d.annee}</TableCell>
                            <TableCell className="text-right font-mono">{formatMontant(Number(d.montant_base || 0))}</TableCell>
                            <TableCell className="text-right font-mono font-bold">{formatMontant(Number(d.montant_impot || 0))} FCFA</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${STATUS_COLORS[d.statut] || "bg-gray-500"}`}>
                                {d.statut === "payee" ? "Payée" : d.statut === "declaree" ? "Déclarée" : d.statut === "en_retard" ? "En retard" : d.statut === "a_declarer" ? "À déclarer" : "Brouillon"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {d.date_echeance ? new Date(d.date_echeance).toLocaleDateString("fr-FR") : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {d.statut === "brouillon" && (
                                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: d.id, statut: "a_declarer" })}>
                                    Préparer
                                  </Button>
                                )}
                                {d.statut === "a_declarer" && (
                                  <Button size="sm" variant="outline" className="text-blue-500" onClick={() => updateStatus.mutate({ id: d.id, statut: "declaree" })}>
                                    <Send className="h-3 w-3 mr-1" />Déclarer
                                  </Button>
                                )}
                                {d.statut === "declaree" && (
                                  <Button size="sm" variant="outline" className="text-green-500" onClick={() => updateStatus.mutate({ id: d.id, statut: "payee" })}>
                                    <CheckCircle2 className="h-3 w-3 mr-1" />Payée
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      {filteredDeclarations.filter((d: any) => tab === "all" || d.type_declaration === tab).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Aucune déclaration pour cette période
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialog création */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle déclaration fiscale</DialogTitle>
            <DialogDescription>Créer une déclaration ITS, TVA ou CNPS avec calcul automatique depuis les bulletins de paie</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type_declaration} onValueChange={v => setForm(f => ({ ...f, type_declaration: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="its">ITS</SelectItem>
                    <SelectItem value="tva">TVA</SelectItem>
                    <SelectItem value="cnps">CNPS</SelectItem>
                    <SelectItem value="patente">Patente</SelectItem>
                    <SelectItem value="is">IS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mois</Label>
                <Select value={form.mois} onValueChange={v => setForm(f => ({ ...f, mois: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOIS_LABELS.map((m, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Année</Label>
                <Select value={form.annee} onValueChange={v => setForm(f => ({ ...f, annee: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Boutons de calcul automatique */}
            {(form.type_declaration === "its" || form.type_declaration === "cnps") && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-2">Calcul automatique depuis les bulletins de paie :</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={form.type_declaration === "its" ? calculerITS : calculerCNPS}
                  className="text-[#daa520] border-[#daa520]"
                >
                  <Calculator className="h-3 w-3 mr-1" />
                  Calculer {form.type_declaration === "its" ? "ITS + IGR + CN" : "CNPS (salarié + patron)"}
                </Button>
              </div>
            )}
            {form.type_declaration === "tva" && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-2">Calcul automatique depuis les factures de vente :</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={calculerTVA}
                  className="text-[#daa520] border-[#daa520]"
                >
                  <Calculator className="h-3 w-3 mr-1" />
                  Calculer TVA collectée (18%)
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Base imposable (FCFA)</Label>
                <Input type="number" value={form.montant_base || ""} onChange={e => setForm(f => ({ ...f, montant_base: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Montant impôt (FCFA)</Label>
                <Input type="number" value={form.montant_impot || ""} onChange={e => setForm(f => ({ ...f, montant_impot: Number(e.target.value) }))} />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Remarques optionnelles..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleSubmit} disabled={createDeclaration.isPending}>
              {createDeclaration.isPending ? "Création..." : "Créer la déclaration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
