/**
 * Module Comptabilité Avancée - SYSCOHADA
 * Grand Livre, Balance, États Financiers
 * Adapté à la structure Supabase réelle (ecritures_comptables, lignes_ecritures, journaux)
 */

import { supabase } from "./supabase";

// ============================================================
// GRAND LIVRE
// ============================================================

export interface MouvementGrandLivre {
  date: string;
  journal: string;
  numero_piece: string;
  libelle: string;
  debit: number;
  credit: number;
  solde_cumule: number;
}

export interface CompteGrandLivre {
  numero_compte: string;
  libelle_compte: string;
  mouvements: MouvementGrandLivre[];
  total_debit: number;
  total_credit: number;
  solde: number;
}

/**
 * Génère le Grand Livre pour une période donnée
 */
export async function genererGrandLivre(
  dateDebut?: string,
  dateFin?: string,
  compteDebut?: string,
  compteFin?: string
): Promise<CompteGrandLivre[]> {
  // Récupérer toutes les lignes d'écritures
  const { data: lignes, error: lignesError } = await supabase
    .from("lignes_ecritures")
    .select("*")
    .order("compte_numero");

  if (lignesError || !lignes) return [];

  // Récupérer les écritures comptables
  const { data: ecritures, error: ecrituresError } = await supabase
    .from("ecritures_comptables")
    .select("*");

  if (ecrituresError || !ecritures) return [];

  // Récupérer les journaux
  const { data: journaux } = await supabase.from("journaux").select("*");
  const journauxMap = new Map((journaux || []).map((j: any) => [j.id, j]));

  // Map des écritures par id
  const ecrituresMap = new Map((ecritures as any[]).map((e) => [e.id, e]));

  // Filtrer par date si spécifié
  let lignesFiltrees = (lignes as any[]).filter((l) => {
    const ecriture = ecrituresMap.get(l.ecriture_id);
    if (!ecriture) return false;
    if (dateDebut && ecriture.date_ecriture < dateDebut) return false;
    if (dateFin && ecriture.date_ecriture > dateFin) return false;
    if (compteDebut && l.compte_numero < compteDebut) return false;
    if (compteFin && l.compte_numero > compteFin) return false;
    return true;
  });

  // Récupérer le plan comptable pour les libellés
  const { data: planComptable } = await supabase
    .from("plan_comptable")
    .select("numero_compte, libelle");
  const planMap = new Map(
    (planComptable || []).map((c: any) => [c.numero_compte, c.libelle])
  );

  // Grouper par compte
  const comptesMap = new Map<string, CompteGrandLivre>();

  for (const ligne of lignesFiltrees) {
    const numero = ligne.compte_numero;
    if (!comptesMap.has(numero)) {
      comptesMap.set(numero, {
        numero_compte: numero,
        libelle_compte: planMap.get(numero) || "Compte inconnu",
        mouvements: [],
        total_debit: 0,
        total_credit: 0,
        solde: 0,
      });
    }

    const compte = comptesMap.get(numero)!;
    const debit = Number(ligne.debit) || 0;
    const credit = Number(ligne.credit) || 0;
    compte.total_debit += debit;
    compte.total_credit += credit;
    compte.solde = compte.total_debit - compte.total_credit;

    const ecriture = ecrituresMap.get(ligne.ecriture_id);
    const journal = ecriture ? journauxMap.get(ecriture.journal_id) : null;

    compte.mouvements.push({
      date: ecriture?.date_ecriture || "",
      journal: (journal as any)?.code || "",
      numero_piece: ecriture?.numero_piece || "",
      libelle: ligne.libelle || ecriture?.libelle || "",
      debit,
      credit,
      solde_cumule: compte.solde,
    });
  }

  // Trier par numéro de compte
  return Array.from(comptesMap.values()).sort((a, b) =>
    a.numero_compte.localeCompare(b.numero_compte)
  );
}

// ============================================================
// BALANCE GÉNÉRALE
// ============================================================

export interface LigneBalance {
  numero_compte: string;
  libelle: string;
  classe: number;
  total_debit: number;
  total_credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
}

export interface Balance {
  lignes: LigneBalance[];
  totaux: {
    total_debit: number;
    total_credit: number;
    total_solde_debiteur: number;
    total_solde_crediteur: number;
  };
  equilibre: boolean;
}

/**
 * Génère la Balance Générale
 */
export async function genererBalance(
  dateDebut?: string,
  dateFin?: string
): Promise<Balance> {
  const grandLivre = await genererGrandLivre(dateDebut, dateFin);

  const lignes: LigneBalance[] = grandLivre.map((compte) => {
    const solde = compte.total_debit - compte.total_credit;
    return {
      numero_compte: compte.numero_compte,
      libelle: compte.libelle_compte,
      classe: parseInt(compte.numero_compte[0]) || 0,
      total_debit: compte.total_debit,
      total_credit: compte.total_credit,
      solde_debiteur: solde > 0 ? solde : 0,
      solde_crediteur: solde < 0 ? Math.abs(solde) : 0,
    };
  });

  const totaux = lignes.reduce(
    (acc, l) => ({
      total_debit: acc.total_debit + l.total_debit,
      total_credit: acc.total_credit + l.total_credit,
      total_solde_debiteur: acc.total_solde_debiteur + l.solde_debiteur,
      total_solde_crediteur: acc.total_solde_crediteur + l.solde_crediteur,
    }),
    { total_debit: 0, total_credit: 0, total_solde_debiteur: 0, total_solde_crediteur: 0 }
  );

  return {
    lignes,
    totaux,
    equilibre: Math.abs(totaux.total_debit - totaux.total_credit) < 1,
  };
}

// ============================================================
// ÉTATS FINANCIERS SYSCOHADA
// ============================================================

export interface PosteBilan {
  numero: string;
  libelle: string;
  montant: number;
}

export interface Bilan {
  actif: {
    actif_immobilise: PosteBilan[];
    actif_circulant: PosteBilan[];
    tresorerie_actif: PosteBilan[];
    total_actif: number;
  };
  passif: {
    capitaux_propres: PosteBilan[];
    dettes_financieres: PosteBilan[];
    passif_circulant: PosteBilan[];
    tresorerie_passif: PosteBilan[];
    total_passif: number;
  };
  equilibre: boolean;
}

export interface CompteResultat {
  produits: {
    chiffre_affaires: number;
    autres_produits: number;
    produits_financiers: number;
    total_produits: number;
  };
  charges: {
    achats_marchandises: number;
    autres_achats: number;
    charges_personnel: number;
    impots_taxes: number;
    dotations_amortissements: number;
    charges_financieres: number;
    total_charges: number;
  };
  resultats: {
    marge_brute: number;
    valeur_ajoutee: number;
    excedent_brut_exploitation: number;
    resultat_exploitation: number;
    resultat_financier: number;
    resultat_activites_ordinaires: number;
    resultat_net: number;
  };
}

/**
 * Génère le Bilan SYSCOHADA
 */
export async function genererBilan(dateFin?: string): Promise<Bilan> {
  const grandLivre = await genererGrandLivre(undefined, dateFin);

  // Fonction helper pour sommer les soldes d'une plage de comptes
  const soldeComptes = (debut: string, fin: string): number => {
    return grandLivre
      .filter((c) => c.numero_compte >= debut && c.numero_compte <= fin)
      .reduce((sum, c) => sum + c.solde, 0);
  };

  // ACTIF (classes 2-5, soldes débiteurs)
  const actif_immobilise: PosteBilan[] = [
    { numero: "21", libelle: "Immobilisations incorporelles", montant: Math.max(0, soldeComptes("21", "219")) },
    { numero: "22", libelle: "Terrains", montant: Math.max(0, soldeComptes("22", "229")) },
    { numero: "23", libelle: "Bâtiments", montant: Math.max(0, soldeComptes("23", "239")) },
    { numero: "24", libelle: "Matériel", montant: Math.max(0, soldeComptes("24", "249")) },
    { numero: "25", libelle: "Avances sur immobilisations", montant: Math.max(0, soldeComptes("25", "259")) },
    { numero: "26", libelle: "Titres de participation", montant: Math.max(0, soldeComptes("26", "269")) },
    { numero: "27", libelle: "Autres immobilisations financières", montant: Math.max(0, soldeComptes("27", "279")) },
  ].filter(p => p.montant > 0);

  const actif_circulant: PosteBilan[] = [
    { numero: "31", libelle: "Marchandises", montant: Math.max(0, soldeComptes("31", "399")) },
    { numero: "41", libelle: "Clients et comptes rattachés", montant: Math.max(0, soldeComptes("41", "419")) },
    { numero: "42", libelle: "Personnel (débiteur)", montant: Math.max(0, soldeComptes("42", "429")) },
    { numero: "43", libelle: "Organismes sociaux (débiteur)", montant: Math.max(0, soldeComptes("43", "439")) },
    { numero: "44", libelle: "État et collectivités (débiteur)", montant: Math.max(0, soldeComptes("44", "449")) },
    { numero: "47", libelle: "Débiteurs divers", montant: Math.max(0, soldeComptes("47", "479")) },
  ].filter(p => p.montant > 0);

  const tresorerie_actif: PosteBilan[] = [
    { numero: "51", libelle: "Banques", montant: Math.max(0, soldeComptes("51", "539")) },
    { numero: "57", libelle: "Caisse", montant: Math.max(0, soldeComptes("57", "579")) },
  ].filter(p => p.montant > 0);

  // PASSIF (classes 1, 4-5 soldes créditeurs)
  const capitaux_propres: PosteBilan[] = [
    { numero: "10", libelle: "Capital", montant: Math.abs(Math.min(0, soldeComptes("10", "109"))) },
    { numero: "11", libelle: "Réserves", montant: Math.abs(Math.min(0, soldeComptes("11", "119"))) },
    { numero: "12", libelle: "Report à nouveau", montant: Math.abs(Math.min(0, soldeComptes("12", "129"))) },
    { numero: "13", libelle: "Résultat de l'exercice", montant: Math.abs(Math.min(0, soldeComptes("13", "139"))) },
  ].filter(p => p.montant > 0);

  const dettes_financieres: PosteBilan[] = [
    { numero: "16", libelle: "Emprunts et dettes", montant: Math.abs(Math.min(0, soldeComptes("16", "179"))) },
  ].filter(p => p.montant > 0);

  const passif_circulant: PosteBilan[] = [
    { numero: "40", libelle: "Fournisseurs", montant: Math.abs(Math.min(0, soldeComptes("40", "409"))) },
    { numero: "42p", libelle: "Personnel (créditeur)", montant: Math.abs(Math.min(0, soldeComptes("42", "429"))) },
    { numero: "43p", libelle: "Organismes sociaux", montant: Math.abs(Math.min(0, soldeComptes("43", "439"))) },
    { numero: "44p", libelle: "État (créditeur)", montant: Math.abs(Math.min(0, soldeComptes("44", "449"))) },
  ].filter(p => p.montant > 0);

  const tresorerie_passif: PosteBilan[] = [
    { numero: "56", libelle: "Découverts bancaires", montant: Math.abs(Math.min(0, soldeComptes("51", "569"))) },
  ].filter(p => p.montant > 0);

  const total_actif =
    actif_immobilise.reduce((s, p) => s + p.montant, 0) +
    actif_circulant.reduce((s, p) => s + p.montant, 0) +
    tresorerie_actif.reduce((s, p) => s + p.montant, 0);

  const total_passif =
    capitaux_propres.reduce((s, p) => s + p.montant, 0) +
    dettes_financieres.reduce((s, p) => s + p.montant, 0) +
    passif_circulant.reduce((s, p) => s + p.montant, 0) +
    tresorerie_passif.reduce((s, p) => s + p.montant, 0);

  return {
    actif: { actif_immobilise, actif_circulant, tresorerie_actif, total_actif },
    passif: { capitaux_propres, dettes_financieres, passif_circulant, tresorerie_passif, total_passif },
    equilibre: Math.abs(total_actif - total_passif) < 1,
  };
}

/**
 * Génère le Compte de Résultat SYSCOHADA
 */
export async function genererCompteResultat(
  dateDebut?: string,
  dateFin?: string
): Promise<CompteResultat> {
  const grandLivre = await genererGrandLivre(dateDebut, dateFin);

  // Pour les charges (classe 6): le solde est débiteur = montant de la charge
  // Pour les produits (classe 7): le solde est créditeur (négatif dans notre convention) = montant du produit
  const totalComptes = (debut: string, fin: string): number => {
    return grandLivre
      .filter((c) => c.numero_compte >= debut && c.numero_compte <= fin)
      .reduce((sum, c) => sum + Math.abs(c.solde), 0);
  };

  // PRODUITS (classe 7) - soldes créditeurs
  const chiffre_affaires = totalComptes("70", "709");
  const autres_produits =
    totalComptes("71", "759") + totalComptes("78", "789");
  const produits_financiers = totalComptes("77", "779");
  const total_produits = chiffre_affaires + autres_produits + produits_financiers;

  // CHARGES (classe 6) - soldes débiteurs
  const achats_marchandises = totalComptes("60", "609");
  const autres_achats = totalComptes("61", "629");
  const charges_personnel = totalComptes("66", "669");
  const impots_taxes = totalComptes("64", "649");
  const dotations_amortissements = totalComptes("68", "689");
  const charges_financieres = totalComptes("67", "679");
  const total_charges =
    achats_marchandises + autres_achats + charges_personnel +
    impots_taxes + dotations_amortissements + charges_financieres;

  // RÉSULTATS INTERMÉDIAIRES (SIG SYSCOHADA)
  const marge_brute = chiffre_affaires - achats_marchandises;
  const valeur_ajoutee = marge_brute - autres_achats;
  const excedent_brut_exploitation = valeur_ajoutee - charges_personnel - impots_taxes;
  const resultat_exploitation = excedent_brut_exploitation - dotations_amortissements;
  const resultat_financier = produits_financiers - charges_financieres;
  const resultat_activites_ordinaires = resultat_exploitation + resultat_financier;
  const resultat_net = total_produits - total_charges;

  return {
    produits: { chiffre_affaires, autres_produits, produits_financiers, total_produits },
    charges: {
      achats_marchandises, autres_achats, charges_personnel,
      impots_taxes, dotations_amortissements, charges_financieres, total_charges,
    },
    resultats: {
      marge_brute, valeur_ajoutee, excedent_brut_exploitation,
      resultat_exploitation, resultat_financier, resultat_activites_ordinaires, resultat_net,
    },
  };
}

// ============================================================
// BALANCE ÂGÉE (AUXILIAIRE)
// ============================================================

export interface LigneBalanceAgee {
  tiers_id: string;
  raison_sociale: string;
  total_du: number;
  non_echu: number;
  echu_0_30: number;
  echu_31_60: number;
  echu_61_90: number;
  echu_plus_90: number;
}

/**
 * Génère la balance âgée clients ou fournisseurs
 */
export async function genererBalanceAgee(
  type: "client" | "fournisseur"
): Promise<LigneBalanceAgee[]> {
  const { data: tiers, error } = await supabase
    .from("tiers")
    .select("*")
    .eq("type_tiers", type);

  if (error || !tiers) return [];

  const today = new Date();
  const result: LigneBalanceAgee[] = [];

  for (const t of tiers as any[]) {
    // Utiliser factures_vente pour clients, factures_achat pour fournisseurs
    const tableFact = type === "client" ? "factures_vente" : "factures_achat";
    const champTiers = type === "client" ? "client_id" : "fournisseur_id";

    const { data: factures } = await supabase
      .from(tableFact)
      .select("*")
      .eq(champTiers, t.id);

    if (!factures || factures.length === 0) continue;

    // Filtrer les factures non payées
    const facturesNonPayees = (factures as any[]).filter(
      (f) => f.statut !== "payee" && f.statut !== "payée"
    );

    if (facturesNonPayees.length === 0) continue;

    let non_echu = 0, echu_0_30 = 0, echu_31_60 = 0, echu_61_90 = 0, echu_plus_90 = 0;

    for (const f of facturesNonPayees) {
      const dateDoc = new Date(f.date_facture || f.date_emission || today);
      const joursEcoules = Math.floor((today.getTime() - dateDoc.getTime()) / (1000 * 60 * 60 * 24));
      const montant = Number(f.montant_ttc) || 0;

      if (joursEcoules <= 30) non_echu += montant;
      else if (joursEcoules <= 60) echu_0_30 += montant;
      else if (joursEcoules <= 90) echu_31_60 += montant;
      else if (joursEcoules <= 120) echu_61_90 += montant;
      else echu_plus_90 += montant;
    }

    const total_du = non_echu + echu_0_30 + echu_31_60 + echu_61_90 + echu_plus_90;
    if (total_du > 0) {
      result.push({
        tiers_id: t.id.toString(),
        raison_sociale: t.raison_sociale,
        total_du,
        non_echu,
        echu_0_30,
        echu_31_60,
        echu_61_90,
        echu_plus_90,
      });
    }
  }

  return result;
}
