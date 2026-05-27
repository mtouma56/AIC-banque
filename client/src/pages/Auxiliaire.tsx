import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Users, Building2, Calendar, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Auxiliaire() {
  const [showNewTiers, setShowNewTiers] = useState(false);
  const [tiersType, setTiersType] = useState<"client" | "fournisseur">("client");
  const [tiersForm, setTiersForm] = useState({
    raison_sociale: "",
    code_tiers: "",
    numero_compte: "",
    telephone: "",
    email: "",
    adresse: "",
  });

  const utils = trpc.useUtils();
  const { data: tiers = [], isLoading } = trpc.tiers.getAll.useQuery();
  const clients = (tiers as any[]).filter((t: any) => t.type_tiers === "client");
  const fournisseurs = (tiers as any[]).filter((t: any) => t.type_tiers === "fournisseur");

  const createTiers = trpc.tiers.create.useMutation({
    onSuccess: () => {
      toast.success(`${tiersType === "client" ? "Client" : "Fournisseur"} créé avec succès`);
      setShowNewTiers(false);
      setTiersForm({ raison_sociale: "", code_tiers: "", numero_compte: "", telephone: "", email: "", adresse: "" });
      utils.tiers.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreateTiers = () => {
    if (!tiersForm.raison_sociale) {
      toast.error("La raison sociale est obligatoire");
      return;
    }
    createTiers.mutate({
      type_tiers: tiersType,
      code_tiers: tiersForm.code_tiers || (tiersType === "client" ? "CLI" : "FRS") + Date.now().toString().slice(-4),
      raison_sociale: tiersForm.raison_sociale,
      adresse: tiersForm.adresse || undefined,
      telephone: tiersForm.telephone || undefined,
      email: tiersForm.email || undefined,
      numero_compte: tiersForm.numero_compte || undefined,
    });
  };

  const openNewClient = () => { setTiersType("client"); setShowNewTiers(true); };
  const openNewFournisseur = () => { setTiersType("fournisseur"); setShowNewTiers(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comptabilité Auxiliaire</h1>
          <p className="text-muted-foreground">Suivi clients et fournisseurs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewClient}>
            <Plus className="h-4 w-4 mr-1" />Client
          </Button>
          <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={openNewFournisseur}>
            <Plus className="h-4 w-4 mr-1" />Fournisseur
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clients</CardTitle>
            <Users className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent><div className="text-xl font-bold">{clients.length}</div></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fournisseurs</CardTitle>
            <Building2 className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent><div className="text-xl font-bold">{fournisseurs.length}</div></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Échéances en cours</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-xl font-bold">0</div></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Règlements du mois</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-xl font-bold">0 FCFA</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="fournisseurs">Fournisseurs</TabsTrigger>
          <TabsTrigger value="echeances">Échéancier</TabsTrigger>
          <TabsTrigger value="balance-agee">Balance âgée</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <Card className="border-border/50">
            {isLoading ? (
              <CardContent className="pt-6"><p className="text-sm text-muted-foreground text-center py-8">Chargement...</p></CardContent>
            ) : clients.length === 0 ? (
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Aucun client enregistré</h3>
                  <p className="text-sm text-muted-foreground mt-1">Ajoutez vos clients pour suivre leurs comptes</p>
                  <Button className="mt-4 bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={openNewClient}>
                    <Plus className="h-4 w-4 mr-2" />Ajouter un client
                  </Button>
                </div>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Raison sociale</TableHead>
                    <TableHead>Compte</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-[#daa520]">{c.code_tiers}</TableCell>
                      <TableCell className="font-medium">{c.raison_sociale}</TableCell>
                      <TableCell className="font-mono text-xs">{c.numero_compte || "—"}</TableCell>
                      <TableCell>{c.telephone || "—"}</TableCell>
                      <TableCell>{c.email || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="fournisseurs">
          <Card className="border-border/50">
            {fournisseurs.length === 0 ? (
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Aucun fournisseur enregistré</h3>
                  <p className="text-sm text-muted-foreground mt-1">Ajoutez vos fournisseurs pour suivre leurs comptes</p>
                  <Button className="mt-4 bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={openNewFournisseur}>
                    <Plus className="h-4 w-4 mr-2" />Ajouter un fournisseur
                  </Button>
                </div>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Raison sociale</TableHead>
                    <TableHead>Compte</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fournisseurs.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-[#daa520]">{f.code_tiers}</TableCell>
                      <TableCell className="font-medium">{f.raison_sociale}</TableCell>
                      <TableCell className="font-mono text-xs">{f.numero_compte || "—"}</TableCell>
                      <TableCell>{f.telephone || "—"}</TableCell>
                      <TableCell>{f.email || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="echeances">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Échéancier</h3>
                <p className="text-sm text-muted-foreground mt-1">Suivi des échéances de paiement clients et fournisseurs</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-agee">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Balance âgée</h3>
                <p className="text-sm text-muted-foreground mt-1">Analyse des créances et dettes par ancienneté</p>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Raison sociale *</Label>
                <Input value={tiersForm.raison_sociale} onChange={(e) => setTiersForm({ ...tiersForm, raison_sociale: e.target.value })} placeholder="Nom de l'entreprise" />
              </div>
              <div>
                <Label>Code tiers</Label>
                <Input value={tiersForm.code_tiers} onChange={(e) => setTiersForm({ ...tiersForm, code_tiers: e.target.value })} placeholder={tiersType === "client" ? "CLI001" : "FRS001"} className="font-mono" />
              </div>
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
                <Input type="email" value={tiersForm.email} onChange={(e) => setTiersForm({ ...tiersForm, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={tiersForm.adresse} onChange={(e) => setTiersForm({ ...tiersForm, adresse: e.target.value })} placeholder="Adresse complète" />
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
