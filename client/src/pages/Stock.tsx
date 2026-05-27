import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Package, ArrowUpDown, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const CATEGORIES = [
  "Trade Finance",
  "Négoce de Ciment",
  "Formation",
  "Consultance",
  "Fiscalité",
  "Banque Privée d'Affaire",
];

export default function Stock() {
  const [showNewArticle, setShowNewArticle] = useState(false);
  const [articleForm, setArticleForm] = useState({
    code_article: "",
    designation: "",
    categorie: "",
    unite: "unité",
    prix_unitaire: 0,
    quantite_stock: 0,
  });

  const utils = trpc.useUtils();
  const { data: articles = [], isLoading } = trpc.stock.getArticles.useQuery();
  const { data: categoriesDB = [] } = trpc.stock.getCategories.useQuery();

  const createArticle = trpc.stock.createArticle.useMutation({
    onSuccess: () => {
      toast.success("Article créé avec succès");
      setShowNewArticle(false);
      setArticleForm({ code_article: "", designation: "", categorie: "", unite: "unité", prix_unitaire: 0, quantite_stock: 0 });
      utils.stock.getArticles.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreateArticle = () => {
    if (!articleForm.code_article || !articleForm.designation || !articleForm.categorie) {
      toast.error("Veuillez remplir les champs obligatoires (code, désignation, catégorie)");
      return;
    }
    createArticle.mutate(articleForm);
  };

  const articlesByCategory = CATEGORIES.map(cat => ({
    nom: cat,
    articles: (articles as any[]).filter((a: any) => a.categorie === cat).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion du Stock</h1>
          <p className="text-muted-foreground">Articles, mouvements et traçabilité</p>
        </div>
        <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowNewArticle(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel article
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total articles</CardTitle>
            <Package className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{(articles as any[]).length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mouvements du mois</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Catégories</CardTitle>
            <Tag className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">6</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articlesByCategory.map((cat) => (
              <Card key={cat.nom} className="border-border/50 hover:border-[#daa520]/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="h-10 w-10 rounded-lg bg-[#daa520]/10 flex items-center justify-center">
                    <Tag className="h-5 w-5 text-[#daa520]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{cat.nom}</CardTitle>
                    <p className="text-xs text-muted-foreground">{cat.articles} article(s)</p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="articles">
          <Card className="border-border/50">
            {isLoading ? (
              <CardContent className="pt-6"><p className="text-sm text-muted-foreground text-center py-8">Chargement...</p></CardContent>
            ) : (articles as any[]).length === 0 ? (
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Aucun article en stock</h3>
                  <p className="text-sm text-muted-foreground mt-1">Ajoutez des articles pour commencer le suivi de stock</p>
                  <Button className="mt-4 bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={() => setShowNewArticle(true)}>
                    <Plus className="h-4 w-4 mr-2" />Nouvel article
                  </Button>
                </div>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(articles as any[]).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-[#daa520]">{a.code_article}</TableCell>
                      <TableCell>{a.designation}</TableCell>
                      <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-[#daa520]/10 text-[#daa520]">{a.categorie}</span></TableCell>
                      <TableCell>{a.unite}</TableCell>
                      <TableCell className="text-right font-mono">{(a.prix_unitaire || 0).toLocaleString("fr-FR")} FCFA</TableCell>
                      <TableCell className="text-right font-mono">{a.quantite_stock || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="mouvements">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ArrowUpDown className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Aucun mouvement</h3>
                <p className="text-sm text-muted-foreground mt-1">Les mouvements de stock (entrées/sorties) apparaîtront ici</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Nouvel article */}
      <Dialog open={showNewArticle} onOpenChange={setShowNewArticle}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel article</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code article *</Label>
                <Input value={articleForm.code_article} onChange={(e) => setArticleForm({ ...articleForm, code_article: e.target.value })} placeholder="ART-001" className="font-mono" />
              </div>
              <div>
                <Label>Catégorie *</Label>
                <Select value={articleForm.categorie} onValueChange={(v) => setArticleForm({ ...articleForm, categorie: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Désignation *</Label>
              <Input value={articleForm.designation} onChange={(e) => setArticleForm({ ...articleForm, designation: e.target.value })} placeholder="Nom de l'article" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Unité</Label>
                <Select value={articleForm.unite} onValueChange={(v) => setArticleForm({ ...articleForm, unite: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unité">Unité</SelectItem>
                    <SelectItem value="tonne">Tonne</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="lot">Lot</SelectItem>
                    <SelectItem value="forfait">Forfait</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prix unitaire (FCFA)</Label>
                <Input type="number" value={articleForm.prix_unitaire || ""} onChange={(e) => setArticleForm({ ...articleForm, prix_unitaire: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Quantité initiale</Label>
                <Input type="number" value={articleForm.quantite_stock || ""} onChange={(e) => setArticleForm({ ...articleForm, quantite_stock: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewArticle(false)}>Annuler</Button>
            <Button className="bg-[#daa520] hover:bg-[#c8a415] text-black" onClick={handleCreateArticle} disabled={createArticle.isPending}>
              {createArticle.isPending ? "Création..." : "Créer l'article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
