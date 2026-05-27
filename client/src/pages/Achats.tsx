import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ShoppingCart, ClipboardCheck, Package, CheckCircle2, ArrowRight, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const ETAPES_VALIDATION = [
  { key: "controle_operationnel", label: "Contrôle opérationnel" },
  { key: "validation_financiere", label: "Validation financière" },
  { key: "validation_hierarchique", label: "Validation hiérarchique" },
  { key: "autorisation_paiement", label: "Autorisation paiement" },
];

export default function Achats() {
  const [showNewBC, setShowNewBC] = useState(false);
  const [bcForm, setBcForm] = useState({
    numero_bc: "",
    fournisseur_id: "",
    date_commande: new Date().toISOString().split("T")[0],
    montant_ht: 0,
  });

  const utils = trpc.useUtils();
  const { data: bonsCommande = [], isLoading } = trpc.achats.getBonsCommande.useQuery();
  const { data: fournisseurs = [] } = trpc.tiers.getAll.useQuery({ type: "fournisseur" });

  const createBC = trpc.achats.createBonCommande.useMutation({
    onSuccess: () => {
      toast.success("Bon de commande créé avec succès");
      setShowNewBC(false);
      setBcForm({ numero_bc: "", fournisseur_id: "", date_commande: new Date().toISOString().split("T")[0], montant_ht: 0 });
      utils.achats.getBonsCommande.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const validerEtape = trpc.achats.validerEtape.useMutation({
    onSuccess: () => {
      toast.success("Étape validée avec succès");
      utils.achats.getBonsCommande.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const bcEnCours = bonsCommande.filter((bc: any) => bc.statut === "brouillon").length;
  const bcEnValidation = bonsCommande.filter((bc: any) => bc.etape_validation && bc.etape_validation !== "valide").length;

  const montantTVA = Math.round(bcForm.montant_ht * 0.18);
  const montantTTC = bcForm.montant_ht + montantTVA;

  const handleSubmitBC = () => {
    if (!bcForm.numero_bc || !bcForm.fournisseur_id || bcForm.montant_ht <= 0) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    createBC.mutate({ ...bcForm, montant_ttc: montantTTC });
  };

  const getEtapeIndex = (etape: string) => {
    if (etape === "valide") return 4;
    return ETAPES_VALIDATION.findIndex(e => e.key === etape);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Module Achats</h1>
          <p className="text-muted-foreground">Bons de commande, réceptions et workflow de validation</p>
        </div>
        <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowNewBC(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Bon de commande
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">BC en cours</CardTitle>
            <ShoppingCart className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{bcEnCours}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En validation</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{bcEnValidation}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Réceptions</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bon à payer</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{bonsCommande.filter((bc: any) => bc.etape_validation === "valide").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow visuel */}
      <Card className="border-[#daa520]/20 bg-[#daa520]/5">
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3">Workflow de validation (4 étapes)</p>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {ETAPES_VALIDATION.map((etape, i) => (
              <div key={etape.key} className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-8 w-8 rounded-full bg-[#daa520]/20 flex items-center justify-center text-xs font-bold text-[#daa520]">{i + 1}</div>
                  <span className="text-xs">{etape.label}</span>
                </div>
                {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="commandes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="commandes">Bons de commande</TabsTrigger>
          <TabsTrigger value="receptions">Bons de réception</TabsTrigger>
          <TabsTrigger value="factures">Factures fournisseurs</TabsTrigger>
        </TabsList>

        <TabsContent value="commandes">
          <Card className="border-border/50">
            {isLoading ? (
              <CardContent className="pt-6"><p className="text-sm text-muted-foreground text-center py-8">Chargement...</p></CardContent>
            ) : bonsCommande.length === 0 ? (
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Aucun bon de commande</h3>
                  <p className="text-sm text-muted-foreground mt-1">Créez un bon de commande pour lancer le processus d'achat</p>
                  <Button className="mt-4 bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowNewBC(true)}>
                    <Plus className="h-4 w-4 mr-2" />Nouveau BC
                  </Button>
                </div>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° BC</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead className="text-right">Montant TTC</TableHead>
                    <TableHead>Progression</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonsCommande.map((bc: any) => {
                    const etapeIdx = getEtapeIndex(bc.etape_validation);
                    return (
                      <TableRow key={bc.id}>
                        <TableCell className="font-mono text-[#daa520]">{bc.numero_bc}</TableCell>
                        <TableCell className="font-mono text-xs">{bc.date_commande}</TableCell>
                        <TableCell>{bc.fournisseur_id}</TableCell>
                        <TableCell className="text-right font-mono">{(bc.montant_ttc || 0).toLocaleString("fr-FR")} FCFA</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {ETAPES_VALIDATION.map((_, i) => (
                              <div key={i} className={`h-2 w-6 rounded-full ${i < etapeIdx ? "bg-green-500" : i === etapeIdx ? "bg-[#daa520]" : "bg-muted"}`} />
                            ))}
                            {etapeIdx === 4 && <CheckCircle className="h-4 w-4 text-green-500 ml-1" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {etapeIdx === 4 ? "Validé" : ETAPES_VALIDATION[etapeIdx]?.label || bc.etape_validation}
                          </p>
                        </TableCell>
                        <TableCell>
                          {etapeIdx < 4 && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => validerEtape.mutate({ bonCommandeId: bc.id.toString(), etape: bc.etape_validation })}>
                              <CheckCircle className="h-3 w-3 mr-1" />Valider
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="receptions">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Aucun bon de réception</h3>
                <p className="text-sm text-muted-foreground mt-1">Les bons de réception sont créés à la livraison des commandes</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factures">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Aucune facture fournisseur</h3>
                <p className="text-sm text-muted-foreground mt-1">Les factures fournisseurs suivent le workflow de validation en 4 étapes</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Nouveau BC */}
      <Dialog open={showNewBC} onOpenChange={setShowNewBC}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau bon de commande</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>N° BC *</Label>
                <Input value={bcForm.numero_bc} onChange={(e) => setBcForm({ ...bcForm, numero_bc: e.target.value })} placeholder="BC-2026-001" className="font-mono" />
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={bcForm.date_commande} onChange={(e) => setBcForm({ ...bcForm, date_commande: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Fournisseur *</Label>
              {(fournisseurs as any[]).length > 0 ? (
                <Select value={bcForm.fournisseur_id} onValueChange={(v) => setBcForm({ ...bcForm, fournisseur_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                  <SelectContent>
                    {(fournisseurs as any[]).map((f: any) => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.raison_sociale}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={bcForm.fournisseur_id} onChange={(e) => setBcForm({ ...bcForm, fournisseur_id: e.target.value })} placeholder="Nom du fournisseur" />
              )}
            </div>
            <div>
              <Label>Montant HT (FCFA) *</Label>
              <Input type="number" value={bcForm.montant_ht || ""} onChange={(e) => setBcForm({ ...bcForm, montant_ht: Number(e.target.value) || 0 })} placeholder="0" />
            </div>
            <Card className="bg-[#daa520]/5 border-[#daa520]/20">
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xs text-muted-foreground">HT</p><p className="font-mono font-bold">{bcForm.montant_ht.toLocaleString("fr-FR")}</p></div>
                  <div><p className="text-xs text-muted-foreground">TVA 18%</p><p className="font-mono font-bold text-[#daa520]">{montantTVA.toLocaleString("fr-FR")}</p></div>
                  <div><p className="text-xs text-muted-foreground">TTC</p><p className="font-mono font-bold">{montantTTC.toLocaleString("fr-FR")}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBC(false)}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleSubmitBC} disabled={createBC.isPending}>
              {createBC.isPending ? "Création..." : "Créer le BC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
