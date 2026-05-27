import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Receipt, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Ventes() {
  const [showNewFacture, setShowNewFacture] = useState(false);
  const [factureForm, setFactureForm] = useState({
    numero_facture: "",
    client_id: "",
    date_facture: new Date().toISOString().split("T")[0],
    montant_ht: 0,
  });

  const utils = trpc.useUtils();
  const { data: factures = [], isLoading } = trpc.ventes.getFactures.useQuery();
  const { data: clients = [] } = trpc.tiers.getAll.useQuery({ type: "client" });

  const createFacture = trpc.ventes.createFacture.useMutation({
    onSuccess: () => {
      toast.success("Facture créée avec succès");
      setShowNewFacture(false);
      setFactureForm({ numero_facture: "", client_id: "", date_facture: new Date().toISOString().split("T")[0], montant_ht: 0 });
      utils.ventes.getFactures.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalTTC = factures.reduce((sum: number, f: any) => sum + (f.montant_ttc || 0), 0);
  const facturesEnCours = factures.filter((f: any) => f.statut === "brouillon").length;
  const facturesValidees = factures.filter((f: any) => f.statut === "validee").length;

  const montantTVA = Math.round(factureForm.montant_ht * 0.18);
  const montantTTC = factureForm.montant_ht + montantTVA;

  const handleSubmitFacture = () => {
    if (!factureForm.numero_facture || !factureForm.client_id || factureForm.montant_ht <= 0) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    createFacture.mutate({
      ...factureForm,
      tva: 18,
      montant_ttc: montantTTC,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Module Ventes</h1>
          <p className="text-muted-foreground">Devis, factures et abonnements - TVA 18%</p>
        </div>
        <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowNewFacture(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle facture
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Factures émises</CardTitle>
            <Receipt className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{factures.length}</div>
            <p className="text-xs text-muted-foreground">{totalTTC.toLocaleString("fr-FR")} FCFA TTC</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En cours</CardTitle>
            <FileText className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{facturesEnCours}</div>
            <p className="text-xs text-muted-foreground">brouillons</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Validées</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{facturesValidees}</div>
            <p className="text-xs text-muted-foreground">factures</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TVA collectée</CardTitle>
            <Receipt className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{Math.round(totalTTC - totalTTC / 1.18).toLocaleString("fr-FR")}</div>
            <p className="text-xs text-muted-foreground">FCFA (18%)</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">Liste des factures</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
          ) : factures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Aucune facture</h3>
              <p className="text-sm text-muted-foreground mt-1">Créez votre première facture de vente</p>
              <Button className="mt-4 bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowNewFacture(true)}>
                <Plus className="h-4 w-4 mr-2" />Nouvelle facture
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Montant HT</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="text-right">Montant TTC</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factures.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-[#daa520]">{f.numero_facture}</TableCell>
                    <TableCell className="font-mono text-xs">{f.date_facture}</TableCell>
                    <TableCell>{f.client_id}</TableCell>
                    <TableCell className="text-right font-mono">{(f.montant_ht || 0).toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right font-mono">{Math.round((f.montant_ttc || 0) - (f.montant_ht || 0)).toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{(f.montant_ttc || 0).toLocaleString("fr-FR")}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        f.statut === "validee" ? "bg-green-500/10 text-green-500" :
                        f.statut === "payee" ? "bg-blue-500/10 text-blue-500" :
                        "bg-yellow-500/10 text-yellow-500"
                      }`}>{f.statut || "brouillon"}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DIALOG: Nouvelle facture */}
      <Dialog open={showNewFacture} onOpenChange={setShowNewFacture}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle facture de vente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>N° Facture *</Label>
                <Input value={factureForm.numero_facture} onChange={(e) => setFactureForm({ ...factureForm, numero_facture: e.target.value })} placeholder="FA-2026-001" className="font-mono" />
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={factureForm.date_facture} onChange={(e) => setFactureForm({ ...factureForm, date_facture: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Client *</Label>
              {(clients as any[]).length > 0 ? (
                <Select value={factureForm.client_id} onValueChange={(v) => setFactureForm({ ...factureForm, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                  <SelectContent>
                    {(clients as any[]).map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.raison_sociale}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={factureForm.client_id} onChange={(e) => setFactureForm({ ...factureForm, client_id: e.target.value })} placeholder="Nom du client (créez d'abord un tiers)" />
              )}
            </div>
            <div>
              <Label>Montant HT (FCFA) *</Label>
              <Input type="number" value={factureForm.montant_ht || ""} onChange={(e) => setFactureForm({ ...factureForm, montant_ht: Number(e.target.value) || 0 })} placeholder="0" />
            </div>
            <Card className="bg-[#daa520]/5 border-[#daa520]/20">
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xs text-muted-foreground">HT</p><p className="font-mono font-bold">{factureForm.montant_ht.toLocaleString("fr-FR")}</p></div>
                  <div><p className="text-xs text-muted-foreground">TVA 18%</p><p className="font-mono font-bold text-[#daa520]">{montantTVA.toLocaleString("fr-FR")}</p></div>
                  <div><p className="text-xs text-muted-foreground">TTC</p><p className="font-mono font-bold">{montantTTC.toLocaleString("fr-FR")}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFacture(false)}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleSubmitFacture} disabled={createFacture.isPending}>
              {createFacture.isPending ? "Création..." : "Créer la facture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
