/**
 * Module Comptabilité Analytique - AIC ERP
 * Analyse de rentabilité par opération, client, zone géographique et activité
 */
import { supabase } from "./supabase";

export interface CentreAnalytique {
  id: number;
  axe_id: number;
  code: string;
  libelle: string;
  is_active: boolean;
}

export interface AxeAnalytique {
  id: number;
  code: string;
  libelle: string;
  type: string;
  is_active: boolean;
}

export interface RentabiliteCentre {
  centre_id: number;
  centre_code: string;
  centre_libelle: string;
  axe_type: string;
  total_produits: number;
  total_charges: number;
  marge: number;
  taux_marge: number;
}

/**
 * Récupérer tous les axes analytiques
 */
export async function getAxesAnalytiques(): Promise<AxeAnalytique[]> {
  const { data, error } = await supabase
    .from("axes_analytiques")
    .select("*")
    .order("id");
  if (error) return [];
  return data as AxeAnalytique[];
}

/**
 * Récupérer tous les centres analytiques (avec filtre par axe optionnel)
 */
export async function getCentresAnalytiques(axeId?: number): Promise<CentreAnalytique[]> {
  let query = supabase.from("centres_analytiques").select("*").eq("is_active", true);
  if (axeId) query = query.eq("axe_id", axeId);
  const { data, error } = await query.order("code");
  if (error) return [];
  return data as CentreAnalytique[];
}

/**
 * Calculer la rentabilité par centre analytique
 * Utilise les ventilations_analytiques et ecritures_analytiques pour agréger
 * les produits (comptes classe 7) et charges (comptes classe 6) par centre
 */
export async function genererRentabiliteParAxe(
  axeType?: string,
  dateDebut?: string,
  dateFin?: string
): Promise<RentabiliteCentre[]> {
  // Récupérer les centres et axes
  const { data: centres } = await supabase
    .from("centres_analytiques")
    .select("*, axe:axes_analytiques(id, code, libelle, type)")
    .eq("is_active", true);

  if (!centres || centres.length === 0) return [];

  // Filtrer par axe si spécifié
  const centresFiltres = axeType
    ? centres.filter((c: any) => c.axe?.type === axeType)
    : centres;

  // Récupérer les écritures analytiques avec les lignes d'écritures associées
  let queryEcritures = supabase
    .from("ecritures_analytiques")
    .select("*, centre:centres_analytiques(id, code, libelle, axe_id), ligne:lignes_ecritures(id, compte_numero, debit, credit, ecriture_id)");

  const { data: ecrituresAnalytiques } = await queryEcritures;

  // Aussi récupérer les ventilations
  const { data: ventilations } = await supabase
    .from("ventilations_analytiques")
    .select("*, centre:centres_analytiques(id, code, libelle, axe_id)");

  // Calculer la rentabilité par centre
  const resultats: RentabiliteCentre[] = centresFiltres.map((centre: any) => {
    let totalProduits = 0;
    let totalCharges = 0;

    // Agrégation depuis ecritures_analytiques
    if (ecrituresAnalytiques) {
      const ecrituresCentre = ecrituresAnalytiques.filter(
        (ea: any) => ea.centre_id === centre.id
      );
      for (const ea of ecrituresCentre) {
        if (ea.ligne) {
          const compteNum = String(ea.ligne.compte_numero || "");
          const classe = parseInt(compteNum.charAt(0));
          if (classe === 7) {
            totalProduits += Number(ea.montant || ea.ligne.credit || 0);
          } else if (classe === 6) {
            totalCharges += Number(ea.montant || ea.ligne.debit || 0);
          }
        }
      }
    }

    // Agrégation depuis ventilations_analytiques
    if (ventilations) {
      const ventilationsCentre = ventilations.filter(
        (v: any) => v.centre_id === centre.id
      );
      for (const v of ventilationsCentre) {
        if (v.sens === "credit") {
          totalProduits += Number(v.montant || 0);
        } else if (v.sens === "debit") {
          totalCharges += Number(v.montant || 0);
        }
      }
    }

    // Aussi utiliser le champ analytique_id des lignes_ecritures directement
    // (pour les écritures affectées directement à un centre)

    const marge = totalProduits - totalCharges;
    const tauxMarge = totalProduits > 0 ? (marge / totalProduits) * 100 : 0;

    return {
      centre_id: centre.id,
      centre_code: centre.code,
      centre_libelle: centre.libelle,
      axe_type: centre.axe?.type || "",
      total_produits: totalProduits,
      total_charges: totalCharges,
      marge,
      taux_marge: Math.round(tauxMarge * 100) / 100,
    };
  });

  return resultats;
}

/**
 * Récupérer les écritures analytiques d'un centre spécifique
 */
export async function getEcrituresCentre(centreId: number) {
  const { data, error } = await supabase
    .from("ecritures_analytiques")
    .select("*, centre:centres_analytiques(code, libelle), ligne:lignes_ecritures(id, compte_numero, libelle, debit, credit, ecriture:ecritures_comptables(date_ecriture, numero_piece, libelle))")
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data;
}

/**
 * Créer une ventilation analytique
 */
export async function creerVentilationAnalytique(params: {
  ecriture_id: number;
  ligne_ecriture_id: number;
  centre_id: number;
  montant: number;
  sens: "debit" | "credit";
}) {
  const { data, error } = await supabase
    .from("ventilations_analytiques")
    .insert(params)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
