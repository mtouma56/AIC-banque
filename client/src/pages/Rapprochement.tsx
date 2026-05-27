import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, CheckCircle2, XCircle, ArrowLeftRight, Landmark, FileCheck, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Rapprochement() {
  const utils = trpc.useUtils();
  const { data: rapprochements = [], isLoading: loadingRap, error: errorRap } = trpc.rapprochement.getAll.useQuery();
  const { data: comptesBancaires = [] } = trpc.comptesBancaires.getAll.useQuery();

  // Formulaire nouveau rapprochement
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    compte_banque: "",
    date_rapprochement: new Date().toISOString().split("T")[0],
    solde_comptable: 0,
    solde_releve: 0,
    notes: "",
  });

  // Détail d'un rapprochement
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: detailData } = trpc.rapprochement.getById.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null }
  );

  // Formulaire ajout ligne
  const [showAddLigne, setShowAddLigne] = useState(false);
  const [ligneForm, setLigneForm] = useState({
    date_operation: "",
    libelle: "",
    montant: 0,
    sens: "debit" as "debit" | "credit",
  });

  const createRapprochement = trpc.rapprochement.create.useMutation({
    onSuccess: () => {
      toast.success("Rapprochement créé");
      setShowNew(false);
      setNewForm({ compte_banque: "", date_rapprochement: new Date().toISOString().split("T")[0], solde_comptable: 0, solde_releve: 0, notes: "" });
      utils.rapprochement.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addLigne = trpc.rapprochement.addLigne.useMutation({
    onSuccess: () => {
      toast.success("Ligne ajoutée");
      setShowAddLigne(false);
      setLigneForm({ date_operation: "", libelle: "", montant: 0, sens: "debit" });
      utils.rapprochement.getById.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const pointerLigne = trpc.rapprochement.pointerLigne.useMutation({
    onSuccess: () => { utils.rapprochement.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const validerRapprochement = trpc.rapprochement.valider.useMutation({
    onSuccess: () => {
      toast.success("Rapprochement validé");
      utils.rapprochement.getAll.invalidate();
      utils.rapprochement.getById.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!newForm.compte_banque) {
      toast.error("Veuillez sélectionner un compte bancaire");
      return;
    }
    createRapprochement.mutate(newForm);
  };

  const handleAddLigne = () => {
    if (!ligneForm.date_operation || !ligneForm.libelle || !ligneForm.montant) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    addLigne.mutate({ rapprochement_id: selectedId!, ...ligneForm });
  };

  // Calculs pour le détail
  const lignesPointees = useMemo(() => {
    if (!detailData?.lignes) return 0;
    return (detailData.lignes as any[]).filter((l: any) => l.pointe).length;
  }, [detailData]);

  const totalLignes = detailData?.lignes?.length || 0;
  const ecartRestant = useMemo(() => {
    if (!detailData?.rapprochement || !detailData?.lignes) return 0;
    const nonPointees = (detailData.lignes as any[]).filter((l: any) => !l.pointe);
    return nonPointees.reduce((acc: number, l: any) => {
      return acc + (l.sens === "debit" ? -Number(l.montant) : Number(l.montant));
    }, 0);
  }, [detailData]);

  const formatMontant = (n: number) => Math.round(n).toLocaleString("fr-FR");

  // Vue détail
  if (selectedId && detailData?.rapprochement) {
    const rap = detailData.rapprochement as any;
    const lignes = (detailData.lignes || []) as any[];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Button variant="ghost" className="mb-2" onClick={() => setSelectedId(null)}>
              ← Retour à la liste
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              Rapprochement du {new Date(rap.date_rapprochement).toLocaleDateString("fr-FR")}
            </h1>
            <p className="text-muted-foreground">Compte : {rap.compte_banque}</p>
          </div>
          <div className="flex gap-2">
            {rap.statut === "en_cours" && (
              <>
                <Button variant="outline" onClick={() => setShowAddLigne(true)}>
                  <Plus className="h-4 w-4 mr-1" />Ajouter une ligne
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => validerRapprochement.mutate({ id: selectedId! })}
                  disabled={validerRapprochement.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />Valider
                </Button>
              </>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Solde comptable</p>
              <p className="text-lg font-bold font-mono">{formatMontant(Number(rap.solde_comptable))} FCFA</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Solde relevé bancaire</p>
              <p className="text-lg font-bold font-mono">{formatMontant(Number(rap.solde_releve))} FCFA</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Écart initial</p>
              <p className={`text-lg font-bold font-mono ${Number(rap.ecart) === 0 ? "text-green-500" : "text-orange-500"}`}>
                {formatMontant(Number(rap.ecart))} FCFA
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Lignes pointées</p>
              <p className="text-lg font-bold">{lignesPointees} / {totalLignes}</p>
            </CardContent>
          </Card>
        </div>

        {/* Statut */}
        <div className="flex items-center gap-2">
          <Badge variant={rap.statut === "valide" ? "default" : "secondary"} className={rap.statut === "valide" ? "bg-green-600" : ""}>
            {rap.statut === "en_cours" ? "En cours" : rap.statut === "valide" ? "Validé" : "Clôturé"}
          </Badge>
          {rap.notes && <span className="text-sm text-muted-foreground">— {rap.notes}</span>}
        </div>

        {/* Tableau des lignes */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Opérations à rapprocher</CardTitle>
            <CardDescription>Cochez les opérations qui correspondent au relevé bancaire</CardDescription>
          </CardHeader>
          <CardContent>
            {lignes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucune opération ajoutée</p>
                <p className="text-sm mt-1">Ajoutez les opérations non rapprochées</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Pointé</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Débit</TableHead>
                    <TableHead className="text-right">Crédit</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lignes.map((l: any) => (
                    <TableRow key={l.id} className={l.pointe ? "opacity-60 bg-green-500/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={l.pointe}
                          disabled={rap.statut !== "en_cours"}
                          onCheckedChange={(checked) => {
                            pointerLigne.mutate({ id: l.id, pointe: !!checked });
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {l.date_operation ? new Date(l.date_operation).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell>{l.libelle}</TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {l.sens === "debit" ? formatMontant(Number(l.montant)) : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-400">
                        {l.sens === "credit" ? formatMontant(Number(l.montant)) : ""}
                      </TableCell>
                      <TableCell>
                        {l.pointe ? (
                          <span className="text-xs text-green-500 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />Pointé {l.date_pointage ? `le ${new Date(l.date_pointage).toLocaleDateString("fr-FR")}` : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-orange-400 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />Non pointé
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog ajout ligne */}
        <Dialog open={showAddLigne} onOpenChange={setShowAddLigne}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une opération</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date opération *</Label>
                  <Input type="date" value={ligneForm.date_operation} onChange={(e) => setLigneForm({ ...ligneForm, date_operation: e.target.value })} />
                </div>
                <div>
                  <Label>Sens *</Label>
                  <Select value={ligneForm.sens} onValueChange={(v: any) => setLigneForm({ ...ligneForm, sens: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Débit (sortie)</SelectItem>
                      <SelectItem value="credit">Crédit (entrée)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Libellé *</Label>
                <Input value={ligneForm.libelle} onChange={(e) => setLigneForm({ ...ligneForm, libelle: e.target.value })} placeholder="Virement fournisseur XYZ" />
              </div>
              <div>
                <Label>Montant (FCFA) *</Label>
                <Input type="number" value={ligneForm.montant || ""} onChange={(e) => setLigneForm({ ...ligneForm, montant: Number(e.target.value) })} placeholder="1500000" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddLigne(false)}>Annuler</Button>
              <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleAddLigne} disabled={addLigne.isPending}>
                {addLigne.isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (loadingRap) return <div className="py-12 text-center text-muted-foreground">Chargement des rapprochements...</div>;
  if (errorRap) return <div className="py-12 text-center text-destructive">Erreur : {errorRap.message}</div>;

  // Vue liste
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapprochement Bancaire</h1>
          <p className="text-muted-foreground">Pointage des opérations entre la comptabilité et les relevés bancaires</p>
        </div>
        <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" />Nouveau rapprochement
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total rapprochements</CardTitle>
            <FileCheck className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{(rapprochements as any[]).length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En cours</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-500">
              {(rapprochements as any[]).filter((r: any) => r.statut === "en_cours").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Validés</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-500">
              {(rapprochements as any[]).filter((r: any) => r.statut === "valide").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des rapprochements */}
      {(rapprochements as any[]).length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <ArrowLeftRight className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Aucun rapprochement</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Créez un rapprochement pour commencer à pointer les opérations</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Compte</TableHead>
                <TableHead className="text-right">Solde comptable</TableHead>
                <TableHead className="text-right">Solde relevé</TableHead>
                <TableHead className="text-right">Écart</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rapprochements as any[]).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">
                    {new Date(r.date_rapprochement).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="font-medium">{r.compte_banque}</TableCell>
                  <TableCell className="text-right font-mono">{formatMontant(Number(r.solde_comptable))}</TableCell>
                  <TableCell className="text-right font-mono">{formatMontant(Number(r.solde_releve))}</TableCell>
                  <TableCell className={`text-right font-mono font-medium ${Number(r.ecart) === 0 ? "text-green-500" : "text-orange-500"}`}>
                    {formatMontant(Number(r.ecart))} FCFA
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.statut === "valide" ? "default" : "secondary"} className={r.statut === "valide" ? "bg-green-600" : ""}>
                      {r.statut === "en_cours" ? "En cours" : "Validé"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(r.id)}>
                      <Eye className="h-4 w-4 mr-1" />Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog nouveau rapprochement */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau rapprochement bancaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Compte bancaire *</Label>
              {(comptesBancaires as any[]).length > 0 ? (
                <Select value={newForm.compte_banque} onValueChange={(v) => setNewForm({ ...newForm, compte_banque: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger>
                  <SelectContent>
                    {(comptesBancaires as any[]).map((c: any) => (
                      <SelectItem key={c.id} value={c.code_compte}>
                        {c.code_compte} - {c.libelle} ({c.banque})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground p-3 border rounded-md">
                  <p>Aucun compte bancaire configuré.</p>
                  <p className="text-xs mt-1">Allez dans Paramètres → Comptes bancaires pour en ajouter.</p>
                </div>
              )}
            </div>
            <div>
              <Label>Date du rapprochement *</Label>
              <Input type="date" value={newForm.date_rapprochement} onChange={(e) => setNewForm({ ...newForm, date_rapprochement: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Solde comptable (FCFA)</Label>
                <Input type="number" value={newForm.solde_comptable || ""} onChange={(e) => setNewForm({ ...newForm, solde_comptable: Number(e.target.value) })} placeholder="Solde dans vos livres" />
              </div>
              <div>
                <Label>Solde relevé bancaire (FCFA)</Label>
                <Input type="number" value={newForm.solde_releve || ""} onChange={(e) => setNewForm({ ...newForm, solde_releve: Number(e.target.value) })} placeholder="Solde sur le relevé" />
              </div>
            </div>
            {newForm.solde_comptable > 0 && newForm.solde_releve > 0 && (
              <div className={`p-3 rounded-md text-sm ${newForm.solde_releve - newForm.solde_comptable === 0 ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"}`}>
                Écart : <span className="font-mono font-bold">{formatMontant(newForm.solde_releve - newForm.solde_comptable)} FCFA</span>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={newForm.notes} onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} placeholder="Observations éventuelles..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleCreate} disabled={createRapprochement.isPending}>
              {createRapprochement.isPending ? "Création..." : "Créer le rapprochement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
