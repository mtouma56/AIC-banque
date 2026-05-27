import { describe, expect, it } from "vitest";
import { calculerPaie, getNombreParts, CNPS, CONTRIBUTIONS_EMPLOYEUR } from "./fiscalite-ci";

describe("Moteur de calcul de paie - Fiscalité CI 2025", () => {
  it("calcule correctement pour un célibataire sans enfants à 1 400 000 FCFA", () => {
    const result = calculerPaie({
      salaire_brut: 1400000,
      situation_familiale: { statut: "celibataire", enfants_a_charge: 0 },
      est_expatrie: false,
    });

    // Vérifications de base
    expect(result.salaire_brut).toBe(1400000);
    expect(result.brut_total).toBe(1400000);
    expect(result.cnps_retraite_salarie).toBeGreaterThan(0);
    expect(result.cnps_retraite_salarie).toBeLessThanOrEqual(1400000 * 0.063);
    expect(result.its_net).toBeGreaterThan(0);
    expect(result.igr).toBe(Math.round(1400000 * 0.015));
    expect(result.contribution_nationale).toBe(Math.round(1400000 * 0.015));
    expect(result.salaire_net).toBeGreaterThan(0);
    expect(result.salaire_net).toBeLessThan(1400000);
    // Net = brut - cotisations - impôts
    expect(result.salaire_net).toBe(
      result.brut_total - result.total_cotisations_salariales - result.total_impots_salarie - result.pret_mensualite
    );
  });

  it("calcule correctement pour un marié avec 2 enfants à 1 500 000 FCFA", () => {
    const result = calculerPaie({
      salaire_brut: 1500000,
      situation_familiale: { statut: "marie", enfants_a_charge: 2 },
      est_expatrie: false,
    });

    expect(result.salaire_brut).toBe(1500000);
    expect(result.cnps_retraite_salarie).toBeGreaterThan(0);
    expect(result.its_net).toBeGreaterThan(0);
    expect(result.ricf).toBeGreaterThan(0); // Marié + 2 enfants = 3 parts, RICF > 0
    expect(result.nombre_parts).toBe(3); // 2 (marié) + 2*0.5
    expect(result.salaire_net).toBeGreaterThan(0);
    expect(result.salaire_net).toBeLessThan(1500000);
  });

  it("applique le plafond CNPS de 2 700 000 FCFA", () => {
    const result = calculerPaie({
      salaire_brut: 5000000,
      situation_familiale: { statut: "celibataire", enfants_a_charge: 0 },
      est_expatrie: false,
    });

    // CNPS plafonnée à 2 700 000 * 6.3%
    expect(result.cnps_retraite_salarie).toBe(Math.round(2700000 * 0.063));
  });

  it("calcule les charges patronales correctement", () => {
    const result = calculerPaie({
      salaire_brut: 1000000,
      situation_familiale: { statut: "celibataire", enfants_a_charge: 0 },
      est_expatrie: false,
    });

    expect(result.cnps_retraite_patron).toBe(Math.round(1000000 * 0.077));
    // PF plafonnée à 70 000
    expect(result.cnps_prestations_familiales).toBe(Math.round(70000 * 0.0575));
    // AT plafonnée à 70 000
    expect(result.cnps_accident_travail).toBe(Math.round(70000 * 0.02));
    expect(result.contributions_employeur).toBe(Math.round(1000000 * 0.028)); // local
  });

  it("applique le taux expatrié pour les contributions employeur", () => {
    const result = calculerPaie({
      salaire_brut: 1000000,
      situation_familiale: { statut: "celibataire", enfants_a_charge: 0 },
      est_expatrie: true,
    });

    expect(result.contributions_employeur).toBe(Math.round(1000000 * 0.12));
  });

  it("le net à payer est toujours positif pour un salaire minimum", () => {
    const result = calculerPaie({
      salaire_brut: 75000,
      situation_familiale: { statut: "celibataire", enfants_a_charge: 0 },
      est_expatrie: false,
    });

    expect(result.salaire_net).toBeGreaterThan(0);
    // Pas d'ITS pour la première tranche (0-75000 = 0%)
    expect(result.its_brut).toBe(0);
    expect(result.its_net).toBe(0);
  });

  it("calcule le nombre de parts correctement", () => {
    expect(getNombreParts({ statut: "celibataire", enfants_a_charge: 0 })).toBe(1);
    expect(getNombreParts({ statut: "marie", enfants_a_charge: 0 })).toBe(2);
    expect(getNombreParts({ statut: "marie", enfants_a_charge: 2 })).toBe(3);
    expect(getNombreParts({ statut: "veuf", enfants_a_charge: 0 })).toBe(1.5);
    expect(getNombreParts({ statut: "veuf", enfants_a_charge: 2 })).toBe(3);
    // Plafond 5 parts
    expect(getNombreParts({ statut: "marie", enfants_a_charge: 10 })).toBe(5);
  });

  it("applique la RICF selon le nombre de parts", () => {
    const result1 = calculerPaie({
      salaire_brut: 1000000,
      situation_familiale: { statut: "celibataire", enfants_a_charge: 0 },
      est_expatrie: false,
    });
    expect(result1.ricf).toBe(0); // 1 part = 0 RICF

    const result2 = calculerPaie({
      salaire_brut: 1000000,
      situation_familiale: { statut: "marie", enfants_a_charge: 2 },
      est_expatrie: false,
    });
    expect(result2.ricf).toBe(22000); // 3 parts = 22 000 FCFA
  });

  it("le coût total employeur = brut + charges patronales", () => {
    const result = calculerPaie({
      salaire_brut: 1500000,
      situation_familiale: { statut: "marie", enfants_a_charge: 1 },
      est_expatrie: false,
    });

    expect(result.cout_total_employeur).toBe(result.brut_total + result.total_charges_patronales);
  });
});
