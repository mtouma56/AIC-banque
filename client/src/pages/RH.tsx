import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, CreditCard, Calendar, Banknote, Calculator, FileText, Check, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function RH() {
  const { data: employesDB = [], isLoading } = trpc.rh.getEmployes.useQuery();
  const { data: bulletinsDB = [] } = trpc.rh.getBulletins.useQuery({});
  const { data: congesDB = [] } = trpc.conges.getAll.useQuery();
  const { data: pretsDB = [] } = trpc.prets.getAll.useQuery();

  // Ajout employé
  const [showEmployeForm, setShowEmployeForm] = useState(false);
  const [employeForm, setEmployeForm] = useState({
    matricule: "",
    nom: "",
    prenom: "",
    poste: "",
    departement: "",
    date_embauche: "",
    salaire_base: 0,
    situation_familiale: "celibataire" as "celibataire" | "marie" | "veuf" | "divorce",
    enfants_a_charge: 0,
    telephone: "",
    email: "",
  });

  const createEmploye = trpc.rh.createEmploye.useMutation({
    onSuccess: () => {
      toast.success("Employé ajouté avec succès");
      setShowEmployeForm(false);
      setEmployeForm({ matricule: "", nom: "", prenom: "", poste: "", departement: "", date_embauche: "", salaire_base: 0, situation_familiale: "celibataire", enfants_a_charge: 0, telephone: "", email: "" });
      utils.rh.getEmployes.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreateEmploye = () => {
    if (!employeForm.matricule || !employeForm.nom || !employeForm.prenom || !employeForm.poste || !employeForm.date_embauche || !employeForm.salaire_base) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    createEmploye.mutate(employeForm);
  };

  // Congés
  const [showCongeForm, setShowCongeForm] = useState(false);
  const [congeEmployeId, setCongeEmployeId] = useState("");
  const [congeType, setCongeType] = useState<"annuel" | "maladie" | "maternite" | "special" | "sans_solde">("annuel");
  const [congeDateDebut, setCongeDateDebut] = useState("");
  const [congeDateFin, setCongeDateFin] = useState("");
  const [congeMotif, setCongeMotif] = useState("");
  const [congeJours, setCongeJours] = useState(0);

  // Prêts
  const [showPretForm, setShowPretForm] = useState(false);
  const [pretEmployeId, setPretEmployeId] = useState("");
  const [pretMontant, setPretMontant] = useState(0);
  const [pretMensualite, setPretMensualite] = useState(0);
  const [pretNbMensualites, setPretNbMensualites] = useState(12);
  const [pretMotif, setPretMotif] = useState("");
  const [pretDateDebut, setPretDateDebut] = useState("");

  const utils = trpc.useUtils();

  const createConge = trpc.conges.create.useMutation({
    onSuccess: () => { toast.success("Demande de congé enregistrée"); setShowCongeForm(false); utils.conges.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const validerConge = trpc.conges.valider.useMutation({
    onSuccess: () => { toast.success("Congé mis à jour"); utils.conges.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createPret = trpc.prets.create.useMutation({
    onSuccess: () => { toast.success("Prêt enregistré"); setShowPretForm(false); utils.prets.getAll.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Simulateur de paie
  const [simSalaire, setSimSalaire] = useState(500000);
  const [simStatut, setSimStatut] = useState<"celibataire" | "marie" | "veuf" | "divorce">("celibataire");
  const [simEnfants, setSimEnfants] = useState(0);
  const [simPrimes, setSimPrimes] = useState(0);
  const [simExpatrie, setSimExpatrie] = useState(false);

  const { data: simulationPaie } = trpc.fiscalite.simulerPaie.useQuery({
    salaire_brut: simSalaire,
    statut: simStatut,
    enfants: simEnfants,
    primes: simPrimes,
    est_expatrie: simExpatrie,
  });

  // Génération bulletin
  const genererBulletin = trpc.rh.genererBulletinPaie.useMutation({
    onSuccess: (data) => {
      toast.success(`Bulletin généré : Net à payer ${data.detail.salaire_net.toLocaleString("fr-FR")} FCFA`);
    },
    onError: (err) => toast.error(err.message),
  });

  const employes = employesDB.length > 0 ? employesDB.map((e: any) => ({
    id: e.id,
    matricule: e.matricule,
    nom: `${e.nom} ${e.prenoms || e.prenom || ""}`.trim(),
    poste: e.poste,
    salaire_base: Number(e.salaire_base) || 0,
    situation_familiale: e.situation_familiale || "celibataire",
    enfants_a_charge: e.enfants_a_charge || 0,
    statut: e.is_active !== false ? "actif" : "inactif",
  })) : [];

  const formatMontant = (n: number) => Math.round(n).toLocaleString("fr-FR");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paie & Ressources Humaines</h1>
          <p className="text-muted-foreground">Gestion des employés, paie CNPS/ITS conforme CGI 2025</p>
        </div>
        <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowEmployeForm(true)}>
          <UserPlus className="h-4 w-4 mr-2" />Nouvel employé
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Effectif</CardTitle>
            <Users className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{employes.length || 7}</div>
            <p className="text-xs text-muted-foreground">salariés actifs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Masse salariale brute</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatMontant(employes.reduce((s, e) => s + e.salaire_base, 0))} FCFA</div>
            <p className="text-xs text-muted-foreground">mensuelle</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bulletins générés</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{(bulletinsDB as any[]).length}</div>
            <p className="text-xs text-muted-foreground">ce mois</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prêts actifs</CardTitle>
            <Banknote className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{(pretsDB as any[]).filter((p: any) => p.statut === "en_cours").length}</div>
            <p className="text-xs text-muted-foreground">{formatMontant((pretsDB as any[]).filter((p: any) => p.statut === "en_cours").reduce((s: number, p: any) => s + (p.mensualites_restantes || 0) * Number(p.montant_mensualite || 0), 0))} FCFA restant</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
          <TabsTrigger value="employes">Employés</TabsTrigger>
          <TabsTrigger value="simulateur">Simulateur de paie</TabsTrigger>
          <TabsTrigger value="bulletins">Bulletins de paie</TabsTrigger>
          <TabsTrigger value="conges">Congés</TabsTrigger>
          <TabsTrigger value="prets">Prêts</TabsTrigger>
        </TabsList>

        {/* ONGLET TABLEAU DE BORD RH */}
        <TabsContent value="dashboard">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Masse salariale */}
            <Card className="border-border/50 col-span-full">
              <CardHeader><CardTitle className="text-base">Résumé Masse Salariale</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Brut total mensuel</p>
                    <p className="text-lg font-bold text-[#daa520]">{formatMontant(employes.reduce((s, e) => s + e.salaire_base, 0))} FCFA</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Brut annuel estimé</p>
                    <p className="text-lg font-bold">{formatMontant(employes.reduce((s, e) => s + e.salaire_base, 0) * 12)} FCFA</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Coût employeur réel (charges patronales)</p>
                    <p className="text-lg font-bold text-red-400">{formatMontant(
                      (bulletinsDB as any[]).length > 0
                        ? (bulletinsDB as any[]).reduce((s: number, b: any) => s + Number(b.cnps_patron || 0) + Number(b.brut_total || 0), 0) / Math.max(1, new Set((bulletinsDB as any[]).map((b: any) => `${b.mois}-${b.annee}`)).size)
                        : employes.reduce((s, e) => s + e.salaire_base, 0) * 1.25
                    )} FCFA/mois</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Salaire moyen</p>
                    <p className="text-lg font-bold">{employes.length > 0 ? formatMontant(employes.reduce((s, e) => s + e.salaire_base, 0) / employes.length) : "0"} FCFA</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Congés en cours */}
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Congés</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">En attente</span>
                  <span className="text-lg font-bold text-yellow-500">{(congesDB as any[]).filter((c: any) => c.statut === "en_attente").length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Approuvés (en cours)</span>
                  <span className="text-lg font-bold text-green-500">{(congesDB as any[]).filter((c: any) => c.statut === "approuve").length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Refusés</span>
                  <span className="text-lg font-bold text-red-500">{(congesDB as any[]).filter((c: any) => c.statut === "refuse").length}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-medium">Total jours pris</span>
                  <span className="text-lg font-bold">{(congesDB as any[]).filter((c: any) => c.statut === "approuve").reduce((s: number, c: any) => s + (c.nombre_jours || 0), 0)} jours</span>
                </div>
              </CardContent>
            </Card>

            {/* Prêts en cours */}
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Prêts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Prêts actifs</span>
                  <span className="text-lg font-bold text-orange-500">{(pretsDB as any[]).filter((p: any) => p.statut === "en_cours").length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Montant total prêté</span>
                  <span className="text-lg font-bold">{formatMontant((pretsDB as any[]).reduce((s: number, p: any) => s + Number(p.montant || 0), 0))} FCFA</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mensualités restantes</span>
                  <span className="text-lg font-bold">{(pretsDB as any[]).filter((p: any) => p.statut === "en_cours").reduce((s: number, p: any) => s + (p.mensualites_restantes || 0), 0)}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-medium">Capital restant dû</span>
                  <span className="text-lg font-bold text-red-400">{formatMontant((pretsDB as any[]).filter((p: any) => p.statut === "en_cours").reduce((s: number, p: any) => s + (p.mensualites_restantes || 0) * Number(p.montant_mensualite || 0), 0))} FCFA</span>
                </div>
              </CardContent>
            </Card>

            {/* Répartition par département */}
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Répartition par département</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const depts: Record<string, number> = {};
                  employes.forEach(e => {
                    const dept = (e as any).departement || "Non assigné";
                    depts[dept] = (depts[dept] || 0) + 1;
                  });
                  return Object.entries(depts).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(depts).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                        <div key={dept} className="flex items-center justify-between">
                          <span className="text-sm">{dept}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-[#daa520] rounded-full" style={{ width: `${(count / employes.length) * 100}%` }} />
                            </div>
                            <span className="text-sm font-medium w-6 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground text-center">Aucun employé</p>;
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ONGLET EMPLOYÉS */}
        <TabsContent value="employes">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Liste des employés</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowEmployeForm(true)}>
                <Plus className="h-4 w-4 mr-1" />Ajouter
              </Button>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead className="text-right">Salaire base</TableHead>
                  <TableHead>Situation</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employes.map((emp) => (
                  <TableRow key={emp.matricule}>
                    <TableCell className="font-mono text-[#daa520]">{emp.matricule}</TableCell>
                    <TableCell className="font-medium">{emp.nom}</TableCell>
                    <TableCell>{emp.poste}</TableCell>
                    <TableCell className="text-right font-mono">{formatMontant(emp.salaire_base)} FCFA</TableCell>
                    <TableCell className="capitalize">{emp.situation_familiale} ({emp.enfants_a_charge} enf.)</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                        {emp.statut}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {employes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucun employé enregistré. Ajoutez vos 7 salariés.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ONGLET SIMULATEUR DE PAIE */}
        <TabsContent value="simulateur">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-[#daa520]" />
                  Simulateur de paie (CGI 2025)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Salaire brut mensuel (FCFA)</Label>
                  <Input
                    type="number"
                    value={simSalaire}
                    onChange={(e) => setSimSalaire(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Situation familiale</Label>
                  <Select value={simStatut} onValueChange={(v: any) => setSimStatut(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="celibataire">Célibataire</SelectItem>
                      <SelectItem value="marie">Marié(e)</SelectItem>
                      <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                      <SelectItem value="divorce">Divorcé(e)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Enfants à charge</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={simEnfants}
                    onChange={(e) => setSimEnfants(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primes (FCFA)</Label>
                  <Input
                    type="number"
                    value={simPrimes}
                    onChange={(e) => setSimPrimes(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={simExpatrie}
                    onChange={(e) => setSimExpatrie(e.target.checked)}
                    className="rounded"
                  />
                  <Label>Expatrié (contribution employeur 12%)</Label>
                </div>
              </CardContent>
            </Card>

            {simulationPaie && (
              <Card className="border-[#daa520]/30">
                <CardHeader>
                  <CardTitle className="text-[#daa520]">Résultat de la simulation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="border-b border-border/50 pb-3">
                    <h4 className="font-semibold mb-2">Rémunération</h4>
                    <div className="flex justify-between"><span>Salaire brut</span><span className="font-mono">{formatMontant(simulationPaie.salaire_brut)} FCFA</span></div>
                    <div className="flex justify-between"><span>Primes</span><span className="font-mono">{formatMontant(simulationPaie.primes)} FCFA</span></div>
                    <div className="flex justify-between font-semibold"><span>Brut total</span><span className="font-mono">{formatMontant(simulationPaie.brut_total)} FCFA</span></div>
                  </div>

                  <div className="border-b border-border/50 pb-3">
                    <h4 className="font-semibold mb-2">Cotisations salariales</h4>
                    <div className="flex justify-between"><span>CNPS Retraite (6,3%)</span><span className="font-mono text-red-400">-{formatMontant(simulationPaie.cnps_retraite_salarie)} FCFA</span></div>
                  </div>

                  <div className="border-b border-border/50 pb-3">
                    <h4 className="font-semibold mb-2">Impôts (barème ITS 7 tranches)</h4>
                    <div className="flex justify-between"><span>ITS brut</span><span className="font-mono">{formatMontant(simulationPaie.its_brut)} FCFA</span></div>
                    <div className="flex justify-between text-green-400"><span>RICF ({simulationPaie.nombre_parts} parts)</span><span className="font-mono">-{formatMontant(simulationPaie.ricf)} FCFA</span></div>
                    <div className="flex justify-between"><span>ITS net</span><span className="font-mono text-red-400">-{formatMontant(simulationPaie.its_net)} FCFA</span></div>
                    <div className="flex justify-between"><span>IGR (1,5%)</span><span className="font-mono text-red-400">-{formatMontant(simulationPaie.igr)} FCFA</span></div>
                    <div className="flex justify-between"><span>CN (1,5%)</span><span className="font-mono text-red-400">-{formatMontant(simulationPaie.contribution_nationale)} FCFA</span></div>
                  </div>

                  <div className="border-b border-border/50 pb-3 pt-2">
                    <div className="flex justify-between text-lg font-bold text-[#daa520]">
                      <span>NET À PAYER</span>
                      <span className="font-mono">{formatMontant(simulationPaie.salaire_net)} FCFA</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="font-semibold mb-2">Charges patronales</h4>
                    <div className="flex justify-between"><span>CNPS Retraite patron (7,7%)</span><span className="font-mono">{formatMontant(simulationPaie.cnps_retraite_patron)} FCFA</span></div>
                    <div className="flex justify-between"><span>CNPS Prest. familiales (5,75%)</span><span className="font-mono">{formatMontant(simulationPaie.cnps_prestations_familiales)} FCFA</span></div>
                    <div className="flex justify-between"><span>CNPS Accident travail</span><span className="font-mono">{formatMontant(simulationPaie.cnps_accident_travail)} FCFA</span></div>
                    <div className="flex justify-between"><span>Contributions employeur</span><span className="font-mono">{formatMontant(simulationPaie.contributions_employeur)} FCFA</span></div>
                    <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-border/50">
                      <span>Coût total employeur</span>
                      <span className="font-mono">{formatMontant(simulationPaie.cout_total_employeur)} FCFA</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border-[#daa520]/20 bg-[#daa520]/5 mt-4">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Références légales :</strong> Barème ITS 7 tranches (Loi de Finances 2025), CNPS plafond 2 700 000 FCFA/mois, IGR 1,5%, Contribution Nationale 1,5%, RICF selon nombre de parts. Contributions employeur : 2,8% (local) / 12% (expatrié).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET BULLETINS DE PAIE */}
        <TabsContent value="bulletins">
          <Card className="border-border/50">
            {(bulletinsDB as any[]).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Brut</TableHead>
                    <TableHead className="text-right">Retenues</TableHead>
                    <TableHead className="text-right">Net à payer</TableHead>
                    <TableHead className="text-right">Coût employeur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bulletinsDB as any[]).map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        {b.employe?.nom} {b.employe?.prenom}
                      </TableCell>
                      <TableCell>{b.mois}/{b.annee}</TableCell>
                      <TableCell className="text-right font-mono">{formatMontant(Number(b.brut_total))} FCFA</TableCell>
                      <TableCell className="text-right font-mono text-red-400">{formatMontant(Number(b.total_retenues))} FCFA</TableCell>
                      <TableCell className="text-right font-mono font-bold text-[#daa520]">{formatMontant(Number(b.net_a_payer))} FCFA</TableCell>
                      <TableCell className="text-right font-mono">{formatMontant(Number(b.cout_total))} FCFA</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Aucun bulletin de paie</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Utilisez le simulateur pour vérifier les calculs, puis générez les bulletins mensuels.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {employes.length > 0 && (
            <Card className="border-border/50 mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Générer les bulletins du mois</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {employes.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-2 rounded border border-border/50">
                      <span className="text-sm">{emp.nom} - {formatMontant(emp.salaire_base)} FCFA brut</span>
                      <Button
                        size="sm"
                        className="bg-[#daa520] hover:bg-[#c8a415] text-black"
                        onClick={() => {
                          const now = new Date();
                          genererBulletin.mutate({
                            employe_id: emp.id.toString(),
                            mois: now.getMonth() + 1,
                            annee: now.getFullYear(),
                          });
                        }}
                        disabled={genererBulletin.isPending}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Générer
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ONGLET CONGÉS */}
        <TabsContent value="conges">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Gestion des congés (2,2 jours/mois - Code du travail CI)</CardTitle>
              <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowCongeForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Demande de congé
              </Button>
            </CardHeader>
            <CardContent>
              {showCongeForm && (
                <div className="mb-6 p-4 border border-border/50 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Employé</Label>
                      <Select value={congeEmployeId} onValueChange={setCongeEmployeId}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {(employesDB as any[]).map((e: any) => (
                            <SelectItem key={e.id} value={String(e.id)}>{e.nom} {e.prenom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={congeType} onValueChange={(v: any) => setCongeType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annuel">Congé annuel</SelectItem>
                          <SelectItem value="maladie">Maladie</SelectItem>
                          <SelectItem value="maternite">Maternité</SelectItem>
                          <SelectItem value="special">Spécial</SelectItem>
                          <SelectItem value="sans_solde">Sans solde</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date début</Label>
                      <Input type="date" value={congeDateDebut} onChange={(e) => setCongeDateDebut(e.target.value)} />
                    </div>
                    <div>
                      <Label>Date fin</Label>
                      <Input type="date" value={congeDateFin} onChange={(e) => setCongeDateFin(e.target.value)} />
                    </div>
                    <div>
                      <Label>Nombre de jours</Label>
                      <Input type="number" value={congeJours} onChange={(e) => setCongeJours(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Motif</Label>
                      <Input value={congeMotif} onChange={(e) => setCongeMotif(e.target.value)} placeholder="Optionnel" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => createConge.mutate({ employe_id: Number(congeEmployeId), type_conge: congeType, date_debut: congeDateDebut, date_fin: congeDateFin, nombre_jours: congeJours, motif: congeMotif || undefined })} disabled={createConge.isPending}>
                      Enregistrer
                    </Button>
                    <Button variant="outline" onClick={() => setShowCongeForm(false)}>Annuler</Button>
                  </div>
                </div>
              )}
              {(congesDB as any[]).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune demande de congé enregistrée</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Du</TableHead>
                      <TableHead>Au</TableHead>
                      <TableHead>Jours</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(congesDB as any[]).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.employe?.nom} {c.employe?.prenom}</TableCell>
                        <TableCell className="capitalize">{c.type_conge}</TableCell>
                        <TableCell>{c.date_debut}</TableCell>
                        <TableCell>{c.date_fin}</TableCell>
                        <TableCell>{c.nombre_jours}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${c.statut === 'approuve' ? 'bg-green-500/20 text-green-400' : c.statut === 'refuse' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {c.statut === 'en_attente' ? 'En attente' : c.statut === 'approuve' ? 'Approuvé' : 'Refusé'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {c.statut === 'en_attente' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="text-green-400 h-7" onClick={() => validerConge.mutate({ id: c.id, statut: 'approuve' })}><Check className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="text-red-400 h-7" onClick={() => validerConge.mutate({ id: c.id, statut: 'refuse' })}><X className="h-3 w-3" /></Button>
                            </div>
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

        {/* ONGLET PRÊTS */}
        <TabsContent value="prets">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Prêts aux employés</CardTitle>
              <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowPretForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Nouveau prêt
              </Button>
            </CardHeader>
            <CardContent>
              {showPretForm && (
                <div className="mb-6 p-4 border border-border/50 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Employé</Label>
                      <Select value={pretEmployeId} onValueChange={setPretEmployeId}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {(employesDB as any[]).map((e: any) => (
                            <SelectItem key={e.id} value={String(e.id)}>{e.nom} {e.prenom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Montant total (FCFA)</Label>
                      <Input type="number" value={pretMontant} onChange={(e) => setPretMontant(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Mensualité (FCFA)</Label>
                      <Input type="number" value={pretMensualite} onChange={(e) => setPretMensualite(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Nombre de mensualités</Label>
                      <Input type="number" value={pretNbMensualites} onChange={(e) => setPretNbMensualites(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Date début</Label>
                      <Input type="date" value={pretDateDebut} onChange={(e) => setPretDateDebut(e.target.value)} />
                    </div>
                    <div>
                      <Label>Motif</Label>
                      <Input value={pretMotif} onChange={(e) => setPretMotif(e.target.value)} placeholder="Optionnel" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => createPret.mutate({ employe_id: Number(pretEmployeId), montant: pretMontant, montant_mensualite: pretMensualite, nombre_mensualites: pretNbMensualites, date_debut: pretDateDebut, motif: pretMotif || undefined })} disabled={createPret.isPending}>
                      Enregistrer
                    </Button>
                    <Button variant="outline" onClick={() => setShowPretForm(false)}>Annuler</Button>
                  </div>
                </div>
              )}
              {(pretsDB as any[]).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun prêt enregistré</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Mensualité</TableHead>
                      <TableHead>Restant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date début</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pretsDB as any[]).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.employe?.nom} {p.employe?.prenom}</TableCell>
                        <TableCell>{Number(p.montant).toLocaleString("fr-FR")} FCFA</TableCell>
                        <TableCell>{Number(p.montant_mensualite).toLocaleString("fr-FR")} FCFA</TableCell>
                        <TableCell>{p.mensualites_restantes}/{p.nombre_mensualites}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${p.statut === 'en_cours' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                            {p.statut === 'en_cours' ? 'En cours' : 'Soldé'}
                          </span>
                        </TableCell>
                        <TableCell>{p.date_debut}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Nouvel employé */}
      <Dialog open={showEmployeForm} onOpenChange={setShowEmployeForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvel employé</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Matricule *</Label>
                <Input value={employeForm.matricule} onChange={(e) => setEmployeForm({ ...employeForm, matricule: e.target.value })} placeholder="EMP001" className="font-mono" />
              </div>
              <div>
                <Label>Date d'embauche *</Label>
                <Input type="date" value={employeForm.date_embauche} onChange={(e) => setEmployeForm({ ...employeForm, date_embauche: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input value={employeForm.nom} onChange={(e) => setEmployeForm({ ...employeForm, nom: e.target.value })} placeholder="TOURE" />
              </div>
              <div>
                <Label>Prénom *</Label>
                <Input value={employeForm.prenom} onChange={(e) => setEmployeForm({ ...employeForm, prenom: e.target.value })} placeholder="Amadou" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Poste *</Label>
                <Input value={employeForm.poste} onChange={(e) => setEmployeForm({ ...employeForm, poste: e.target.value })} placeholder="Comptable" />
              </div>
              <div>
                <Label>Département</Label>
                <Input value={employeForm.departement} onChange={(e) => setEmployeForm({ ...employeForm, departement: e.target.value })} placeholder="Finance" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Salaire de base (FCFA) *</Label>
                <Input type="number" value={employeForm.salaire_base || ""} onChange={(e) => setEmployeForm({ ...employeForm, salaire_base: Number(e.target.value) })} placeholder="500000" />
              </div>
              <div>
                <Label>Situation familiale</Label>
                <Select value={employeForm.situation_familiale} onValueChange={(v: any) => setEmployeForm({ ...employeForm, situation_familiale: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="celibataire">Célibataire</SelectItem>
                    <SelectItem value="marie">Marié(e)</SelectItem>
                    <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                    <SelectItem value="divorce">Divorcé(e)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Enfants à charge</Label>
                <Input type="number" min={0} value={employeForm.enfants_a_charge} onChange={(e) => setEmployeForm({ ...employeForm, enfants_a_charge: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={employeForm.telephone} onChange={(e) => setEmployeForm({ ...employeForm, telephone: e.target.value })} placeholder="+225 XX XX XX XX XX" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={employeForm.email} onChange={(e) => setEmployeForm({ ...employeForm, email: e.target.value })} placeholder="nom@aic.ci" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmployeForm(false)}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleCreateEmploye} disabled={createEmploye.isPending}>
              {createEmploye.isPending ? "Création..." : "Créer l'employé"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
