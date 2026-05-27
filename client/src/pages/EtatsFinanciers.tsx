import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, BarChart3, Scale, Landmark, CheckCircle, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function EtatsFinanciers() {
  const { data: bilan, isLoading: loadingBilan } = trpc.comptabilite.getBilan.useQuery();
  const { data: compteResultat, isLoading: loadingCR } = trpc.comptabilite.getCompteResultat.useQuery();

  const formatMontant = (n: number) => Math.round(n).toLocaleString("fr-FR");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">États Financiers</h1>
        <p className="text-muted-foreground">Bilan, Compte de résultat et rapprochement bancaire - SYSCOHADA</p>
      </div>

      <Tabs defaultValue="bilan" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bilan">Bilan</TabsTrigger>
          <TabsTrigger value="resultat">Compte de résultat</TabsTrigger>
          <TabsTrigger value="sig">SIG</TabsTrigger>
          <TabsTrigger value="rapprochement">Rapprochement bancaire</TabsTrigger>
          <TabsTrigger value="fiscal">Déclarations fiscales</TabsTrigger>
        </TabsList>

        {/* BILAN */}
        <TabsContent value="bilan">
          {loadingBilan ? (
            <p className="text-sm text-muted-foreground text-center py-8">Calcul du bilan...</p>
          ) : (
            <div className="space-y-4">
              {/* Indicateur d'équilibre */}
              {bilan && (
                <Card className={`border-2 ${(bilan as any).equilibre ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <CardContent className="pt-4 flex items-center gap-3">
                    {(bilan as any).equilibre ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-sm font-medium">
                      {(bilan as any).equilibre
                        ? `Bilan équilibré : Actif = Passif = ${formatMontant((bilan as any).actif.total_actif)} FCFA`
                        : `Bilan déséquilibré : Actif ${formatMontant((bilan as any).actif.total_actif)} ≠ Passif ${formatMontant((bilan as any).passif.total_passif)} FCFA`}
                    </span>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {/* ACTIF */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base text-[#daa520]">ACTIF</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {bilan && (bilan as any).actif.actif_immobilise.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Actif Immobilisé</h4>
                        {(bilan as any).actif.actif_immobilise.map((p: any) => (
                          <div key={p.numero} className="flex justify-between text-sm py-1">
                            <span className="text-muted-foreground">{p.libelle}</span>
                            <span className="font-mono">{formatMontant(p.montant)} FCFA</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {bilan && (bilan as any).actif.actif_circulant.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Actif Circulant</h4>
                        {(bilan as any).actif.actif_circulant.map((p: any) => (
                          <div key={p.numero} className="flex justify-between text-sm py-1">
                            <span className="text-muted-foreground">{p.libelle}</span>
                            <span className="font-mono">{formatMontant(p.montant)} FCFA</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {bilan && (bilan as any).actif.tresorerie_actif.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Trésorerie Actif</h4>
                        {(bilan as any).actif.tresorerie_actif.map((p: any) => (
                          <div key={p.numero} className="flex justify-between text-sm py-1">
                            <span className="text-muted-foreground">{p.libelle}</span>
                            <span className="font-mono">{formatMontant(p.montant)} FCFA</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between text-sm font-bold">
                      <span>TOTAL ACTIF</span>
                      <span className="font-mono text-[#daa520]">{bilan ? formatMontant((bilan as any).actif.total_actif) : "0"} FCFA</span>
                    </div>
                  </CardContent>
                </Card>

                {/* PASSIF */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base text-[#daa520]">PASSIF</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {bilan && (bilan as any).passif.capitaux_propres.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Capitaux Propres</h4>
                        {(bilan as any).passif.capitaux_propres.map((p: any) => (
                          <div key={p.numero} className="flex justify-between text-sm py-1">
                            <span className="text-muted-foreground">{p.libelle}</span>
                            <span className="font-mono">{formatMontant(p.montant)} FCFA</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {bilan && (bilan as any).passif.dettes_financieres.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Dettes Financières</h4>
                        {(bilan as any).passif.dettes_financieres.map((p: any) => (
                          <div key={p.numero} className="flex justify-between text-sm py-1">
                            <span className="text-muted-foreground">{p.libelle}</span>
                            <span className="font-mono">{formatMontant(p.montant)} FCFA</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {bilan && (bilan as any).passif.passif_circulant.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Passif Circulant</h4>
                        {(bilan as any).passif.passif_circulant.map((p: any) => (
                          <div key={p.numero} className="flex justify-between text-sm py-1">
                            <span className="text-muted-foreground">{p.libelle}</span>
                            <span className="font-mono">{formatMontant(p.montant)} FCFA</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {bilan && (bilan as any).passif.tresorerie_passif.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Trésorerie Passif</h4>
                        {(bilan as any).passif.tresorerie_passif.map((p: any) => (
                          <div key={p.numero} className="flex justify-between text-sm py-1">
                            <span className="text-muted-foreground">{p.libelle}</span>
                            <span className="font-mono">{formatMontant(p.montant)} FCFA</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between text-sm font-bold">
                      <span>TOTAL PASSIF</span>
                      <span className="font-mono text-[#daa520]">{bilan ? formatMontant((bilan as any).passif.total_passif) : "0"} FCFA</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* COMPTE DE RÉSULTAT */}
        <TabsContent value="resultat">
          {loadingCR ? (
            <p className="text-sm text-muted-foreground text-center py-8">Calcul du compte de résultat...</p>
          ) : compteResultat ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base text-green-400">PRODUITS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Chiffre d'affaires (classe 70)</span>
                    <span className="font-mono">{formatMontant((compteResultat as any).produits.chiffre_affaires)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Autres produits (71-75, 78)</span>
                    <span className="font-mono">{formatMontant((compteResultat as any).produits.autres_produits)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Produits financiers (77)</span>
                    <span className="font-mono">{formatMontant((compteResultat as any).produits.produits_financiers)} FCFA</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm font-bold">
                    <span>TOTAL PRODUITS</span>
                    <span className="font-mono text-green-400">{formatMontant((compteResultat as any).produits.total_produits)} FCFA</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base text-red-400">CHARGES</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Achats de marchandises (60)</span>
                    <span className="font-mono">{formatMontant((compteResultat as any).charges.achats_marchandises)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Autres achats (61-62)</span>
                    <span className="font-mono">{formatMontant((compteResultat as any).charges.autres_achats)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Charges de personnel (66)</span>
                    <span className="font-mono">{formatMontant((compteResultat as any).charges.charges_personnel)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Impôts et taxes (64)</span>
                    <span className="font-mono">{formatMontant((compteResultat as any).charges.impots_taxes)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dotations amortissements (68)</span>
                    <span className="font-mono">{formatMontant((compteResultat as any).charges.dotations_amortissements)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Charges financières (67)</span>
                    <span className="font-mono">{formatMontant((compteResultat as any).charges.charges_financieres)} FCFA</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm font-bold">
                    <span>TOTAL CHARGES</span>
                    <span className="font-mono text-red-400">{formatMontant((compteResultat as any).charges.total_charges)} FCFA</span>
                  </div>
                </CardContent>
              </Card>

              {/* Résultat net */}
              <Card className="border-[#daa520]/30 md:col-span-2">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>RÉSULTAT NET DE L'EXERCICE</span>
                    <span className={`font-mono ${(compteResultat as any).resultats.resultat_net >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatMontant((compteResultat as any).resultats.resultat_net)} FCFA
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center py-12">
                <p className="text-muted-foreground">Aucune donnée disponible</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SOLDES INTERMÉDIAIRES DE GESTION (SIG) */}
        <TabsContent value="sig">
          {compteResultat ? (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-[#daa520]">Soldes Intermédiaires de Gestion (SIG) - SYSCOHADA</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicateur</TableHead>
                      <TableHead className="text-right">Montant (FCFA)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Marge brute</TableCell>
                      <TableCell className="text-right font-mono">{formatMontant((compteResultat as any).resultats.marge_brute)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Valeur ajoutée</TableCell>
                      <TableCell className="text-right font-mono">{formatMontant((compteResultat as any).resultats.valeur_ajoutee)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Excédent brut d'exploitation (EBE)</TableCell>
                      <TableCell className="text-right font-mono">{formatMontant((compteResultat as any).resultats.excedent_brut_exploitation)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Résultat d'exploitation</TableCell>
                      <TableCell className="text-right font-mono">{formatMontant((compteResultat as any).resultats.resultat_exploitation)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Résultat financier</TableCell>
                      <TableCell className="text-right font-mono">{formatMontant((compteResultat as any).resultats.resultat_financier)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Résultat des activités ordinaires (RAO)</TableCell>
                      <TableCell className="text-right font-mono">{formatMontant((compteResultat as any).resultats.resultat_activites_ordinaires)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 border-[#daa520]/30">
                      <TableCell className="font-bold text-[#daa520]">Résultat net</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${(compteResultat as any).resultats.resultat_net >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatMontant((compteResultat as any).resultats.resultat_net)} FCFA
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center py-12">
                <p className="text-muted-foreground">Aucune donnée disponible pour calculer les SIG</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RAPPROCHEMENT BANCAIRE */}
        <TabsContent value="rapprochement">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Landmark className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Rapprochement bancaire</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Comparez les écritures bancaires avec vos relevés pour identifier les écarts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DÉCLARATIONS FISCALES */}
        <TabsContent value="fiscal">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Obligations fiscales - Côte d'Ivoire</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Impôt/Taxe</TableHead>
                    <TableHead>Taux</TableHead>
                    <TableHead>Périodicité</TableHead>
                    <TableHead>Échéance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">TVA</TableCell>
                    <TableCell>18%</TableCell>
                    <TableCell>Mensuelle</TableCell>
                    <TableCell>15 du mois suivant</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">ITS (Impôt sur Traitements et Salaires)</TableCell>
                    <TableCell>Barème 7 tranches (0%-60%)</TableCell>
                    <TableCell>Mensuelle</TableCell>
                    <TableCell>15 du mois suivant</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">CNPS</TableCell>
                    <TableCell>6,3% salarié + 15,45% patron</TableCell>
                    <TableCell>Mensuelle</TableCell>
                    <TableCell>15 du mois suivant</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">IS (Impôt sur les Sociétés)</TableCell>
                    <TableCell>25%</TableCell>
                    <TableCell>Annuelle</TableCell>
                    <TableCell>30 avril N+1</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Patente</TableCell>
                    <TableCell>Variable</TableCell>
                    <TableCell>Annuelle</TableCell>
                    <TableCell>31 mars</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">IGR (Impôt Général sur le Revenu)</TableCell>
                    <TableCell>1,5% du brut</TableCell>
                    <TableCell>Mensuelle</TableCell>
                    <TableCell>15 du mois suivant</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Contribution Nationale (CN)</TableCell>
                    <TableCell>1,5% du brut</TableCell>
                    <TableCell>Mensuelle</TableCell>
                    <TableCell>15 du mois suivant</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
