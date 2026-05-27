import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, BookOpen, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface LigneEcriture {
  compte_numero: string;
  libelle: string;
  debit: number;
  credit: number;
}

export default function Comptabilite() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewEcriture, setShowNewEcriture] = useState(false);
  const [showNewCompte, setShowNewCompte] = useState(false);

  // Form state - Nouvelle écriture
  const [ecritureForm, setEcritureForm] = useState({
    journal_id: "",
    date_ecriture: new Date().toISOString().split("T")[0],
    libelle: "",
  });
  const [lignes, setLignes] = useState<LigneEcriture[]>([
    { compte_numero: "", libelle: "", debit: 0, credit: 0 },
    { compte_numero: "", libelle: "", debit: 0, credit: 0 },
  ]);

  // Form state - Nouveau compte
  const [compteForm, setCompteForm] = useState({
    numero_compte: "",
    libelle: "",
    classe: 1,
    nature: "actif",
  });

  const utils = trpc.useUtils();
  const { data: planComptable = [], isLoading: loadingPlan } = trpc.comptabilite.getPlanComptable.useQuery();
  const { data: journaux = [], isLoading: loadingJournaux } = trpc.comptabilite.getJournaux.useQuery();
  const { data: ecritures = [] } = trpc.comptabilite.getEcritures.useQuery();
  const { data: grandLivre = [], isLoading: loadingGL } = trpc.comptabilite.getGrandLivre.useQuery();
  const { data: balance, isLoading: loadingBalance } = trpc.comptabilite.getBalance.useQuery();

  const { data: nextNumEcriture } = trpc.numerotation.preview.useQuery({ type_document: "ecriture" });

  const createEcriture = trpc.comptabilite.createEcriture.useMutation({
    onSuccess: () => {
      toast.success("Écriture comptable créée avec succès");
      setShowNewEcriture(false);
      setEcritureForm({ journal_id: "", date_ecriture: new Date().toISOString().split("T")[0], libelle: "" });
      setLignes([{ compte_numero: "", libelle: "", debit: 0, credit: 0 }, { compte_numero: "", libelle: "", debit: 0, credit: 0 }]);
      utils.comptabilite.getEcritures.invalidate();
      utils.comptabilite.getGrandLivre.invalidate();
      utils.comptabilite.getBalance.invalidate();
      utils.numerotation.preview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createCompte = trpc.comptabilite.createCompte.useMutation({
    onSuccess: () => {
      toast.success("Compte créé avec succès");
      setShowNewCompte(false);
      setCompteForm({ numero_compte: "", libelle: "", classe: 1, nature: "actif" });
      utils.comptabilite.getPlanComptable.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const validerEcriture = trpc.comptabilite.validerEcriture.useMutation({
    onSuccess: () => {
      toast.success("Écriture validée");
      utils.comptabilite.getEcritures.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredPlan = (planComptable as any[]).filter(
    (c: any) =>
      c.numero_compte?.includes(searchTerm) ||
      c.libelle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMontant = (n: number) => Math.round(n).toLocaleString("fr-FR");

  const totalDebit = lignes.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lignes.reduce((s, l) => s + l.credit, 0);
  const isEquilibre = Math.abs(totalDebit - totalCredit) < 1;

  const addLigne = () => setLignes([...lignes, { compte_numero: "", libelle: "", debit: 0, credit: 0 }]);
  const removeLigne = (i: number) => { if (lignes.length > 2) setLignes(lignes.filter((_, idx) => idx !== i)); };

  const handleSubmitEcriture = () => {
    if (!ecritureForm.journal_id || !ecritureForm.libelle) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (!isEquilibre) {
      toast.error(`Écriture déséquilibrée : Débit ${formatMontant(totalDebit)} ≠ Crédit ${formatMontant(totalCredit)}`);
      return;
    }
    createEcriture.mutate({ ...ecritureForm, lignes });
  };

  const handleSubmitCompte = () => {
    if (!compteForm.numero_compte || !compteForm.libelle) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    createCompte.mutate(compteForm);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comptabilité Générale</h1>
          <p className="text-muted-foreground">Plan comptable SYSCOHADA - Exercice 2026</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewCompte(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau compte
          </Button>
          <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowNewEcriture(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle écriture
          </Button>
        </div>
      </div>

      <Tabs defaultValue="plan" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="plan">Plan comptable</TabsTrigger>
          <TabsTrigger value="journaux">Journaux</TabsTrigger>
          <TabsTrigger value="ecritures">Écritures</TabsTrigger>
          <TabsTrigger value="grandlivre">Grand livre</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
        </TabsList>

        {/* PLAN COMPTABLE */}
        <TabsContent value="plan" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un compte..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Card className="border-border/50">
            {loadingPlan ? (
              <CardContent className="pt-6"><p className="text-sm text-muted-foreground text-center py-8">Chargement...</p></CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">N° Compte</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="w-20">Classe</TableHead>
                    <TableHead className="w-24">Nature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlan.map((compte: any) => (
                    <TableRow key={compte.id || compte.numero_compte}>
                      <TableCell className="font-mono font-medium text-[#daa520]">{compte.numero_compte}</TableCell>
                      <TableCell>{compte.libelle}</TableCell>
                      <TableCell>{compte.classe}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          compte.nature === "actif" ? "bg-green-500/10 text-green-500" :
                          compte.nature === "passif" ? "bg-blue-500/10 text-blue-500" :
                          compte.nature === "charge" ? "bg-red-500/10 text-red-500" :
                          "bg-purple-500/10 text-purple-500"
                        }`}>{compte.nature}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPlan.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun compte trouvé</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* JOURNAUX */}
        <TabsContent value="journaux" className="space-y-4">
          {loadingJournaux ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(journaux as any[]).map((journal: any) => (
                <Card key={journal.id || journal.code} className="border-border/50 hover:border-[#daa520]/30 transition-colors">
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className="h-10 w-10 rounded-lg bg-[#daa520]/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-[#daa520]" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{journal.libelle}</CardTitle>
                      <p className="text-xs text-muted-foreground">Code: {journal.code}</p>
                    </div>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">Type: {journal.type}</p></CardContent>
                </Card>
              ))}
              {(journaux as any[]).length === 0 && (
                <p className="text-sm text-muted-foreground col-span-3 text-center py-8">Aucun journal configuré</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ÉCRITURES */}
        <TabsContent value="ecritures">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              {(ecritures as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Aucune écriture</h3>
                  <p className="text-sm text-muted-foreground mt-1">Commencez par créer une nouvelle écriture comptable</p>
                  <Button className="mt-4 bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowNewEcriture(true)}>
                    <Plus className="h-4 w-4 mr-2" />Nouvelle écriture
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>N° Pièce</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ecritures as any[]).map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.date_ecriture}</TableCell>
                        <TableCell className="text-[#daa520]">{e.numero_piece}</TableCell>
                        <TableCell>{e.libelle}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            e.statut === "validee" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                          }`}>{e.statut || "brouillon"}</span>
                        </TableCell>
                        <TableCell>
                          {e.statut !== "validee" && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => validerEcriture.mutate({ id: e.id })}>
                              <CheckCircle className="h-3 w-3 mr-1" />Valider
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GRAND LIVRE */}
        <TabsContent value="grandlivre">
          {loadingGL ? (
            <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground text-center py-8">Chargement du grand livre...</p></CardContent></Card>
          ) : (grandLivre as any[]).length === 0 ? (
            <Card className="border-border/50"><CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Grand Livre vide</h3>
                <p className="text-sm text-muted-foreground mt-1">Le grand livre sera généré à partir des écritures comptables.</p>
              </div>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {(grandLivre as any[]).map((compte: any) => (
                <Card key={compte.numero_compte} className="border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="font-mono text-[#daa520]">{compte.numero_compte}</span>
                        <span>{compte.libelle_compte}</span>
                      </CardTitle>
                      <span className={`text-sm font-mono font-bold ${compte.solde >= 0 ? "text-green-400" : "text-red-400"}`}>
                        Solde: {formatMontant(compte.solde)} FCFA
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Journal</TableHead>
                          <TableHead>N° Pièce</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead className="text-right">Débit</TableHead>
                          <TableHead className="text-right">Crédit</TableHead>
                          <TableHead className="text-right">Solde cumulé</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compte.mouvements?.map((m: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{m.date}</TableCell>
                            <TableCell className="font-mono text-xs">{m.journal}</TableCell>
                            <TableCell className="text-xs">{m.numero_piece}</TableCell>
                            <TableCell className="text-xs">{m.libelle}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{m.debit > 0 ? formatMontant(m.debit) : ""}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{m.credit > 0 ? formatMontant(m.credit) : ""}</TableCell>
                            <TableCell className="text-right font-mono text-xs font-medium">{formatMontant(m.solde_cumule)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* BALANCE */}
        <TabsContent value="balance">
          {loadingBalance ? (
            <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground text-center py-8">Calcul de la balance...</p></CardContent></Card>
          ) : !balance || (balance as any).lignes?.length === 0 ? (
            <Card className="border-border/50"><CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Balance vide</h3>
                <p className="text-sm text-muted-foreground mt-1">La balance sera calculée à partir des écritures comptables.</p>
              </div>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              <Card className={`border-2 ${(balance as any).equilibre ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                <CardContent className="pt-4 flex items-center gap-3">
                  {(balance as any).equilibre ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
                  <div>
                    <p className="font-medium text-sm">{(balance as any).equilibre ? "Balance équilibrée" : "Balance déséquilibrée"}</p>
                    <p className="text-xs text-muted-foreground">
                      Total Débit: {formatMontant((balance as any).total_debit)} | Total Crédit: {formatMontant((balance as any).total_credit)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Compte</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead className="text-right">Débit</TableHead>
                      <TableHead className="text-right">Crédit</TableHead>
                      <TableHead className="text-right">Solde Débiteur</TableHead>
                      <TableHead className="text-right">Solde Créditeur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(balance as any).lignes?.map((l: any) => (
                      <TableRow key={l.numero_compte}>
                        <TableCell className="font-mono text-[#daa520]">{l.numero_compte}</TableCell>
                        <TableCell>{l.libelle}</TableCell>
                        <TableCell className="text-right font-mono">{formatMontant(l.debit)}</TableCell>
                        <TableCell className="text-right font-mono">{formatMontant(l.credit)}</TableCell>
                        <TableCell className="text-right font-mono">{l.solde_debiteur > 0 ? formatMontant(l.solde_debiteur) : ""}</TableCell>
                        <TableCell className="text-right font-mono">{l.solde_crediteur > 0 ? formatMontant(l.solde_crediteur) : ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DIALOG: Nouvelle écriture */}
      <Dialog open={showNewEcriture} onOpenChange={setShowNewEcriture}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle écriture comptable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Journal *</Label>
                <Select value={ecritureForm.journal_id} onValueChange={(v) => setEcritureForm({ ...ecritureForm, journal_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un journal" /></SelectTrigger>
                  <SelectContent>
                    {(journaux as any[]).map((j: any) => (
                      <SelectItem key={j.id} value={j.id.toString()}>{j.libelle} ({j.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={ecritureForm.date_ecriture} onChange={(e) => setEcritureForm({ ...ecritureForm, date_ecriture: e.target.value })} />
              </div>
              <div>
                <Label>N° Pièce (auto)</Label>
                <Input value={nextNumEcriture?.numero || "..."} disabled className="font-mono bg-muted cursor-not-allowed" />
              </div>
              <div>
                <Label>Libellé *</Label>
                <Input value={ecritureForm.libelle} onChange={(e) => setEcritureForm({ ...ecritureForm, libelle: e.target.value })} placeholder="Description de l'écriture" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Lignes d'écriture</Label>
                <Button size="sm" variant="outline" onClick={addLigne}><Plus className="h-3 w-3 mr-1" />Ajouter ligne</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Compte</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Débit (FCFA)</TableHead>
                      <TableHead>Crédit (FCFA)</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lignes.map((ligne, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input value={ligne.compte_numero} onChange={(e) => { const nl = [...lignes]; nl[i].compte_numero = e.target.value; setLignes(nl); }} placeholder="411000" className="font-mono" />
                        </TableCell>
                        <TableCell>
                          <Input value={ligne.libelle} onChange={(e) => { const nl = [...lignes]; nl[i].libelle = e.target.value; setLignes(nl); }} placeholder="Libellé" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={ligne.debit || ""} onChange={(e) => { const nl = [...lignes]; nl[i].debit = Number(e.target.value) || 0; setLignes(nl); }} placeholder="0" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={ligne.credit || ""} onChange={(e) => { const nl = [...lignes]; nl[i].credit = Number(e.target.value) || 0; setLignes(nl); }} placeholder="0" />
                        </TableCell>
                        <TableCell>
                          {lignes.length > 2 && (
                            <Button size="sm" variant="ghost" onClick={() => removeLigne(i)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className={`flex justify-end gap-6 text-sm font-mono p-2 rounded ${isEquilibre ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                <span>Total Débit: {formatMontant(totalDebit)} FCFA</span>
                <span>Total Crédit: {formatMontant(totalCredit)} FCFA</span>
                {!isEquilibre && <span>Écart: {formatMontant(Math.abs(totalDebit - totalCredit))} FCFA</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEcriture(false)}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleSubmitEcriture} disabled={createEcriture.isPending}>
              {createEcriture.isPending ? "Enregistrement..." : "Enregistrer l'écriture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Nouveau compte */}
      <Dialog open={showNewCompte} onOpenChange={setShowNewCompte}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau compte comptable</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>N° Compte *</Label>
              <Input value={compteForm.numero_compte} onChange={(e) => setCompteForm({ ...compteForm, numero_compte: e.target.value })} placeholder="Ex: 411100" className="font-mono" />
            </div>
            <div>
              <Label>Libellé *</Label>
              <Input value={compteForm.libelle} onChange={(e) => setCompteForm({ ...compteForm, libelle: e.target.value })} placeholder="Nom du compte" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Classe</Label>
                <Select value={compteForm.classe.toString()} onValueChange={(v) => setCompteForm({ ...compteForm, classe: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(c => <SelectItem key={c} value={c.toString()}>Classe {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nature</Label>
                <Select value={compteForm.nature} onValueChange={(v) => setCompteForm({ ...compteForm, nature: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="passif">Passif</SelectItem>
                    <SelectItem value="charge">Charge</SelectItem>
                    <SelectItem value="produit">Produit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCompte(false)}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleSubmitCompte} disabled={createCompte.isPending}>
              {createCompte.isPending ? "Création..." : "Créer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
