/**
 * Génération PDF Devis et Factures - AIC ERP
 * Génère des documents au format HTML (rendu côté client en PDF via window.print)
 * En-tête AIC avec logo, coordonnées, détail des lignes
 */

export interface EntrepriseInfo {
  raison_sociale: string;
  forme_juridique: string;
  rccm: string;
  ncc: string;
  adresse: string;
  telephone: string;
  email: string;
  regime_fiscal: string;
}

export interface LigneDocument {
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant: number;
}

export interface FactureData {
  numero: string;
  date_facture: string;
  date_echeance?: string;
  client_nom: string;
  client_adresse?: string;
  client_telephone?: string;
  client_email?: string;
  objet?: string;
  montant_ht: number;
  taux_tva: number;
  montant_tva: number;
  montant_ttc: number;
  notes?: string;
  lignes: LigneDocument[];
  entreprise: EntrepriseInfo;
  logo_url?: string;
}

export interface DevisData {
  numero: string;
  date_devis: string;
  date_validite?: string;
  client_nom: string;
  client_adresse?: string;
  client_telephone?: string;
  client_email?: string;
  objet?: string;
  montant_ht: number;
  taux_tva: number;
  montant_tva: number;
  montant_ttc: number;
  notes?: string;
  lignes: LigneDocument[];
  entreprise: EntrepriseInfo;
  logo_url?: string;
}

const formatMontant = (n: number) => Math.round(n).toLocaleString("fr-FR");
const formatDate = (d: string) => {
  if (!d) return "-";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

function getDocumentStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; background: white; }
    .document { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #daa520; padding-bottom: 20px; margin-bottom: 20px; }
    .header-left { flex: 1; }
    .header-right { text-align: right; }
    .logo { width: 60px; height: 60px; border-radius: 50%; margin-bottom: 8px; }
    .company-name { font-size: 18px; font-weight: bold; color: #1a1a1a; }
    .company-detail { font-size: 10px; color: #555; margin-top: 2px; }
    .doc-type { font-size: 22px; font-weight: bold; color: #daa520; text-transform: uppercase; margin-bottom: 5px; }
    .doc-numero { font-size: 14px; font-weight: bold; color: #333; }
    .doc-date { font-size: 11px; color: #555; margin-top: 3px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 25px; }
    .partie { width: 48%; }
    .partie-title { font-size: 10px; text-transform: uppercase; color: #888; font-weight: bold; margin-bottom: 5px; letter-spacing: 1px; }
    .partie-content { background: #f8f8f8; padding: 12px; border-radius: 4px; border-left: 3px solid #daa520; }
    .partie-name { font-size: 13px; font-weight: bold; margin-bottom: 3px; }
    .partie-detail { font-size: 10px; color: #555; margin-top: 2px; }
    .objet { margin-bottom: 20px; padding: 10px; background: #fffbf0; border: 1px solid #daa520; border-radius: 4px; }
    .objet-label { font-size: 10px; text-transform: uppercase; color: #888; font-weight: bold; }
    .objet-text { font-size: 12px; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #2a2a2a; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:first-child { border-radius: 4px 0 0 0; }
    thead th:last-child { border-radius: 0 4px 0 0; text-align: right; }
    thead th.right { text-align: right; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #eee; }
    tbody td.right { text-align: right; font-family: 'Courier New', monospace; }
    tbody tr:nth-child(even) { background: #fafafa; }
    .totaux { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totaux-table { width: 280px; }
    .totaux-row { display: flex; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid #eee; }
    .totaux-row.total { background: #daa520; color: #1a1a1a; font-weight: bold; font-size: 13px; border-radius: 4px; border: none; }
    .totaux-label { font-weight: 500; }
    .totaux-value { font-family: 'Courier New', monospace; font-weight: bold; }
    .notes { margin-bottom: 20px; padding: 10px; background: #f8f8f8; border-radius: 4px; }
    .notes-title { font-size: 10px; text-transform: uppercase; color: #888; font-weight: bold; margin-bottom: 5px; }
    .notes-text { font-size: 10px; color: #555; white-space: pre-wrap; }
    .conditions { margin-bottom: 20px; padding: 10px; border: 1px dashed #ddd; border-radius: 4px; }
    .conditions-title { font-size: 10px; text-transform: uppercase; color: #888; font-weight: bold; margin-bottom: 5px; }
    .conditions-text { font-size: 9px; color: #666; }
    .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
    .signature { margin-top: 30px; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; width: 200px; }
    .signature-line { border-top: 1px solid #1a1a1a; margin-top: 50px; padding-top: 5px; font-size: 10px; }
    @media print { body { padding: 0; } .document { max-width: 100%; } }
  `;
}

export function genererHTMLFacture(data: FactureData): string {
  const lignesHTML = data.lignes.map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.description}</td>
      <td class="right">${l.quantite}</td>
      <td class="right">${formatMontant(l.prix_unitaire)}</td>
      <td class="right">${formatMontant(l.montant)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${data.numero} - ${data.client_nom}</title>
  <style>${getDocumentStyles()}</style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="header-left">
        ${data.logo_url ? `<img src="${data.logo_url}" class="logo" alt="Logo">` : ""}
        <div class="company-name">${data.entreprise.raison_sociale}</div>
        <div class="company-detail">${data.entreprise.forme_juridique} - ${data.entreprise.regime_fiscal}</div>
        <div class="company-detail">RCCM: ${data.entreprise.rccm || "N/A"} | NCC: ${data.entreprise.ncc || "N/A"}</div>
        <div class="company-detail">${data.entreprise.adresse}</div>
        <div class="company-detail">Tél: ${data.entreprise.telephone || "N/A"} | Email: ${data.entreprise.email || "N/A"}</div>
      </div>
      <div class="header-right">
        <div class="doc-type">Facture</div>
        <div class="doc-numero">${data.numero}</div>
        <div class="doc-date">Date: ${formatDate(data.date_facture)}</div>
        ${data.date_echeance ? `<div class="doc-date">Échéance: ${formatDate(data.date_echeance)}</div>` : ""}
      </div>
    </div>

    <div class="parties">
      <div class="partie">
        <div class="partie-title">Émetteur</div>
        <div class="partie-content">
          <div class="partie-name">${data.entreprise.raison_sociale}</div>
          <div class="partie-detail">${data.entreprise.adresse}</div>
          <div class="partie-detail">${data.entreprise.telephone || ""}</div>
        </div>
      </div>
      <div class="partie">
        <div class="partie-title">Client</div>
        <div class="partie-content">
          <div class="partie-name">${data.client_nom}</div>
          ${data.client_adresse ? `<div class="partie-detail">${data.client_adresse}</div>` : ""}
          ${data.client_telephone ? `<div class="partie-detail">${data.client_telephone}</div>` : ""}
          ${data.client_email ? `<div class="partie-detail">${data.client_email}</div>` : ""}
        </div>
      </div>
    </div>

    ${data.objet ? `<div class="objet"><div class="objet-label">Objet</div><div class="objet-text">${data.objet}</div></div>` : ""}

    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Désignation</th>
          <th class="right" style="width:60px">Qté</th>
          <th class="right" style="width:100px">P.U. (FCFA)</th>
          <th class="right" style="width:120px">Montant (FCFA)</th>
        </tr>
      </thead>
      <tbody>
        ${lignesHTML}
      </tbody>
    </table>

    <div class="totaux">
      <div class="totaux-table">
        <div class="totaux-row"><span class="totaux-label">Total HT</span><span class="totaux-value">${formatMontant(data.montant_ht)} FCFA</span></div>
        <div class="totaux-row"><span class="totaux-label">TVA (${data.taux_tva}%)</span><span class="totaux-value">${formatMontant(data.montant_tva)} FCFA</span></div>
        <div class="totaux-row total"><span class="totaux-label">Total TTC</span><span class="totaux-value">${formatMontant(data.montant_ttc)} FCFA</span></div>
      </div>
    </div>

    ${data.notes ? `<div class="notes"><div class="notes-title">Notes</div><div class="notes-text">${data.notes}</div></div>` : ""}

    <div class="conditions">
      <div class="conditions-title">Conditions de paiement</div>
      <div class="conditions-text">Paiement à réception de facture. Tout retard de paiement entraînera l'application de pénalités de retard conformément à la législation en vigueur en Côte d'Ivoire.</div>
    </div>

    <div class="signature">
      <div class="signature-box">
        <div class="signature-line">Le Directeur</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Le Client (Bon pour accord)</div>
      </div>
    </div>

    <div class="footer">
      ${data.entreprise.raison_sociale} - ${data.entreprise.forme_juridique} | RCCM: ${data.entreprise.rccm || "N/A"} | NCC: ${data.entreprise.ncc || "N/A"}<br>
      ${data.entreprise.adresse} | Tél: ${data.entreprise.telephone || "N/A"} | Email: ${data.entreprise.email || "N/A"}<br>
      Document généré le ${new Date().toLocaleDateString("fr-FR")} - AIC ERP
    </div>
  </div>
</body>
</html>`;
}

export function genererHTMLDevis(data: DevisData): string {
  const lignesHTML = data.lignes.map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.description}</td>
      <td class="right">${l.quantite}</td>
      <td class="right">${formatMontant(l.prix_unitaire)}</td>
      <td class="right">${formatMontant(l.montant)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis ${data.numero} - ${data.client_nom}</title>
  <style>${getDocumentStyles()}</style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="header-left">
        ${data.logo_url ? `<img src="${data.logo_url}" class="logo" alt="Logo">` : ""}
        <div class="company-name">${data.entreprise.raison_sociale}</div>
        <div class="company-detail">${data.entreprise.forme_juridique} - ${data.entreprise.regime_fiscal}</div>
        <div class="company-detail">RCCM: ${data.entreprise.rccm || "N/A"} | NCC: ${data.entreprise.ncc || "N/A"}</div>
        <div class="company-detail">${data.entreprise.adresse}</div>
        <div class="company-detail">Tél: ${data.entreprise.telephone || "N/A"} | Email: ${data.entreprise.email || "N/A"}</div>
      </div>
      <div class="header-right">
        <div class="doc-type" style="color: #2563eb;">Devis</div>
        <div class="doc-numero">${data.numero}</div>
        <div class="doc-date">Date: ${formatDate(data.date_devis)}</div>
        ${data.date_validite ? `<div class="doc-date">Valide jusqu'au: ${formatDate(data.date_validite)}</div>` : ""}
      </div>
    </div>

    <div class="parties">
      <div class="partie">
        <div class="partie-title">Émetteur</div>
        <div class="partie-content">
          <div class="partie-name">${data.entreprise.raison_sociale}</div>
          <div class="partie-detail">${data.entreprise.adresse}</div>
          <div class="partie-detail">${data.entreprise.telephone || ""}</div>
        </div>
      </div>
      <div class="partie">
        <div class="partie-title">Client</div>
        <div class="partie-content">
          <div class="partie-name">${data.client_nom}</div>
          ${data.client_adresse ? `<div class="partie-detail">${data.client_adresse}</div>` : ""}
          ${data.client_telephone ? `<div class="partie-detail">${data.client_telephone}</div>` : ""}
          ${data.client_email ? `<div class="partie-detail">${data.client_email}</div>` : ""}
        </div>
      </div>
    </div>

    ${data.objet ? `<div class="objet"><div class="objet-label">Objet</div><div class="objet-text">${data.objet}</div></div>` : ""}

    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Désignation</th>
          <th class="right" style="width:60px">Qté</th>
          <th class="right" style="width:100px">P.U. (FCFA)</th>
          <th class="right" style="width:120px">Montant (FCFA)</th>
        </tr>
      </thead>
      <tbody>
        ${lignesHTML}
      </tbody>
    </table>

    <div class="totaux">
      <div class="totaux-table">
        <div class="totaux-row"><span class="totaux-label">Total HT</span><span class="totaux-value">${formatMontant(data.montant_ht)} FCFA</span></div>
        <div class="totaux-row"><span class="totaux-label">TVA (${data.taux_tva}%)</span><span class="totaux-value">${formatMontant(data.montant_tva)} FCFA</span></div>
        <div class="totaux-row total"><span class="totaux-label">Total TTC</span><span class="totaux-value">${formatMontant(data.montant_ttc)} FCFA</span></div>
      </div>
    </div>

    ${data.notes ? `<div class="notes"><div class="notes-title">Notes</div><div class="notes-text">${data.notes}</div></div>` : ""}

    <div class="conditions">
      <div class="conditions-title">Conditions</div>
      <div class="conditions-text">Ce devis est valable ${data.date_validite ? `jusqu'au ${formatDate(data.date_validite)}` : "30 jours à compter de sa date d'émission"}. Passé ce délai, les prix sont susceptibles d'être révisés. Tout devis accepté vaut commande ferme.</div>
    </div>

    <div class="signature">
      <div class="signature-box">
        <div class="signature-line">Le Directeur</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Le Client (Bon pour accord)</div>
      </div>
    </div>

    <div class="footer">
      ${data.entreprise.raison_sociale} - ${data.entreprise.forme_juridique} | RCCM: ${data.entreprise.rccm || "N/A"} | NCC: ${data.entreprise.ncc || "N/A"}<br>
      ${data.entreprise.adresse} | Tél: ${data.entreprise.telephone || "N/A"} | Email: ${data.entreprise.email || "N/A"}<br>
      Document généré le ${new Date().toLocaleDateString("fr-FR")} - AIC ERP
    </div>
  </div>
</body>
</html>`;
}
