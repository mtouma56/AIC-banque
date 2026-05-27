import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle, Package, FileText, Eye, ArrowLeft } from "lucide-react";

interface LigneReception {
  article_id?: number;
  designation: string;
  quantite_commandee: number;
  quantite_recue: number;
  quantite_conforme: number;
  prix_unitaire: number;
  motif_ecart?: string;
}

export default function Receptions() {
  const utils = trpc.useUtils();
  const { data: receptions = [], isLoading, error } = trpc.receptions.getAll.useQuery();
  const { data: articles = [] } = trpc.stock.getArticles.useQuery();
  const { data: tiers = [] } = trpc.tiers.getAll.useQuery();
  const { data: bonsCommande = [] } = trpc.achats.getBonsCommande.useQuery();
  const { data: previewNumero } = trpc.numerotation.preview.useQuery({ type_document: "bon_reception" });

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Formulaire
  const [bonCommandeId, setBonCommandeId] = useState<string>("");
  const [fournisseurId, setFournisseurId] = useState<string>("");
  const [dateReception, setDateReception] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [lignes, setLignes] = useState<LigneReception[]>([
    { designation: "", quantite_commandee: 0, quantite_recue: 0, quantite_conforme: 0, prix_unitaire: 0 },
  ]);

  const fournisseurs = useMemo(() => tiers.filter((t: any) => t.type === "fournisseur" || t.type === "les_deux"), [tiers]);
  const bcEnCours = useMemo(() => bonsCommande.filter((bc: any) => bc.status !== "livre" && bc.status !== "annule"), [bonsCommande]);

  const createMutation = trpc.receptions.create.useMutation({
    onSuccess: () => {
      toast.success("Bon de réception créé");
      utils.receptions.getAll.invalidate();
      utils.numerotation.preview.invalidate();
      setShowCreate(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const validerMutation = trpc.receptions.valider.useMutation({
    onSuccess: () => {
      toast.success("Bon de réception validé et stock mis à jour !");
      utils.receptions.getAll.invalidate();
      utils.stock.getArticles.invalidate();
      utils.stock.getMouvements.invalidate();
      utils.achats.getBonsCommande.invalidate();
      setSelectedId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setBonCommandeId("");
    setFournisseurId("");
    setDateReception(new Date().toISOString().split("T")[0]);
    setNotes("");
    setLignes([{ designation: "", quantite_commandee: 0, quantite_recue: 0, quantite_conforme: 0, prix_unitaire: 0 }]);
  };

  const addLigne = () => {
    setLignes([...lignes, { designation: "", quantite_commandee: 0, quantite_recue: 0, quantite_conforme: 0, prix_unitaire: 0 }]);
  };

  const removeLigne = (idx: number) => {
    if (lignes.length <= 1) return;
    setLignes(lignes.filter((_, i) => i !== idx));
  };

  const updateLigne = (idx: number, field: keyof LigneReception, value: any) => {
    const updated = [...lignes];
    (updated[idx] as any)[field] = value;
    // Auto-fill quantite_conforme = quantite_recue par défaut
    if (field === "quantite_recue") {
      updated[idx].quantite_conforme = value;
    }
    setLignes(updated);
  };

  const selectArticle = (idx: number, articleId: string) => {
    const article = articles.find((a: any) => a.id === Number(articleId));
    if (article) {
      const updated = [...lignes];
      updated[idx].article_id = article.id;
      updated[idx].designation = article.designation;
      updated[idx].prix_unitaire = Number(article.prix_achat || 0);
      setLignes(updated);
    }
  };

  const handleSubmit = () => {
    const validLignes = lignes.filter(l => l.designation && l.quantite_recue > 0);
    if (validLignes.length === 0) {
      toast.error("Ajoutez au moins une ligne avec une désignation et une quantité reçue");
      return;
    }
    // Vérifier que conforme <= reçue
    for (const l of validLignes) {
      if (l.quantite_conforme > l.quantite_recue) {
        toast.error(`Quantité conforme ne peut pas dépasser la quantité reçue pour "${l.designation}"`);
        return;
      }
    }
    createMutation.mutate({
      bon_commande_id: bonCommandeId && bonCommandeId !== "none" ? Number(bonCommandeId) : undefined,
      fournisseur_id: fournisseurId ? Number(fournisseurId) : undefined,
      date_reception: dateReception,
      notes,
      lignes: validLignes,
    });
  };

  const filteredReceptions = useMemo(() => {
    if (filterStatus === "all") return receptions;
    return receptions.filter((r: any) => r.status === filterStatus);
  }, [receptions, filterStatus]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "brouillon": return <Badge variant="outline">Brouillon</Badge>;
      case "valide": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Validé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Vue détail
  const { data: detailBR } = trpc.receptions.getById.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Chargement des bons de réception...</div>;
  if (error) return <div className="py-12 text-center text-destructive">Erreur : {error.message}</div>;

  // Vue détail d'un BR
  if (selectedId && detailBR) {
    const totalRecue = (detailBR.lignes || []).reduce((s: number, l: any) => s + Number(l.quantite_recue || 0), 0);
    const totalConforme = (detailBR.lignes || []).reduce((s: number, l: any) => s + Number(l.quantite_conforme || 0), 0);
    const totalValeur = (detailBR.lignes || []).reduce((s: number, l: any) => s + Number(l.quantite_conforme || 0) * Number(l.prix_unitaire || 0), 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <h1 className="text-xl font-bold">{detailBR.numero}</h1>
          {statusBadge(detailBR.status || "brouillon")}
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Date réception</p>
              <p className="text-sm font-semibold">{new Date(detailBR.date_reception).toLocaleDateString("fr-FR")}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Qté reçue</p>
              <p className="text-sm font-semibold">{totalRecue}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Qté conforme</p>
              <p className="text-sm font-semibold text-green-500">{totalConforme}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Valeur totale</p>
              <p className="text-sm font-semibold">{totalValeur.toLocaleString("fr-FR")} FCFA</p>
            </CardContent>
          </Card>
        </div>

        {/* Lignes */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lignes de réception</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead className="text-right">Qté commandée</TableHead>
                  <TableHead className="text-right">Qté reçue</TableHead>
                  <TableHead className="text-right">Qté conforme</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Écart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(detailBR.lignes || []).map((l: any, i: number) => {
                  const ecart = Number(l.quantite_recue) - Number(l.quantite_conforme);
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{l.designation}</TableCell>
                      <TableCell className="text-right">{Number(l.quantite_commandee)}</TableCell>
                      <TableCell className="text-right">{Number(l.quantite_recue)}</TableCell>
                      <TableCell className="text-right text-green-500">{Number(l.quantite_conforme)}</TableCell>
                      <TableCell className="text-right">{Number(l.prix_unitaire).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right font-medium">
                        {(Number(l.quantite_conforme) * Number(l.prix_unitaire)).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {ecart > 0 ? (
                          <span className="text-red-500 text-xs">-{ecart} non conforme</span>
                        ) : l.motif_ecart ? (
                          <span className="text-yellow-500 text-xs">{l.motif_ecart}</span>
                        ) : (
                          <span className="text-green-500 text-xs">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Actions */}
        {detailBR.status === "brouillon" && (
          <div className="flex gap-3">
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => validerMutation.mutate({ id: selectedId! })}
              disabled={validerMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {validerMutation.isPending ? "Validation en cours..." : "Valider et mettre en stock"}
            </Button>
          </div>
        )}

        {detailBR.notes && (
          <Card className="border-border/30">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{detailBR.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Vue liste
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bons de réception</h1>
          <p className="text-muted-foreground">Réception, contrôle et mise en stock automatique</p>
        </div>
        <Button className="bg-[#daa520] hover:bg-[#b8860b] text-black" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau BR
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Package className="h-5 w-5 text-[#daa520]" />
            <div>
              <p className="text-xs text-muted-foreground">Total BR</p>
              <p className="text-lg font-bold">{receptions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <FileText className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-lg font-bold">{receptions.filter((r: any) => r.status === "brouillon").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Validés</p>
              <p className="text-lg font-bold">{receptions.filter((r: any) => r.status === "valide").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtre */}
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="valide">Validé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <Card className="border-border/50">
        <CardContent className="pt-4">
          {filteredReceptions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucun bon de réception</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>BC lié</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceptions.map((r: any) => {
                  const fournisseur = fournisseurs.find((f: any) => f.id === r.fournisseur_id);
                  const bc = bonsCommande.find((b: any) => b.id === r.bon_commande_id);
                  return (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(r.id)}>
                      <TableCell className="font-medium text-[#daa520]">{r.numero}</TableCell>
                      <TableCell>{new Date(r.date_reception).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{fournisseur?.nom || "—"}</TableCell>
                      <TableCell>{bc?.numero || "—"}</TableCell>
                      <TableCell>{statusBadge(r.status || "brouillon")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog création */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau bon de réception</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Numéro auto */}
            <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#daa520]" />
              <span className="text-sm text-muted-foreground">Numéro :</span>
              <span className="font-mono font-semibold text-[#daa520]">
                {typeof previewNumero === "object" && previewNumero?.numero ? previewNumero.numero : "BR-..."}
              </span>
              <span className="text-xs text-muted-foreground ml-2">(auto-généré)</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Bon de commande lié</Label>
                <Select value={bonCommandeId} onValueChange={setBonCommandeId}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {bcEnCours.map((bc: any) => (
                      <SelectItem key={bc.id} value={String(bc.id)}>{bc.numero}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fournisseur</Label>
                <Select value={fournisseurId} onValueChange={setFournisseurId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {fournisseurs.map((f: any) => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de réception</Label>
                <Input type="date" value={dateReception} onChange={e => setDateReception(e.target.value)} />
              </div>
            </div>

            {/* Lignes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Lignes de réception</Label>
                <Button variant="outline" size="sm" onClick={addLigne}>
                  <Plus className="h-3 w-3 mr-1" /> Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {lignes.map((ligne, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border border-border/30 rounded-lg p-3">
                    <div className="col-span-3">
                      <Label className="text-xs">Article</Label>
                      <Select
                        value={ligne.article_id ? String(ligne.article_id) : ""}
                        onValueChange={(v) => selectArticle(idx, v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {articles.map((a: any) => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.designation}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Désignation</Label>
                      <Input
                        value={ligne.designation}
                        onChange={e => updateLigne(idx, "designation", e.target.value)}
                        placeholder="Désignation"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qté cmd</Label>
                      <Input
                        type="number"
                        value={ligne.quantite_commandee || ""}
                        onChange={e => updateLigne(idx, "quantite_commandee", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qté reçue</Label>
                      <Input
                        type="number"
                        value={ligne.quantite_recue || ""}
                        onChange={e => updateLigne(idx, "quantite_recue", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Conforme</Label>
                      <Input
                        type="number"
                        value={ligne.quantite_conforme || ""}
                        onChange={e => updateLigne(idx, "quantite_conforme", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Prix unit.</Label>
                      <Input
                        type="number"
                        value={ligne.prix_unitaire || ""}
                        onChange={e => updateLigne(idx, "prix_unitaire", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2 flex items-end gap-1">
                      <div className="flex-1">
                        <Label className="text-xs">Motif écart</Label>
                        <Input
                          value={ligne.motif_ecart || ""}
                          onChange={e => updateLigne(idx, "motif_ecart", e.target.value)}
                          placeholder="Si écart"
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeLigne(idx)} disabled={lignes.length <= 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button
              className="bg-[#daa520] hover:bg-[#b8860b] text-black"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Création..." : "Créer le BR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
