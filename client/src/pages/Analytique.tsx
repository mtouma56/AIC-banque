import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, MapPin, Users, Briefcase } from "lucide-react";

export default function Analytique() {
  const axes = [
    { code: "OP", libelle: "Par Opération", icon: Briefcase, description: "Rentabilité par opération commerciale" },
    { code: "CL", libelle: "Par Client", icon: Users, description: "Rentabilité par client" },
    { code: "ZG", libelle: "Par Zone Géographique", icon: MapPin, description: "Performance par zone" },
    { code: "ACT", libelle: "Par Activité", icon: BarChart3, description: "Marges par activité (Trade Finance, Négoce, etc.)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comptabilité Analytique</h1>
        <p className="text-muted-foreground">Analyse de rentabilité par axe</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {axes.map((axe) => (
          <Card key={axe.code} className="border-border/50 hover:border-[#daa520]/30 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="h-10 w-10 rounded-lg bg-[#daa520]/10 flex items-center justify-center">
                <axe.icon className="h-5 w-5 text-[#daa520]" />
              </div>
              <div>
                <CardTitle className="text-sm">{axe.libelle}</CardTitle>
                <p className="text-xs text-muted-foreground">{axe.description}</p>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operations">Par Opération</TabsTrigger>
          <TabsTrigger value="clients">Par Client</TabsTrigger>
          <TabsTrigger value="zones">Par Zone</TabsTrigger>
          <TabsTrigger value="activites">Par Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="operations">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Analyse par opération</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Les données analytiques seront disponibles après la saisie des écritures avec ventilation analytique
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Rentabilité par client</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Suivi des coûts et revenus par client
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Performance par zone géographique</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyse des résultats par zone d'intervention
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activites">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Marges par activité</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Trade Finance, Négoce de Ciment, Formation, Consultance, Fiscalité, Banque Privée
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
