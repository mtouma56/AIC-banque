import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, Calculator, Bell, Shield, Save, Plus, Landmark, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

function CompteBancaireTab() {
  const utils = trpc.useUtils();
  const { data: comptes = [], isLoading, error } = trpc.comptesBancaires.getAll.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    code_compte: "",
    libelle: "",
    banque: "",
    numero_compte: "",
    iban: "",
    swift_bic: "",
    agence: "",
    solde_initial: 0,
    devise: "XOF",
  });

  const createCompte = trpc.comptesBancaires.create.useMutation({
    onSuccess: () => { toast.success("Compte bancaire ajouté"); resetForm(); utils.comptesBancaires.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateCompte = trpc.comptesBancaires.update.useMutation({
    onSuccess: () => { toast.success("Compte bancaire mis à jour"); resetForm(); utils.comptesBancaires.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCompte = trpc.comptesBancaires.delete.useMutation({
    onSuccess: () => { toast.success("Compte supprimé"); utils.comptesBancaires.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ code_compte: "", libelle: "", banque: "", numero_compte: "", iban: "", swift_bic: "", agence: "", solde_initial: 0, devise: "XOF" });
  };

  const handleEdit = (c: any) => {
    setEditId(c.id);
    setForm({ code_compte: c.code_compte, libelle: c.libelle, banque: c.banque, numero_compte: c.numero_compte || "", iban: c.iban || "", swift_bic: c.swift_bic || "", agence: c.agence || "", solde_initial: Number(c.solde_initial) || 0, devise: c.devise || "XOF" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.code_compte || !form.libelle || !form.banque) {
      toast.error("Code, libellé et banque sont obligatoires");
      return;
    }
    if (editId) {
      updateCompte.mutate({ id: editId, ...form });
    } else {
      createCompte.mutate(form);
    }
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Chargement des comptes bancaires...</div>;
  if (error) return <div className="py-8 text-center text-destructive">Erreur : {error.message}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Comptes bancaires</h2>
        <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />Nouveau compte
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#daa520]/30">
          <CardHeader>
            <CardTitle className="text-base">{editId ? "Modifier le compte" : "Nouveau compte bancaire"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Code comptable *</Label>
                <Input value={form.code_compte} onChange={(e) => setForm({ ...form, code_compte: e.target.value })} placeholder="521100" className="font-mono" />
              </div>
              <div>
                <Label>Libellé *</Label>
                <Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Compte courant SGBCI" />
              </div>
              <div>
                <Label>Banque *</Label>
                <Input value={form.banque} onChange={(e) => setForm({ ...form, banque: e.target.value })} placeholder="SGBCI" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>N° de compte</Label>
                <Input value={form.numero_compte} onChange={(e) => setForm({ ...form, numero_compte: e.target.value })} placeholder="CI XXX XXXX XXXX" className="font-mono" />
              </div>
              <div>
                <Label>IBAN</Label>
                <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="CI93 XXXX XXXX XXXX" className="font-mono" />
              </div>
              <div>
                <Label>SWIFT/BIC</Label>
                <Input value={form.swift_bic} onChange={(e) => setForm({ ...form, swift_bic: e.target.value })} placeholder="SGBCCIAB" className="font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Agence</Label>
                <Input value={form.agence} onChange={(e) => setForm({ ...form, agence: e.target.value })} placeholder="Plateau - Abidjan" />
              </div>
              <div>
                <Label>Solde initial (FCFA)</Label>
                <Input type="number" value={form.solde_initial || ""} onChange={(e) => setForm({ ...form, solde_initial: Number(e.target.value) })} placeholder="0" />
              </div>
              <div>
                <Label>Devise</Label>
                <Select value={form.devise} onValueChange={(v) => setForm({ ...form, devise: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XOF">XOF (FCFA)</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Annuler</Button>
              <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleSubmit} disabled={createCompte.isPending || updateCompte.isPending}>
                <Save className="h-4 w-4 mr-1" />{editId ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(comptes as any[]).length === 0 && !showForm ? (
        <Card className="border-border/50">
          <CardContent className="py-8 text-center">
            <Landmark className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucun compte bancaire configuré</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Ajoutez vos comptes pour le rapprochement bancaire</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(comptes as any[]).map((c: any) => (
            <Card key={c.id} className="border-border/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#daa520]/10 flex items-center justify-center">
                      <Landmark className="h-5 w-5 text-[#daa520]" />
                    </div>
                    <div>
                      <p className="font-medium">{c.libelle}</p>
                      <p className="text-xs text-muted-foreground">{c.banque} {c.agence ? `- ${c.agence}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium">{c.code_compte}</p>
                      <p className="text-xs text-muted-foreground">{c.numero_compte || "N° non renseigné"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium">{Number(c.solde_initial).toLocaleString("fr-FR")} {c.devise}</p>
                      <p className="text-xs text-muted-foreground">Solde initial</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Supprimer ce compte ?")) deleteCompte.mutate({ id: c.id }); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Parametres() {
  const [showNewTiers, setShowNewTiers] = useState(false);
  const [tiersType, setTiersType] = useState<"client" | "fournisseur">("client");
  const [tiersForm, setTiersForm] = useState({
    raison_sociale: "",
    numero_compte: "",
    adresse: "",
    telephone: "",
    email: "",
    rccm: "",
  });

  // Paramètres entreprise (depuis Supabase)
  const { data: parametresDB = [] } = trpc.parametres.getAll.useQuery();
  const updateParams = trpc.parametres.updateBatch.useMutation({
    onSuccess: () => { toast.success("Paramètres entreprise sauvegardés"); utils.parametres.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const getParam = (cle: string, defaut: string = "") => {
    const p = (parametresDB as any[]).find((p: any) => p.cle === cle);
    return p?.valeur || defaut;
  };

  const [entreprise, setEntreprise] = useState({
    raison_sociale: "AIC - Africa Invest Capital",
    forme_juridique: "SARL",
    rccm: "",
    numero_contribuable: "",
    regime_fiscal: "Réel Normal",
    adresse: "Abidjan, Côte d'Ivoire",
    telephone: "",
    email: "",
    exercice_debut: "2026-01-01",
    exercice_fin: "2026-12-31",
  });

  // Charger les paramètres depuis Supabase quand ils arrivent
  React.useEffect(() => {
    if ((parametresDB as any[]).length > 0) {
      setEntreprise({
        raison_sociale: getParam("raison_sociale", "AIC - Africa Invest Capital"),
        forme_juridique: getParam("forme_juridique", "SARL"),
        rccm: getParam("rccm", ""),
        numero_contribuable: getParam("ncc", ""),
        regime_fiscal: getParam("regime_fiscal", "Reel normal"),
        adresse: getParam("adresse", "Abidjan, Cote d Ivoire"),
        telephone: getParam("telephone", ""),
        email: getParam("email", ""),
        exercice_debut: getParam("debut_exercice", "2026-01-01"),
        exercice_fin: getParam("fin_exercice", "2026-12-31"),
      });
    }
  }, [parametresDB]);

  // Paramètres paie
  const [paramPaie, setParamPaie] = useState({
    taux_cnps_salarie: 6.3,
    taux_cnps_patron_retraite: 7.7,
    taux_cnps_pf: 5.75,
    taux_at: 2.0,
    plafond_cnps: 2700000,
    taux_igr: 1.5,
    taux_cn: 1.5,
    abattement_frais_pro: 15,
    taux_contrib_local: 2.8,
    taux_contrib_expatrie: 12,
  });

  const utils = trpc.useUtils();
  const { data: clients = [] } = trpc.tiers.getAll.useQuery({ type: "client" });
  const { data: fournisseurs = [] } = trpc.tiers.getAll.useQuery({ type: "fournisseur" });

  const createTiers = trpc.tiers.create.useMutation({
    onSuccess: () => {
      toast.success(`${tiersType === "client" ? "Client" : "Fournisseur"} créé avec succès`);
      setShowNewTiers(false);
      setTiersForm({ raison_sociale: "", numero_compte: "", adresse: "", telephone: "", email: "", rccm: "" });
      utils.tiers.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveEntreprise = () => {
    updateParams.mutate([
      { cle: "raison_sociale", valeur: entreprise.raison_sociale },
      { cle: "forme_juridique", valeur: entreprise.forme_juridique },
      { cle: "rccm", valeur: entreprise.rccm },
      { cle: "ncc", valeur: entreprise.numero_contribuable },
      { cle: "regime_fiscal", valeur: entreprise.regime_fiscal },
      { cle: "adresse", valeur: entreprise.adresse },
      { cle: "telephone", valeur: entreprise.telephone },
      { cle: "email", valeur: entreprise.email },
      { cle: "debut_exercice", valeur: entreprise.exercice_debut },
      { cle: "fin_exercice", valeur: entreprise.exercice_fin },
    ]);
  };

  const handleSaveParamPaie = () => {
    updateParams.mutate([
      { cle: "taux_cnps_salarie", valeur: String(paramPaie.taux_cnps_salarie) },
      { cle: "taux_cnps_patron_retraite", valeur: String(paramPaie.taux_cnps_patron_retraite) },
      { cle: "taux_cnps_pf", valeur: String(paramPaie.taux_cnps_pf) },
      { cle: "taux_at", valeur: String(paramPaie.taux_at) },
      { cle: "plafond_cnps", valeur: String(paramPaie.plafond_cnps) },
      { cle: "taux_igr", valeur: String(paramPaie.taux_igr) },
      { cle: "taux_cn", valeur: String(paramPaie.taux_cn) },
      { cle: "abattement_frais_pro", valeur: String(paramPaie.abattement_frais_pro) },
      { cle: "taux_contrib_local", valeur: String(paramPaie.taux_contrib_local) },
      { cle: "taux_contrib_expatrie", valeur: String(paramPaie.taux_contrib_expatrie) },
    ]);
  };

  const handleCreateTiers = () => {
    if (!tiersForm.raison_sociale) {
      toast.error("La raison sociale est obligatoire");
      return;
    }
    createTiers.mutate({
      type_tiers: tiersType,
      code_tiers: tiersForm.numero_compte || (tiersType === "client" ? "CLI" : "FRS") + Date.now().toString().slice(-4),
      raison_sociale: tiersForm.raison_sociale,
      adresse: tiersForm.adresse || undefined,
      telephone: tiersForm.telephone || undefined,
      email: tiersForm.email || undefined,
      numero_compte: tiersForm.numero_compte || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres & Réglages</h1>
        <p className="text-muted-foreground">Configuration de l'entreprise, fiscalité et gestion des tiers</p>
      </div>

      <Tabs defaultValue="entreprise" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="entreprise"><Building2 className="h-4 w-4 mr-1" />Entreprise</TabsTrigger>
          <TabsTrigger value="fiscalite"><Calculator className="h-4 w-4 mr-1" />Fiscalité & Paie</TabsTrigger>
          <TabsTrigger value="tiers"><Users className="h-4 w-4 mr-1" />Clients & Fournisseurs</TabsTrigger>
          <TabsTrigger value="banques"><Landmark className="h-4 w-4 mr-1" />Comptes bancaires</TabsTrigger>
          <TabsTrigger value="securite"><Shield className="h-4 w-4 mr-1" />Sécurité</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" />Notifications</TabsTrigger>
        </TabsList>

        {/* ENTREPRISE */}
        <TabsContent value="entreprise" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Informations de l'entreprise</CardTitle>
              <CardDescription>Données légales et administratives de AIC</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Raison sociale</Label>
                  <Input value={entreprise.raison_sociale} onChange={(e) => setEntreprise({ ...entreprise, raison_sociale: e.target.value })} />
                </div>
                <div>
                  <Label>Forme juridique</Label>
                  <Select value={entreprise.forme_juridique} onValueChange={(v) => setEntreprise({ ...entreprise, forme_juridique: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SARL">SARL</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="SAS">SAS</SelectItem>
                      <SelectItem value="EI">Entreprise Individuelle</SelectItem>
                      <SelectItem value="GIE">GIE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>N° RCCM</Label>
                  <Input value={entreprise.rccm} onChange={(e) => setEntreprise({ ...entreprise, rccm: e.target.value })} placeholder="CI-ABJ-XXXX-B-XXXXX" />
                </div>
                <div>
                  <Label>N° Contribuable (NCC)</Label>
                  <Input value={entreprise.numero_contribuable} onChange={(e) => setEntreprise({ ...entreprise, numero_contribuable: e.target.value })} placeholder="CI-XXXXXXXXX" />
                </div>
                <div>
                  <Label>Régime fiscal</Label>
                  <Select value={entreprise.regime_fiscal} onValueChange={(v) => setEntreprise({ ...entreprise, regime_fiscal: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Réel Normal">Réel Normal</SelectItem>
                      <SelectItem value="Réel Simplifié">Réel Simplifié</SelectItem>
                      <SelectItem value="Impôt Synthétique">Impôt Synthétique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input value={entreprise.adresse} onChange={(e) => setEntreprise({ ...entreprise, adresse: e.target.value })} />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={entreprise.telephone} onChange={(e) => setEntreprise({ ...entreprise, telephone: e.target.value })} placeholder="+225 XX XX XX XX XX" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={entreprise.email} onChange={(e) => setEntreprise({ ...entreprise, email: e.target.value })} placeholder="contact@aic-ci.com" />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Début exercice fiscal</Label>
                  <Input type="date" value={entreprise.exercice_debut} onChange={(e) => setEntreprise({ ...entreprise, exercice_debut: e.target.value })} />
                </div>
                <div>
                  <Label>Fin exercice fiscal</Label>
                  <Input type="date" value={entreprise.exercice_fin} onChange={(e) => setEntreprise({ ...entreprise, exercice_fin: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleSaveEntreprise}>
                  <Save className="h-4 w-4 mr-2" />Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FISCALITÉ & PAIE */}
        <TabsContent value="fiscalite" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Paramètres fiscaux (CGI 2025)</CardTitle>
              <CardDescription>Taux en vigueur selon le Code Général des Impôts de Côte d'Ivoire</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>CNPS Salarié (retraite) %</Label>
                  <Input type="number" step="0.1" value={paramPaie.taux_cnps_salarie} onChange={(e) => setParamPaie({ ...paramPaie, taux_cnps_salarie: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>CNPS Patron (retraite) %</Label>
                  <Input type="number" step="0.1" value={paramPaie.taux_cnps_patron_retraite} onChange={(e) => setParamPaie({ ...paramPaie, taux_cnps_patron_retraite: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>CNPS Prestations familiales %</Label>
                  <Input type="number" step="0.01" value={paramPaie.taux_cnps_pf} onChange={(e) => setParamPaie({ ...paramPaie, taux_cnps_pf: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Taux AT (Accident travail) %</Label>
                  <Input type="number" step="0.1" value={paramPaie.taux_at} onChange={(e) => setParamPaie({ ...paramPaie, taux_at: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Plafond CNPS (FCFA/mois)</Label>
                  <Input type="number" value={paramPaie.plafond_cnps} onChange={(e) => setParamPaie({ ...paramPaie, plafond_cnps: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>IGR %</Label>
                  <Input type="number" step="0.1" value={paramPaie.taux_igr} onChange={(e) => setParamPaie({ ...paramPaie, taux_igr: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Contribution Nationale %</Label>
                  <Input type="number" step="0.1" value={paramPaie.taux_cn} onChange={(e) => setParamPaie({ ...paramPaie, taux_cn: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Abattement frais pro %</Label>
                  <Input type="number" step="1" value={paramPaie.abattement_frais_pro} onChange={(e) => setParamPaie({ ...paramPaie, abattement_frais_pro: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Contrib. employeur local %</Label>
                  <Input type="number" step="0.1" value={paramPaie.taux_contrib_local} onChange={(e) => setParamPaie({ ...paramPaie, taux_contrib_local: Number(e.target.value) })} />
                </div>
              </div>

              <Card className="bg-[#daa520]/5 border-[#daa520]/20">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">Barème ITS 2025 (Art. 119 bis CGI)</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tranche (FCFA)</TableHead>
                        <TableHead>Taux</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow><TableCell>0 - 75 000</TableCell><TableCell>0%</TableCell></TableRow>
                      <TableRow><TableCell>75 001 - 240 000</TableCell><TableCell>16%</TableCell></TableRow>
                      <TableRow><TableCell>240 001 - 800 000</TableCell><TableCell>21%</TableCell></TableRow>
                      <TableRow><TableCell>800 001 - 2 400 000</TableCell><TableCell>24%</TableCell></TableRow>
                      <TableRow><TableCell>2 400 001 - 8 000 000</TableCell><TableCell>28%</TableCell></TableRow>
                      <TableRow><TableCell>8 000 001 - 12 000 000</TableCell><TableCell>32%</TableCell></TableRow>
                      <TableRow><TableCell>Au-delà de 12 000 000</TableCell><TableCell>36%</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleSaveParamPaie}>
                  <Save className="h-4 w-4 mr-2" />Sauvegarder les paramètres
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIERS */}
        <TabsContent value="tiers" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Gestion des tiers</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setTiersType("client"); setShowNewTiers(true); }}>
                <Plus className="h-4 w-4 mr-1" />Nouveau client
              </Button>
              <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => { setTiersType("fournisseur"); setShowNewTiers(true); }}>
                <Plus className="h-4 w-4 mr-1" />Nouveau fournisseur
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Clients ({(clients as any[]).length})</CardTitle></CardHeader>
              <CardContent>
                {(clients as any[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun client enregistré</p>
                ) : (
                  <div className="space-y-2">
                    {(clients as any[]).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{c.raison_sociale}</p>
                          <p className="text-xs text-muted-foreground">{c.numero_compte || "—"}</p>
                        </div>
                        <span className="text-xs text-green-500">Actif</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Fournisseurs ({(fournisseurs as any[]).length})</CardTitle></CardHeader>
              <CardContent>
                {(fournisseurs as any[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun fournisseur enregistré</p>
                ) : (
                  <div className="space-y-2">
                    {(fournisseurs as any[]).map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{f.raison_sociale}</p>
                          <p className="text-xs text-muted-foreground">{f.numero_compte || "—"}</p>
                        </div>
                        <span className="text-xs text-blue-500">Actif</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* COMPTES BANCAIRES */}
        <TabsContent value="banques" className="space-y-4">
          <CompteBancaireTab />
        </TabsContent>

        {/* SÉCURITÉ */}
        <TabsContent value="securite" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Rôles et permissions</CardTitle>
              <CardDescription>Configuration des accès utilisateurs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-[#daa520]">EXP001</TableCell>
                    <TableCell>Exploitant</TableCell>
                    <TableCell className="text-xs">Saisie, correction des écritures</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Actif</span></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-[#daa520]">EXP002</TableCell>
                    <TableCell>Exploitant</TableCell>
                    <TableCell className="text-xs">Saisie, correction des écritures</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Actif</span></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-[#daa520]">ADM001</TableCell>
                    <TableCell>Administrateur</TableCell>
                    <TableCell className="text-xs">Validation, supervision, paramétrage</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Actif</span></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-[#daa520]">ADM002</TableCell>
                    <TableCell>Administrateur</TableCell>
                    <TableCell className="text-xs">Validation, supervision, paramétrage</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Actif</span></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Piste d'audit</CardTitle>
              <CardDescription>Traçabilité des actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enregistrement automatique</p>
                  <p className="text-xs text-muted-foreground">Chaque action est tracée (utilisateur, date, heure)</p>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Adresse IP</p>
                  <p className="text-xs text-muted-foreground">Enregistrer l'IP de connexion</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Alertes automatiques</CardTitle>
              <CardDescription>Notifications envoyées aux administrateurs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Bon à payer</p>
                  <p className="text-xs text-muted-foreground">Notification quand un BC atteint l'étape d'autorisation de paiement</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Validation hiérarchique</p>
                  <p className="text-xs text-muted-foreground">Alerte quand une validation est en attente</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Échéances fournisseurs</p>
                  <p className="text-xs text-muted-foreground">Rappel 7 jours avant l'échéance</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Alertes trésorerie</p>
                  <p className="text-xs text-muted-foreground">Notification si le solde passe sous un seuil</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div>
                <Label>Seuil d'alerte trésorerie (FCFA)</Label>
                <Input type="number" defaultValue={5000000} className="mt-1 max-w-xs" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Nouveau tiers */}
      <Dialog open={showNewTiers} onOpenChange={setShowNewTiers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau {tiersType === "client" ? "client" : "fournisseur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Raison sociale *</Label>
              <Input value={tiersForm.raison_sociale} onChange={(e) => setTiersForm({ ...tiersForm, raison_sociale: e.target.value })} placeholder="Nom de l'entreprise" />
            </div>
            <div>
              <Label>N° Compte comptable</Label>
              <Input value={tiersForm.numero_compte} onChange={(e) => setTiersForm({ ...tiersForm, numero_compte: e.target.value })} placeholder={tiersType === "client" ? "411XXX" : "401XXX"} className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Téléphone</Label>
                <Input value={tiersForm.telephone} onChange={(e) => setTiersForm({ ...tiersForm, telephone: e.target.value })} placeholder="+225 XX XX XX XX XX" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={tiersForm.email} onChange={(e) => setTiersForm({ ...tiersForm, email: e.target.value })} placeholder="contact@..." />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={tiersForm.adresse} onChange={(e) => setTiersForm({ ...tiersForm, adresse: e.target.value })} placeholder="Adresse complète" />
            </div>
            <div>
              <Label>N° RCCM</Label>
              <Input value={tiersForm.rccm} onChange={(e) => setTiersForm({ ...tiersForm, rccm: e.target.value })} placeholder="CI-ABJ-XXXX-B-XXXXX" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTiers(false)}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleCreateTiers} disabled={createTiers.isPending}>
              {createTiers.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
