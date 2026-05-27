/**
 * Génération PDF Bulletin de Paie - AIC ERP
 * Génère un bulletin de paie au format HTML (rendu côté client en PDF)
 * Compatible avec le CGI 2025 de Côte d'Ivoire
 */

export interface BulletinPaieData {
  // Entreprise
  entreprise: {
    raison_sociale: string;
    forme_juridique: string;
    rccm: string;
    ncc: string;
    adresse: string;
    telephone: string;
  };
  // Employé
  employe: {
    matricule: string;
    nom: string;
    prenom: string;
    poste: string;
    departement?: string;
    date_embauche: string;
    situation_familiale: string;
    enfants_a_charge: number;
  };
  // Bulletin
  mois: number;
  annee: number;
  salaire_brut: number;
  primes: number;
  brut_total: number;
  // Cotisations salariales
  cnps_salarie: number;
  // Impôts
  its_net: number;
  igr: number;
  contribution_nationale: number;
  // Totaux
  total_retenues: number;
  net_a_payer: number;
  // Patronal
  cnps_patron: number;
  contributions_employeur: number;
  cout_total: number;
  // Infos supplémentaires
  nombre_parts: number;
  ricf: number;
}

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function genererHTMLBulletinPaie(data: BulletinPaieData): string {
  const formatMontant = (n: number) => Math.round(n).toLocaleString("fr-FR");
  const moisNom = MOIS_NOMS[data.mois - 1] || "?";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin de Paie - ${data.employe.nom} ${data.employe.prenom} - ${moisNom} ${data.annee}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; background: white; }
    .bulletin { max-width: 800px; margin: 0 auto; border: 2px solid #1a1a1a; padding: 20px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #daa520; padding-bottom: 15px; margin-bottom: 15px; }
    .header-left { flex: 1; }
    .header-right { text-align: right; }
    .company-name { font-size: 16px; font-weight: bold; color: #1a1a1a; }
    .company-detail { font-size: 10px; color: #555; margin-top: 2px; }
    .title { text-align: center; font-size: 14px; font-weight: bold; background: #daa520; color: #1a1a1a; padding: 8px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
    .period { text-align: center; font-size: 12px; margin-bottom: 15px; font-weight: bold; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; padding: 10px; background: #f8f8f8; border-radius: 4px; }
    .info-item { display: flex; justify-content: space-between; }
    .info-label { font-weight: bold; color: #555; font-size: 10px; }
    .info-value { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { background: #2a2a2a; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; }
    .section-title { font-weight: bold; background: #f0f0f0; }
    .amount { text-align: right; font-family: 'Courier New', monospace; }
    .total-row { font-weight: bold; background: #f5f5f5; border-top: 2px solid #daa520; }
    .net-row { font-size: 13px; background: #daa520; color: #1a1a1a; }
    .net-row td { padding: 8px; }
    .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px; color: #555; border-top: 1px solid #ddd; padding-top: 10px; }
    .signature { margin-top: 30px; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; width: 200px; }
    .signature-line { border-top: 1px solid #1a1a1a; margin-top: 40px; padding-top: 5px; }
    @media print { body { padding: 0; } .bulletin { border: none; } }
  </style>
</head>
<body>
  <div class="bulletin">
    <div class="header">
      <div class="header-left">
        <div class="company-name">${data.entreprise.raison_sociale}</div>
        <div class="company-detail">${data.entreprise.forme_juridique}</div>
        <div class="company-detail">RCCM: ${data.entreprise.rccm}</div>
        <div class="company-detail">NCC: ${data.entreprise.ncc}</div>
        <div class="company-detail">${data.entreprise.adresse}</div>
        <div class="company-detail">Tél: ${data.entreprise.telephone}</div>
      </div>
      <div class="header-right">
        <div style="font-size: 10px; color: #555;">N° Bulletin</div>
        <div style="font-size: 14px; font-weight: bold;">${data.employe.matricule}-${data.annee}${String(data.mois).padStart(2, "0")}</div>
      </div>
    </div>

    <div class="title">Bulletin de Paie</div>
    <div class="period">${moisNom} ${data.annee}</div>

    <div class="info-grid">
      <div class="info-item"><span class="info-label">Matricule</span><span class="info-value">${data.employe.matricule}</span></div>
      <div class="info-item"><span class="info-label">Poste</span><span class="info-value">${data.employe.poste}</span></div>
      <div class="info-item"><span class="info-label">Nom & Prénom</span><span class="info-value">${data.employe.nom} ${data.employe.prenom}</span></div>
      <div class="info-item"><span class="info-label">Département</span><span class="info-value">${data.employe.departement || "-"}</span></div>
      <div class="info-item"><span class="info-label">Date d'embauche</span><span class="info-value">${data.employe.date_embauche}</span></div>
      <div class="info-item"><span class="info-label">Situation</span><span class="info-value">${data.employe.situation_familiale} - ${data.employe.enfants_a_charge} enf.</span></div>
      <div class="info-item"><span class="info-label">Nombre de parts</span><span class="info-value">${data.nombre_parts}</span></div>
      <div class="info-item"><span class="info-label">RICF</span><span class="info-value">${formatMontant(data.ricf)} FCFA</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Désignation</th>
          <th style="text-align:right">Base</th>
          <th style="text-align:right">Taux</th>
          <th style="text-align:right">Montant</th>
        </tr>
      </thead>
      <tbody>
        <tr class="section-title"><td colspan="4">RÉMUNÉRATION</td></tr>
        <tr><td>Salaire de base</td><td class="amount">${formatMontant(data.salaire_brut)}</td><td class="amount">-</td><td class="amount">${formatMontant(data.salaire_brut)}</td></tr>
        ${data.primes > 0 ? `<tr><td>Primes et indemnités</td><td class="amount">-</td><td class="amount">-</td><td class="amount">${formatMontant(data.primes)}</td></tr>` : ""}
        <tr class="total-row"><td>BRUT TOTAL</td><td></td><td></td><td class="amount">${formatMontant(data.brut_total)}</td></tr>

        <tr class="section-title"><td colspan="4">COTISATIONS SALARIALES</td></tr>
        <tr><td>CNPS Retraite (salarié)</td><td class="amount">${formatMontant(data.brut_total)}</td><td class="amount">6,3%</td><td class="amount">-${formatMontant(data.cnps_salarie)}</td></tr>

        <tr class="section-title"><td colspan="4">IMPÔTS SUR SALAIRE</td></tr>
        <tr><td>ITS Net</td><td class="amount">${formatMontant(data.brut_total)}</td><td class="amount">-</td><td class="amount">-${formatMontant(data.its_net)}</td></tr>
        <tr><td>IGR (1,5%)</td><td class="amount">${formatMontant(data.brut_total)}</td><td class="amount">1,5%</td><td class="amount">-${formatMontant(data.igr)}</td></tr>
        <tr><td>Contribution Nationale (CN 1,5%)</td><td class="amount">${formatMontant(data.brut_total)}</td><td class="amount">1,5%</td><td class="amount">-${formatMontant(data.contribution_nationale)}</td></tr>

        <tr class="total-row"><td>TOTAL RETENUES</td><td></td><td></td><td class="amount">-${formatMontant(data.total_retenues)}</td></tr>
        <tr class="net-row"><td><strong>NET À PAYER</strong></td><td></td><td></td><td class="amount"><strong>${formatMontant(data.net_a_payer)} FCFA</strong></td></tr>

        <tr class="section-title"><td colspan="4">CHARGES PATRONALES (pour information)</td></tr>
        <tr><td>CNPS Patronal (Retraite + PF + AT)</td><td class="amount">${formatMontant(data.brut_total)}</td><td class="amount">15,45%</td><td class="amount">${formatMontant(data.cnps_patron)}</td></tr>
        <tr><td>Contributions employeur</td><td class="amount">-</td><td class="amount">-</td><td class="amount">${formatMontant(data.contributions_employeur)}</td></tr>
        <tr class="total-row"><td>COÛT TOTAL EMPLOYEUR</td><td></td><td></td><td class="amount">${formatMontant(data.cout_total)} FCFA</td></tr>
      </tbody>
    </table>

    <div class="signature">
      <div class="signature-box">
        <div class="signature-line">L'Employeur</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">L'Employé</div>
      </div>
    </div>

    <div class="footer">
      <span>Document généré le ${new Date().toLocaleDateString("fr-FR")}</span>
      <span>AIC ERP - Africa Invest Capital</span>
      <span>Conforme CGI 2025 - Côte d'Ivoire</span>
    </div>
  </div>
</body>
</html>`;
}
