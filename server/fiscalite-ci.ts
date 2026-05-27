/**
 * Moteur de calcul fiscal - Côte d'Ivoire
 * Conforme au Code Général des Impôts (CGI) - Loi de Finances 2025
 * et aux règles CNPS en vigueur
 */

// ============================================================
// 1. BARÈME ITS - Impôt sur les Traitements et Salaires
//    Art. 119 bis CGI - Barème progressif mensuel
// ============================================================

export interface TrancheITS {
  min: number;
  max: number;
  taux: number;
}

// Barème mensuel (Art. 119 bis CGI)
export const BAREME_ITS_MENSUEL: TrancheITS[] = [
  { min: 0, max: 75000, taux: 0 },
  { min: 75001, max: 240000, taux: 0.16 },
  { min: 240001, max: 800000, taux: 0.21 },
  { min: 800001, max: 2400000, taux: 0.24 },
  { min: 2400001, max: 8000000, taux: 0.28 },
  { min: 8000001, max: Infinity, taux: 0.32 },
];

// Barème annuel par part (LF 2025 - 7 tranches)
export const BAREME_ITS_ANNUEL_PAR_PART: TrancheITS[] = [
  { min: 0, max: 600000, taux: 0 },
  { min: 600001, max: 1560000, taux: 0.10 },
  { min: 1560001, max: 2400000, taux: 0.15 },
  { min: 2400001, max: 3600000, taux: 0.20 },
  { min: 3600001, max: 5160000, taux: 0.25 },
  { min: 5160001, max: 7920000, taux: 0.35 },
  { min: 7920001, max: Infinity, taux: 0.60 },
];

// ============================================================
// 2. RÉDUCTION D'IMPÔT POUR CHARGES DE FAMILLE (RICF)
//    Art. 120 CGI
// ============================================================

export const RICF_MENSUEL: Record<number, number> = {
  1: 0,
  1.5: 5500,
  2: 11000,
  2.5: 16500,
  3: 22000,
  3.5: 27500,
  4: 33000,
  4.5: 38500,
  5: 44000,
};

// ============================================================
// 3. TAUX CNPS - Caisse Nationale de Prévoyance Sociale
// ============================================================

export const CNPS = {
  // Part salariale
  RETRAITE_SALARIE: 0.063, // 6,3%
  PLAFOND_RETRAITE: 2700000, // 2 700 000 FCFA/mois

  // Part patronale
  RETRAITE_PATRON: 0.077, // 7,7%
  PRESTATIONS_FAMILIALES: 0.0575, // 5,75%
  PLAFOND_PF: 70000, // 70 000 FCFA/mois (base plafonnée)
  ACCIDENT_TRAVAIL_MIN: 0.02, // 2% minimum
  ACCIDENT_TRAVAIL_MAX: 0.05, // 5% maximum
  ACCIDENT_TRAVAIL_SERVICES: 0.02, // 2% pour services financiers
  PLAFOND_AT: 70000, // 70 000 FCFA/mois (base plafonnée)
};

// ============================================================
// 4. AUTRES IMPÔTS SUR SALAIRE
// ============================================================

export const IGR_TAUX = 0.015; // 1,5% du brut (Impôt Général sur le Revenu)
export const CN_TAUX = 0.015; // 1,5% du brut (Contribution Nationale)
export const ABATTEMENT_FRAIS_PRO = 0.15; // 15% abattement forfaitaire

// ============================================================
// 5. CONTRIBUTIONS EMPLOYEUR (Art. 146 CGI - LF 2024)
// ============================================================

export const CONTRIBUTIONS_EMPLOYEUR = {
  PERSONNEL_LOCAL: {
    contribution_nationale: 0.012, // 1,2%
    taxe_apprentissage: 0.004, // 0,4%
    formation_professionnelle: 0.012, // 1,2%
    total: 0.028, // 2,8%
  },
  PERSONNEL_EXPATRIE: {
    contribution_employeur: 0.092, // 9,2%
    contribution_nationale: 0.012, // 1,2%
    taxe_apprentissage: 0.004, // 0,4%
    formation_professionnelle: 0.012, // 1,2%
    total: 0.12, // 12%
  },
};

// ============================================================
// 6. TVA (Art. 359 CGI)
// ============================================================

export const TVA_TAUX_NORMAL = 0.18; // 18%
export const TVA_TAUX_REDUIT = 0.09; // 9%

// ============================================================
// 7. IMPÔT SUR LES SOCIÉTÉS
// ============================================================

export const IS_TAUX = 0.25; // 25%
export const IS_MINIMUM_FORFAITAIRE_TAUX = 0.005; // 0,5% du CA
export const IS_MINIMUM_FORFAITAIRE_PLANCHER = 3000000; // 3 000 000 FCFA

// ============================================================
// FONCTIONS DE CALCUL
// ============================================================

export interface SituationFamiliale {
  statut: "celibataire" | "marie" | "veuf" | "divorce";
  enfants_a_charge: number;
}

export interface CalculPaieInput {
  salaire_brut: number;
  situation_familiale: SituationFamiliale;
  est_expatrie: boolean;
  primes?: number; // Primes et indemnités imposables
  avantages_nature?: number;
  heures_supplementaires?: number;
  pret_mensualite?: number; // Remboursement prêt employé
  taux_at?: number; // Taux accident travail (défaut 2%)
}

export interface CalculPaieResult {
  // Éléments de base
  salaire_brut: number;
  primes: number;
  avantages_nature: number;
  brut_total: number;

  // Cotisations salariales
  cnps_retraite_salarie: number;
  total_cotisations_salariales: number;

  // Calcul ITS
  base_imposable: number; // Brut - CNPS - Abattement 15%
  abattement_frais_pro: number;
  nombre_parts: number;
  its_brut: number;
  ricf: number; // Réduction pour charges de famille
  its_net: number;

  // Autres impôts salarié
  igr: number;
  contribution_nationale: number;
  total_impots_salarie: number;

  // Déductions
  pret_mensualite: number;

  // Salaire net
  salaire_net: number;

  // Charges patronales
  cnps_retraite_patron: number;
  cnps_prestations_familiales: number;
  cnps_accident_travail: number;
  contributions_employeur: number;
  total_charges_patronales: number;

  // Coût total employeur
  cout_total_employeur: number;

  // Détail des tranches ITS
  detail_tranches: { tranche: string; montant: number; taux: number; impot: number }[];
}

/**
 * Détermine le nombre de parts fiscales selon la situation familiale
 * Art. 120-2° CGI
 */
export function getNombreParts(situation: SituationFamiliale): number {
  const { statut, enfants_a_charge } = situation;
  let parts = 1;

  switch (statut) {
    case "celibataire":
    case "divorce":
      parts = 1;
      if (enfants_a_charge > 0) {
        parts = 1 + enfants_a_charge * 0.5;
      }
      break;
    case "marie":
      parts = 2 + enfants_a_charge * 0.5;
      break;
    case "veuf":
      if (enfants_a_charge === 0) {
        parts = 1.5;
      } else {
        parts = 2 + enfants_a_charge * 0.5;
      }
      break;
  }

  // Plafond à 5 parts (CGI)
  return Math.min(parts, 5);
}

/**
 * Calcule l'ITS brut mensuel selon le barème progressif
 * Art. 119 bis CGI
 */
export function calculerITSBrut(revenuImposableMensuel: number): {
  its: number;
  detail: { tranche: string; montant: number; taux: number; impot: number }[];
} {
  let its = 0;
  const detail: { tranche: string; montant: number; taux: number; impot: number }[] = [];

  for (const tranche of BAREME_ITS_MENSUEL) {
    if (revenuImposableMensuel <= 0) break;

    const montantDansTranche = Math.min(
      revenuImposableMensuel,
      tranche.max === Infinity ? revenuImposableMensuel : tranche.max - tranche.min + 1
    );

    if (montantDansTranche > 0) {
      const impotTranche = Math.round(montantDansTranche * tranche.taux);
      its += impotTranche;
      detail.push({
        tranche: `${tranche.min.toLocaleString("fr-FR")} - ${tranche.max === Infinity ? "+" : tranche.max.toLocaleString("fr-FR")}`,
        montant: montantDansTranche,
        taux: tranche.taux * 100,
        impot: impotTranche,
      });
      revenuImposableMensuel -= montantDansTranche;
    }
  }

  return { its, detail };
}

/**
 * Calcul complet du bulletin de paie
 * Conforme CGI Côte d'Ivoire + CNPS
 */
export function calculerPaie(input: CalculPaieInput): CalculPaieResult {
  const {
    salaire_brut,
    situation_familiale,
    est_expatrie = false,
    primes = 0,
    avantages_nature = 0,
    pret_mensualite = 0,
    taux_at = CNPS.ACCIDENT_TRAVAIL_SERVICES,
  } = input;

  // 1. Brut total
  const brut_total = salaire_brut + primes + avantages_nature;

  // 2. CNPS salariale (retraite uniquement, plafonnée)
  const base_cnps_retraite = Math.min(brut_total, CNPS.PLAFOND_RETRAITE);
  const cnps_retraite_salarie = Math.round(base_cnps_retraite * CNPS.RETRAITE_SALARIE);
  const total_cotisations_salariales = cnps_retraite_salarie;

  // 3. Base imposable ITS = Brut - CNPS salariale - Abattement 15%
  const apres_cnps = brut_total - cnps_retraite_salarie;
  const abattement_frais_pro = Math.round(apres_cnps * ABATTEMENT_FRAIS_PRO);
  const base_imposable = apres_cnps - abattement_frais_pro;

  // 4. Nombre de parts
  const nombre_parts = getNombreParts(situation_familiale);

  // 5. Calcul ITS brut sur le revenu mensuel
  const { its: its_brut, detail: detail_tranches } = calculerITSBrut(base_imposable);

  // 6. RICF - Réduction pour charges de famille
  const ricf = RICF_MENSUEL[nombre_parts] || 0;

  // 7. ITS net (ne peut pas être négatif)
  const its_net = Math.max(0, its_brut - ricf);

  // 8. IGR et CN (sur le brut total)
  const igr = Math.round(brut_total * IGR_TAUX);
  const contribution_nationale = Math.round(brut_total * CN_TAUX);

  // 9. Total impôts salarié
  const total_impots_salarie = its_net + igr + contribution_nationale;

  // 10. Salaire net
  const salaire_net = brut_total - total_cotisations_salariales - total_impots_salarie - pret_mensualite;

  // 11. Charges patronales
  const cnps_retraite_patron = Math.round(base_cnps_retraite * CNPS.RETRAITE_PATRON);
  const base_pf = Math.min(brut_total, CNPS.PLAFOND_PF);
  const cnps_prestations_familiales = Math.round(base_pf * CNPS.PRESTATIONS_FAMILIALES);
  const base_at = Math.min(brut_total, CNPS.PLAFOND_AT);
  const cnps_accident_travail = Math.round(base_at * taux_at);

  // Contributions employeur (Art. 146 CGI)
  const taux_contrib = est_expatrie
    ? CONTRIBUTIONS_EMPLOYEUR.PERSONNEL_EXPATRIE.total
    : CONTRIBUTIONS_EMPLOYEUR.PERSONNEL_LOCAL.total;
  const contributions_employeur = Math.round(brut_total * taux_contrib);

  const total_charges_patronales =
    cnps_retraite_patron + cnps_prestations_familiales + cnps_accident_travail + contributions_employeur;

  // 12. Coût total employeur
  const cout_total_employeur = brut_total + total_charges_patronales;

  return {
    salaire_brut,
    primes,
    avantages_nature,
    brut_total,
    cnps_retraite_salarie,
    total_cotisations_salariales,
    base_imposable,
    abattement_frais_pro,
    nombre_parts,
    its_brut,
    ricf,
    its_net,
    igr,
    contribution_nationale,
    total_impots_salarie,
    pret_mensualite,
    salaire_net,
    cnps_retraite_patron,
    cnps_prestations_familiales,
    cnps_accident_travail,
    contributions_employeur,
    total_charges_patronales,
    cout_total_employeur,
    detail_tranches,
  };
}

// ============================================================
// FONCTIONS TVA
// ============================================================

export interface CalculTVA {
  montant_ht: number;
  tva: number;
  montant_ttc: number;
}

/**
 * Calcule la TVA à 18% (taux normal CI)
 */
export function calculerTVA(montant_ht: number, taux: number = TVA_TAUX_NORMAL): CalculTVA {
  const tva = Math.round(montant_ht * taux);
  return {
    montant_ht,
    tva,
    montant_ttc: montant_ht + tva,
  };
}

/**
 * Calcule le HT à partir du TTC
 */
export function calculerHTdepuisTTC(montant_ttc: number, taux: number = TVA_TAUX_NORMAL): CalculTVA {
  const montant_ht = Math.round(montant_ttc / (1 + taux));
  const tva = montant_ttc - montant_ht;
  return { montant_ht, tva, montant_ttc };
}

// ============================================================
// VALIDATION COMPTABLE SYSCOHADA
// ============================================================

export interface LigneEcriture {
  compte_numero: string;
  libelle: string;
  debit: number;
  credit: number;
}

/**
 * Vérifie l'équilibre d'une écriture comptable (débit = crédit)
 * Principe fondamental SYSCOHADA
 */
export function verifierEquilibreEcriture(lignes: LigneEcriture[]): {
  equilibre: boolean;
  total_debit: number;
  total_credit: number;
  ecart: number;
} {
  const total_debit = lignes.reduce((sum, l) => sum + (l.debit || 0), 0);
  const total_credit = lignes.reduce((sum, l) => sum + (l.credit || 0), 0);
  const ecart = Math.abs(total_debit - total_credit);

  return {
    equilibre: ecart === 0,
    total_debit,
    total_credit,
    ecart,
  };
}

/**
 * Vérifie qu'un numéro de compte est valide selon SYSCOHADA
 * Classes 1 à 8
 */
export function validerCompteOHADA(numero: string): { valide: boolean; classe: number; message: string } {
  if (!numero || numero.length < 2) {
    return { valide: false, classe: 0, message: "Numéro de compte trop court" };
  }

  const classe = parseInt(numero[0]);
  if (classe < 1 || classe > 8) {
    return { valide: false, classe: 0, message: "Classe de compte invalide (doit être 1-8)" };
  }

  const descriptions: Record<number, string> = {
    1: "Comptes de ressources durables",
    2: "Comptes d'actif immobilisé",
    3: "Comptes de stocks",
    4: "Comptes de tiers",
    5: "Comptes de trésorerie",
    6: "Comptes de charges des activités ordinaires",
    7: "Comptes de produits des activités ordinaires",
    8: "Comptes des autres charges et produits",
  };

  return { valide: true, classe, message: descriptions[classe] };
}

/**
 * Détermine la nature d'un compte (bilan ou résultat)
 */
export function getNatureCompte(numero: string): "bilan" | "resultat" | "inconnu" {
  const classe = parseInt(numero[0]);
  if (classe >= 1 && classe <= 5) return "bilan";
  if (classe >= 6 && classe <= 8) return "resultat";
  return "inconnu";
}
