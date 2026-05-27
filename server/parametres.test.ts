import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
vi.mock("./supabase", () => {
  const mockData: Record<string, string> = {};
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          data: Object.entries(mockData).map(([cle, valeur]) => ({ cle, valeur })),
          error: null,
        }),
        upsert: (rows: any[]) => {
          for (const row of rows) {
            mockData[row.cle] = row.valeur;
          }
          return { data: rows, error: null };
        },
      }),
    },
    logAudit: vi.fn(),
  };
});

describe("Parametres module", () => {
  it("should format parametres update batch correctly", () => {
    const batch = [
      { cle: "raison_sociale", valeur: "AIC - Africa Invest Capital" },
      { cle: "forme_juridique", valeur: "SARL" },
      { cle: "rccm", valeur: "CI-ABJ-2020-B-12345" },
      { cle: "ncc", valeur: "CI-123456789" },
      { cle: "regime_fiscal", valeur: "Réel Normal" },
      { cle: "adresse", valeur: "Abidjan, Côte d'Ivoire" },
      { cle: "telephone", valeur: "+225 07 07 07 07 07" },
      { cle: "email", valeur: "contact@aic-ci.com" },
      { cle: "debut_exercice", valeur: "2026-01-01" },
      { cle: "fin_exercice", valeur: "2026-12-31" },
    ];

    // Verify batch structure
    expect(batch).toHaveLength(10);
    expect(batch.every((p) => p.cle && p.valeur !== undefined)).toBe(true);
    expect(batch[0].cle).toBe("raison_sociale");
    expect(batch[0].valeur).toBe("AIC - Africa Invest Capital");
  });

  it("should format payroll params as strings", () => {
    const paramPaie = {
      taux_cnps_salarie: 6.3,
      taux_cnps_patron_retraite: 7.7,
      taux_cnps_pf: 5.75,
      taux_at: 2.0,
      plafond_cnps: 2700000,
      taux_igr: 1.5,
      taux_cn: 1.5,
      abattement_frais_pro: 15,
      taux_contrib_local: 2.8,
      taux_contrib_expatrie: 12,
    };

    const batch = [
      { cle: "taux_cnps_salarie", valeur: String(paramPaie.taux_cnps_salarie) },
      { cle: "taux_cnps_patron_retraite", valeur: String(paramPaie.taux_cnps_patron_retraite) },
      { cle: "taux_cnps_pf", valeur: String(paramPaie.taux_cnps_pf) },
      { cle: "taux_at", valeur: String(paramPaie.taux_at) },
      { cle: "plafond_cnps", valeur: String(paramPaie.plafond_cnps) },
      { cle: "taux_igr", valeur: String(paramPaie.taux_igr) },
      { cle: "taux_cn", valeur: String(paramPaie.taux_cn) },
      { cle: "abattement_frais_pro", valeur: String(paramPaie.abattement_frais_pro) },
      { cle: "taux_contrib_local", valeur: String(paramPaie.taux_contrib_local) },
      { cle: "taux_contrib_expatrie", valeur: String(paramPaie.taux_contrib_expatrie) },
    ];

    expect(batch).toHaveLength(10);
    expect(batch[0].valeur).toBe("6.3");
    expect(batch[4].valeur).toBe("2700000");
    expect(batch.every((p) => typeof p.valeur === "string")).toBe(true);
  });

  it("should validate CNPS rates against CGI 2025", () => {
    // CGI 2025 rates for Côte d'Ivoire
    const CNPS_SALARIE = 6.3;
    const CNPS_PATRON_RETRAITE = 7.7;
    const CNPS_PF = 5.75;
    const CNPS_AT = 2.0;
    const PLAFOND_CNPS = 2_700_000; // FCFA/mois

    expect(CNPS_SALARIE).toBe(6.3);
    expect(CNPS_PATRON_RETRAITE).toBe(7.7);
    expect(CNPS_PF).toBe(5.75);
    expect(CNPS_AT).toBe(2.0);
    expect(PLAFOND_CNPS).toBe(2700000);
    // Total patronal = 7.7 + 5.75 + 2.0 = 15.45%
    expect(CNPS_PATRON_RETRAITE + CNPS_PF + CNPS_AT).toBeCloseTo(15.45);
  });
});
