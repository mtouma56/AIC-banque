import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search, Shield } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Audit() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: auditEntries = [] } = trpc.audit.getTrail.useQuery();

  const filtered = auditEntries.filter(
    (e: any) =>
      (e.utilisateur_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.module || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Piste d'Audit</h1>
        <p className="text-muted-foreground">Traçabilité complète des actions utilisateurs</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actions aujourd'hui</CardTitle>
            <ClipboardList className="h-4 w-4 text-[#daa520]" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{auditEntries.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilisateurs actifs</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">2 exploitants, 2 administrateurs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertes sécurité</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Aucune alerte</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans l'audit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Heure</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry: any) => (
              <TableRow key={entry.id}>
                <TableCell className="font-mono text-xs">{entry.created_at ? new Date(entry.created_at).toLocaleString("fr-FR") : "-"}</TableCell>
                <TableCell>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#daa520]/10 text-[#daa520] font-medium">
                    {entry.utilisateur_code}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{entry.action}</TableCell>
                <TableCell className="text-sm">{entry.module}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{entry.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="border-[#daa520]/20 bg-[#daa520]/5">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Conformité :</strong> Chaque action est enregistrée avec l'identifiant utilisateur, la date, l'heure et le détail de l'opération. Les données d'audit ne peuvent pas être modifiées ou supprimées.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
