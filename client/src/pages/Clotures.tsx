import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Lock, Calendar, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const MOIS_LABELS = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function Clotures() {
  const utils = trpc.useUtils();
  const { data: clotures = [], isLoading, error } = trpc.clotures.getAll.useQuery();

  const [showMensuelle, setShowMensuelle] = useState(false);
  const [showAnnuelle, setShowAnnuelle] = useState(false);
  const [selectedMois, setSelectedMois] = useState((new Date().getMonth() || 12).toString()); // mois précédent (1-based)
  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear().toString());
  const [selectedAnneeClot, setSelectedAnneeClot] = useState((new Date().getFullYear() - 1).toString());

  const clotureMensuelle = trpc.clotures.creerClotureMensuelle.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Clôture mensuelle ${MOIS_LABELS[data.mois]} ${data.annee} effectuée`);
      setShowMensuelle(false);
      utils.clotures.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const clotureAnnuelle = trpc.clotures.creerClotureAnnuelle.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Clôture annuelle ${data.annee} effectuée`);
      setShowAnnuelle(false);
      utils.clotures.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // KPIs
  const cloturesMensuelles = useMemo(() => (clotures as any[]).filter((c: any) => c.type_cloture === "mensuelle"), [clotures]);
  const cloturesAnnuelles = useMemo(() => (clotures as any[]).filter((c: any) => c.type_cloture === "annuelle"), [clotures]);
  const dernierResultat = useMemo(() => {
    if ((clotures as any[]).length === 0) return 0;
    return Number((clotures as any[])[0]?.resultat || 0);
  }, [clotures]);

  const formatMontant = (n: number) => Math.round(n).toLocaleString("fr-FR");

  // Déterminer les mois déjà clôturés pour l'année sélectionnée
  const moisClotures = useMemo(() => {
    return cloturesMensuelles
      .filter((c: any) => c.annee === Number(selectedAnnee))
      .map((c: any) => c.mois);
  }, [cloturesMensuelles, selectedAnnee]);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Chargement des clôtures...</div>;
  if (error) return <div className="py-12 text-center text-destructive">Erreur : {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clôtures Comptables</h1>
          <p className="text-muted-foreground">Gestion des clôtures mensuelles et annuelles de l'exercice</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowMensuelle(true)}>
            <Calendar className="h-4 w-4 mr-1" />Clôture mensuelle
          </Button>
          <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowAnnuelle(true)}>
            <Lock className="h-4 w-4 mr-1" />Clôture annuelle
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clôtures mensuelles</CardTitle>
            <Calendar className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{cloturesMensuelles.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clôtures annuelles</CardTitle>
            <Lock className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{cloturesAnnuelles.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dernier résultat</CardTitle>
            {dernierResultat >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold font-mono ${dernierResultat >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatMontant(dernierResultat)} FCFA
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mois en cours</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{MOIS_LABELS[new Date().getMonth() + 1]} {new Date().getFullYear()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendrier des clôtures mensuelles */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Calendrier des clôtures {selectedAnnee}</CardTitle>
          <CardDescription>Statut de clôture de chaque mois de l'exercice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {["2024", "2025", "2026"].map(a => (
              <Button key={a} variant={selectedAnnee === a ? "default" : "outline"} size="sm" onClick={() => setSelectedAnnee(a)}>
                {a}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(mois => {
              const isCloture = moisClotures.includes(mois);
              const clotureData = cloturesMensuelles.find((c: any) => c.annee === Number(selectedAnnee) && c.mois === mois);
              return (
                <div
                  key={mois}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    isCloture
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-border/50 bg-muted/30"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">{MOIS_LABELS[mois]}</p>
                  {isCloture ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 mx-auto my-1 text-green-500" />
                      <p className="text-[10px] font-mono text-green-500">
                        {formatMontant(Number(clotureData?.resultat || 0))}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="h-5 w-5 mx-auto my-1 rounded-full border-2 border-dashed border-muted-foreground/30" />
                      <p className="text-[10px] text-muted-foreground">Non clôturé</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Historique des clôtures */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Historique des clôtures</CardTitle>
        </CardHeader>
        <CardContent>
          {(clotures as any[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucune clôture effectuée</p>
              <p className="text-sm mt-1">Effectuez votre première clôture mensuelle pour commencer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Date de clôture</TableHead>
                  <TableHead className="text-right">Total Débit</TableHead>
                  <TableHead className="text-right">Total Crédit</TableHead>
                  <TableHead className="text-right">Résultat</TableHead>
                  <TableHead>Clôturé par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(clotures as any[]).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant={c.type_cloture === "annuelle" ? "default" : "secondary"} className={c.type_cloture === "annuelle" ? "bg-[#daa520] text-black" : ""}>
                        {c.type_cloture === "annuelle" ? "Annuelle" : "Mensuelle"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.type_cloture === "annuelle" ? `Exercice ${c.annee}` : `${MOIS_LABELS[c.mois]} ${c.annee}`}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.date_cloture ? new Date(c.date_cloture).toLocaleDateString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatMontant(Number(c.total_debit || 0))}</TableCell>
                    <TableCell className="text-right font-mono">{formatMontant(Number(c.total_credit || 0))}</TableCell>
                    <TableCell className={`text-right font-mono font-medium ${Number(c.resultat) >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {formatMontant(Number(c.resultat || 0))} FCFA
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.cloture_par || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog clôture mensuelle */}
      <Dialog open={showMensuelle} onOpenChange={setShowMensuelle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#daa520]" />
              Clôture mensuelle
            </DialogTitle>
            <DialogDescription>
              Cette opération est irréversible. Toutes les écritures du mois seront verrouillées.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-md bg-orange-500/10 text-orange-500 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Attention : une fois clôturé, aucune écriture ne pourra être ajoutée ou modifiée sur ce mois.</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mois *</Label>
                <Select value={selectedMois} onValueChange={setSelectedMois}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <SelectItem key={m} value={m.toString()} disabled={moisClotures.includes(m)}>
                        {MOIS_LABELS[m]} {moisClotures.includes(m) ? "(déjà clôturé)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Année *</Label>
                <Select value={selectedAnnee} onValueChange={setSelectedAnnee}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMensuelle(false)}>Annuler</Button>
            <Button
              className="bg-[#daa520] hover:bg-[#c8a415] text-black"
              onClick={() => clotureMensuelle.mutate({ mois: Number(selectedMois), annee: Number(selectedAnnee) })}
              disabled={clotureMensuelle.isPending}
            >
              {clotureMensuelle.isPending ? "Clôture en cours..." : `Clôturer ${MOIS_LABELS[Number(selectedMois)]} ${selectedAnnee}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog clôture annuelle */}
      <Dialog open={showAnnuelle} onOpenChange={setShowAnnuelle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#daa520]" />
              Clôture annuelle
            </DialogTitle>
            <DialogDescription>
              Cette opération clôture définitivement l'exercice comptable. Assurez-vous que tous les mois sont déjà clôturés.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 text-red-500 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Opération définitive : l'exercice sera verrouillé et le résultat reporté à l'exercice suivant.</span>
            </div>
            <div>
              <Label>Exercice à clôturer *</Label>
              <Select value={selectedAnneeClot} onValueChange={setSelectedAnneeClot}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">Exercice 2024</SelectItem>
                  <SelectItem value="2025">Exercice 2025</SelectItem>
                  <SelectItem value="2026">Exercice 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnuelle(false)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => clotureAnnuelle.mutate({ annee: Number(selectedAnneeClot) })}
              disabled={clotureAnnuelle.isPending}
            >
              {clotureAnnuelle.isPending ? "Clôture en cours..." : `Clôturer l'exercice ${selectedAnneeClot}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
