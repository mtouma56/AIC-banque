import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, CreditCard, Calendar, Banknote, Calculator, FileText } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function RH() {
  const { data: employesDB = [], isLoading } = trpc.rh.getEmployes.useQuery();
  const { data: bulletinsDB = [] } = trpc.rh.getBulletins.useQuery({});

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paie & Ressources Humaines</h1>
          <p className="text-muted-foreground">Gestion des employés, paie CNPS/ITS conforme CGI 2025</p>
        </div>
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
            <div className="text-xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">0 FCFA restant</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employes">Employés</TabsTrigger>
          <TabsTrigger value="simulateur">Simulateur de paie</TabsTrigger>
          <TabsTrigger value="bulletins">Bulletins de paie</TabsTrigger>
          <TabsTrigger value="conges">Congés</TabsTrigger>
          <TabsTrigger value="prets">Prêts</TabsTrigger>
        </TabsList>

        {/* ONGLET EMPLOYÉS */}
        <TabsContent value="employes">
          <Card className="border-border/50">
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
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Gestion des congés</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Suivi des congés selon le code du travail ivoirien (2,2 jours/mois)
                </p>
                <Button
                  className="mt-4 bg-[#daa520] hover:bg-[#c8a415] text-black"
                  onClick={() => toast.info("Module Congés : sera disponible dans la prochaine mise à jour. Contactez l'administrateur.")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Demande de congé
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET PRÊTS */}
        <TabsContent value="prets">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Banknote className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Prêts aux employés</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Gestion des avances et prêts avec échéancier de remboursement
                </p>
                <Button
                  className="mt-4 bg-[#daa520] hover:bg-[#c8a415] text-black"
                  onClick={() => toast.info("Module Prêts : sera disponible dans la prochaine mise à jour. Contactez l'administrateur.")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau prêt
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
