import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, MapPin, Users, Briefcase, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Analytique() {
  const [showNewCentre, setShowNewCentre] = useState(false);
  const [centreForm, setCentreForm] = useState({ axe_id: 0, code: "", libelle: "" });
  const [selectedAxeType, setSelectedAxeType] = useState<string | undefined>(undefined);

  const utils = trpc.useUtils();
  const { data: axes = [] } = trpc.analytique.getAxes.useQuery();
  const { data: centres = [] } = trpc.analytique.getCentres.useQuery();
  const { data: rentabilite = [] } = trpc.analytique.getRentabilite.useQuery(
    selectedAxeType ? { axeType: selectedAxeType } : undefined
  );

  const createCentre = trpc.analytique.createCentre.useMutation({
    onSuccess: () => {
      toast.success("Centre analytique créé");
      setShowNewCentre(false);
      setCentreForm({ axe_id: 0, code: "", libelle: "" });
      utils.analytique.getCentres.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const formatMontant = (n: number) => Math.round(n).toLocaleString("fr-FR");

  const axeIcons: Record<string, any> = {
    operation: Briefcase,
    client: Users,
    zone: MapPin,
    activite: BarChart3,
  };

  const getRentabiliteByAxe = (axeType: string) =>
    (rentabilite as any[]).filter((r: any) => r.axe_type === axeType);

  const totalProduits = (rentabilite as any[]).reduce((s: number, r: any) => s + r.total_produits, 0);
  const totalCharges = (rentabilite as any[]).reduce((s: number, r: any) => s + r.total_charges, 0);
  const totalMarge = totalProduits - totalCharges;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comptabilité Analytique</h1>
          <p className="text-muted-foreground">Analyse de rentabilité par axe — AIC</p>
        </div>
        <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowNewCentre(true)}>
          <Plus className="h-4 w-4 mr-2" />Nouveau centre
        </Button>
      </div>

      {/* KPIs globaux */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Produits analytiques</p>
            <p className="text-lg font-bold text-green-400">{formatMontant(totalProduits)} FCFA</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Charges analytiques</p>
            <p className="text-lg font-bold text-red-400">{formatMontant(totalCharges)} FCFA</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Marge globale</p>
            <p className={`text-lg font-bold ${totalMarge >= 0 ? "text-green-400" : "text-red-400"}`}>
              {formatMontant(totalMarge)} FCFA
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Centres actifs</p>
            <p className="text-lg font-bold text-[#daa520]">{(centres as any[]).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Axes analytiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(axes as any[]).map((axe: any) => {
          const Icon = axeIcons[axe.type] || BarChart3;
          const centresAxe = (centres as any[]).filter((c: any) => c.axe_id === axe.id);
          return (
            <Card key={axe.id} className="border-border/50 hover:border-[#daa520]/30 transition-colors cursor-pointer"
              onClick={() => setSelectedAxeType(axe.type === selectedAxeType ? undefined : axe.type)}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedAxeType === axe.type ? "bg-[#daa520]/20" : "bg-[#daa520]/10"}`}>
                  <Icon className="h-5 w-5 text-[#daa520]" />
                </div>
                <div>
                  <CardTitle className="text-sm">{axe.libelle}</CardTitle>
                  <p className="text-xs text-muted-foreground">{centresAxe.length} centres</p>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Tableau de rentabilité */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setSelectedAxeType(undefined)}>Tous</TabsTrigger>
          <TabsTrigger value="activite" onClick={() => setSelectedAxeType("activite")}>Par Activité</TabsTrigger>
          <TabsTrigger value="operation" onClick={() => setSelectedAxeType("operation")}>Par Opération</TabsTrigger>
          <TabsTrigger value="client" onClick={() => setSelectedAxeType("client")}>Par Client</TabsTrigger>
          <TabsTrigger value="zone" onClick={() => setSelectedAxeType("zone")}>Par Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <RentabiliteTable data={rentabilite as any[]} formatMontant={formatMontant} />
        </TabsContent>
        <TabsContent value="activite">
          <RentabiliteTable data={getRentabiliteByAxe("activite")} formatMontant={formatMontant} />
        </TabsContent>
        <TabsContent value="operation">
          <RentabiliteTable data={getRentabiliteByAxe("operation")} formatMontant={formatMontant} />
        </TabsContent>
        <TabsContent value="client">
          <RentabiliteTable data={getRentabiliteByAxe("client")} formatMontant={formatMontant} />
        </TabsContent>
        <TabsContent value="zone">
          <RentabiliteTable data={getRentabiliteByAxe("zone")} formatMontant={formatMontant} />
        </TabsContent>
      </Tabs>

      {/* Liste des centres */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Centres analytiques configurés</CardTitle>
          <CardDescription>Activités : Trade Finance, Négoce de Ciment, Formation, Consultance, Fiscalité, Banque Privée</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Axe</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(centres as any[]).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Aucun centre analytique configuré
                  </TableCell>
                </TableRow>
              ) : (
                (centres as any[]).map((centre: any) => {
                  const axe = (axes as any[]).find((a: any) => a.id === centre.axe_id);
                  return (
                    <TableRow key={centre.id}>
                      <TableCell className="font-mono font-medium">{centre.code}</TableCell>
                      <TableCell>{centre.libelle}</TableCell>
                      <TableCell className="text-muted-foreground">{axe?.libelle || "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400">
                          Actif
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog nouveau centre */}
      <Dialog open={showNewCentre} onOpenChange={setShowNewCentre}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau centre analytique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Axe analytique</Label>
              <Select value={centreForm.axe_id ? String(centreForm.axe_id) : ""} onValueChange={(v) => setCentreForm({ ...centreForm, axe_id: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un axe" /></SelectTrigger>
                <SelectContent>
                  {(axes as any[]).map((axe: any) => (
                    <SelectItem key={axe.id} value={String(axe.id)}>{axe.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Code</Label>
              <Input value={centreForm.code} onChange={(e) => setCentreForm({ ...centreForm, code: e.target.value.toUpperCase() })} placeholder="Ex: TF, NC, FORM" className="font-mono" />
            </div>
            <div>
              <Label>Libellé</Label>
              <Input value={centreForm.libelle} onChange={(e) => setCentreForm({ ...centreForm, libelle: e.target.value })} placeholder="Nom du centre" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCentre(false)}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => {
              if (!centreForm.axe_id || !centreForm.code || !centreForm.libelle) {
                toast.error("Tous les champs sont obligatoires");
                return;
              }
              createCentre.mutate(centreForm);
            }}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RentabiliteTable({ data, formatMontant }: { data: any[]; formatMontant: (n: number) => string }) {
  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Aucune donnée analytique</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Les données apparaîtront après la saisie d'écritures avec ventilation analytique
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Centre</TableHead>
              <TableHead className="text-right">Produits (FCFA)</TableHead>
              <TableHead className="text-right">Charges (FCFA)</TableHead>
              <TableHead className="text-right">Marge (FCFA)</TableHead>
              <TableHead className="text-right">Taux marge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r: any) => (
              <TableRow key={r.centre_id}>
                <TableCell>
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{r.centre_code}</span>
                    <span className="font-medium">{r.centre_libelle}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-green-400">{formatMontant(r.total_produits)}</TableCell>
                <TableCell className="text-right font-mono text-red-400">{formatMontant(r.total_charges)}</TableCell>
                <TableCell className={`text-right font-mono font-bold ${r.marge >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {r.marge >= 0 ? "+" : ""}{formatMontant(r.marge)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`inline-flex items-center gap-1 ${r.taux_marge >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {r.taux_marge >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {r.taux_marge}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
