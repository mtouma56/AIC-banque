import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, FileText, Send, CheckCircle2, XCircle, ArrowRight, MoreHorizontal, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-gray-500" },
  envoye: { label: "Envoyé", color: "bg-blue-500" },
  accepte: { label: "Accepté", color: "bg-green-500" },
  refuse: { label: "Refusé", color: "bg-red-500" },
  expire: { label: "Expiré", color: "bg-orange-500" },
  converti: { label: "Converti", color: "bg-[#daa520]" },
};

interface LigneDevis {
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant: number;
}

export default function Devis() {
  const utils = trpc.useUtils();
  const { data: devisList = [], isLoading, error } = trpc.devis.getAll.useQuery();
  const { data: tiers = [] } = trpc.tiers.getAll.useQuery();
  const { data: previewNumero } = trpc.numerotation.preview.useQuery({ type_document: "devis" });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    date_devis: new Date().toISOString().split("T")[0],
    date_validite: "",
    client_nom: "",
    client_id: undefined as number | undefined,
    objet: "",
    taux_tva: 18,
    notes: "",
  });
  const [lignes, setLignes] = useState<LigneDevis[]>([
    { description: "", quantite: 1, prix_unitaire: 0, montant: 0 },
  ]);

  const createDevis = trpc.devis.create.useMutation({
    onSuccess: () => {
      toast.success("Devis créé avec succès");
      setShowCreate(false);
      resetForm();
      utils.devis.getAll.invalidate();
      utils.numerotation.preview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.devis.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Statut mis à jour");
      utils.devis.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const convertir = trpc.devis.convertirEnFacture.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Devis converti en facture ${data.numeroFacture}`);
      utils.devis.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ date_devis: new Date().toISOString().split("T")[0], date_validite: "", client_nom: "", client_id: undefined, objet: "", taux_tva: 18, notes: "" });
    setLignes([{ description: "", quantite: 1, prix_unitaire: 0, montant: 0 }]);
  };

  // Calculs
  const montantHT = useMemo(() => lignes.reduce((sum, l) => sum + l.montant, 0), [lignes]);
  const montantTVA = useMemo(() => Math.round(montantHT * form.taux_tva / 100), [montantHT, form.taux_tva]);
  const montantTTC = useMemo(() => montantHT + montantTVA, [montantHT, montantTVA]);

  // KPIs
  const devisEnCours = useMemo(() => (devisList as any[]).filter((d: any) => d.status === "envoye" || d.status === "brouillon").length, [devisList]);
  const devisAcceptes = useMemo(() => (devisList as any[]).filter((d: any) => d.status === "accepte" || d.status === "converti").length, [devisList]);
  const montantTotal = useMemo(() => (devisList as any[]).reduce((s: number, d: any) => s + Number(d.montant_ttc || 0), 0), [devisList]);

  const formatMontant = (n: number) => Math.round(n).toLocaleString("fr-FR");

  const updateLigne = (index: number, field: keyof LigneDevis, value: string | number) => {
    const newLignes = [...lignes];
    (newLignes[index] as any)[field] = value;
    // Recalculer le montant
    newLignes[index].montant = Math.round(newLignes[index].quantite * newLignes[index].prix_unitaire);
    setLignes(newLignes);
  };

  const addLigne = () => {
    setLignes([...lignes, { description: "", quantite: 1, prix_unitaire: 0, montant: 0 }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length <= 1) return;
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!form.client_nom) { toast.error("Veuillez saisir le client"); return; }
    if (lignes.some(l => !l.description || l.prix_unitaire <= 0)) { toast.error("Veuillez remplir toutes les lignes (description et prix)"); return; }

    createDevis.mutate({
      ...form,
      montant_ht: montantHT,
      montant_tva: montantTVA,
      montant_ttc: montantTTC,
      lignes,
    });
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Chargement des devis...</div>;
  if (error) return <div className="py-12 text-center text-destructive">Erreur : {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devis</h1>
          <p className="text-muted-foreground">Création, suivi et conversion des devis en factures</p>
        </div>
        <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />Nouveau devis
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total devis</CardTitle>
            <FileText className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{(devisList as any[]).length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En cours</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-500">{devisEnCours}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acceptés/Convertis</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-500">{devisAcceptes}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Montant total</CardTitle>
            <Receipt className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono">{formatMontant(montantTotal)} <span className="text-sm font-normal">FCFA</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des devis */}
      {(devisList as any[]).length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Aucun devis</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Créez votre premier devis pour commencer</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Devis</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Objet</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(devisList as any[]).map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono font-medium text-[#daa520]">{d.numero}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {d.date_devis ? new Date(d.date_devis).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{d.client_nom}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{d.objet || "—"}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatMontant(Number(d.montant_ttc))}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {d.date_validite ? new Date(d.date_validite).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_LABELS[d.status]?.color || "bg-gray-500"}>
                      {STATUS_LABELS[d.status]?.label || d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {d.status === "brouillon" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: d.id, status: "envoye" })}>
                            <Send className="h-4 w-4 mr-2" />Marquer envoyé
                          </DropdownMenuItem>
                        )}
                        {(d.status === "envoye" || d.status === "brouillon") && (
                          <>
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: d.id, status: "accepte" })}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />Accepter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: d.id, status: "refuse" })}>
                              <XCircle className="h-4 w-4 mr-2" />Refuser
                            </DropdownMenuItem>
                          </>
                        )}
                        {d.status === "accepte" && (
                          <DropdownMenuItem onClick={() => convertir.mutate({ id: d.id })}>
                            <ArrowRight className="h-4 w-4 mr-2" />Convertir en facture
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog création devis */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#daa520]" />
              Nouveau devis
            </DialogTitle>
            <DialogDescription>
              Numéro auto-généré : <span className="font-mono text-[#daa520]">{typeof previewNumero === "string" ? previewNumero : (previewNumero as any)?.numero || "DEV-YYYY-NNNN"}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* En-tête du devis */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Date du devis *</Label>
                <Input type="date" value={form.date_devis} onChange={(e) => setForm({ ...form, date_devis: e.target.value })} />
              </div>
              <div>
                <Label>Date de validité</Label>
                <Input type="date" value={form.date_validite} onChange={(e) => setForm({ ...form, date_validite: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Client *</Label>
                {(tiers as any[]).length > 0 ? (
                  <Select
                    value={form.client_nom}
                    onValueChange={(v) => {
                      const client = (tiers as any[]).find((t: any) => t.nom === v);
                      setForm({ ...form, client_nom: v, client_id: client?.id });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                    <SelectContent>
                      {(tiers as any[]).filter((t: any) => t.type === "client" || t.type === "les_deux").map((t: any) => (
                        <SelectItem key={t.id} value={t.nom}>{t.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.client_nom} onChange={(e) => setForm({ ...form, client_nom: e.target.value })} placeholder="Nom du client" />
                )}
              </div>
            </div>

            <div>
              <Label>Objet du devis</Label>
              <Input value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} placeholder="Ex: Prestation de conseil en investissement" />
            </div>

            {/* Lignes du devis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Lignes du devis</Label>
                <Button variant="outline" size="sm" onClick={addLigne}>
                  <Plus className="h-3 w-3 mr-1" />Ajouter une ligne
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Description</TableHead>
                      <TableHead className="w-[15%]">Quantité</TableHead>
                      <TableHead className="w-[20%]">Prix unitaire</TableHead>
                      <TableHead className="w-[20%] text-right">Montant</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lignes.map((ligne, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input
                            value={ligne.description}
                            onChange={(e) => updateLigne(i, "description", e.target.value)}
                            placeholder="Description du service/produit"
                            className="border-0 bg-transparent p-0 h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={ligne.quantite || ""}
                            onChange={(e) => updateLigne(i, "quantite", Number(e.target.value))}
                            className="border-0 bg-transparent p-0 h-8 w-16"
                            min={1}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={ligne.prix_unitaire || ""}
                            onChange={(e) => updateLigne(i, "prix_unitaire", Number(e.target.value))}
                            className="border-0 bg-transparent p-0 h-8"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatMontant(ligne.montant)}
                        </TableCell>
                        <TableCell>
                          {lignes.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => removeLigne(i)} className="h-6 w-6 p-0 text-red-400 hover:text-red-500">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totaux */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2 border rounded-lg p-4 bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total HT</span>
                  <span className="font-mono">{formatMontant(montantHT)} FCFA</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    TVA
                    <Input
                      type="number"
                      value={form.taux_tva}
                      onChange={(e) => setForm({ ...form, taux_tva: Number(e.target.value) })}
                      className="w-14 h-6 text-xs inline border-0 bg-transparent p-1"
                    />%
                  </span>
                  <span className="font-mono">{formatMontant(montantTVA)} FCFA</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total TTC</span>
                  <span className="font-mono text-[#daa520]">{formatMontant(montantTTC)} FCFA</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes / Conditions</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Conditions de paiement, délais, etc." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleCreate} disabled={createDevis.isPending}>
              {createDevis.isPending ? "Création..." : "Créer le devis"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
