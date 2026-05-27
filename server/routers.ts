import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  supabase,
  logAudit,
  getPlanComptable,
  getJournaux,
  getEcritures,
  getTiers,
  getFacturesVentes,
  getBonsCommande,
  getArticles,
  getEmployes,
  getAuditTrail,
  getNotifications,
} from "./supabase";
import {
  calculerPaie,
  calculerTVA,
  calculerHTdepuisTTC,
  verifierEquilibreEcriture,
  validerCompteOHADA,
  getNombreParts,
  TVA_TAUX_NORMAL,
  type CalculPaieInput,
} from "./fiscalite-ci";
import {
  genererGrandLivre,
  genererBalance,
  genererBilan,
  genererCompteResultat,
  genererBalanceAgee,
} from "./comptabilite";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== COMPTABILITÉ =====
  comptabilite: router({
    getPlanComptable: publicProcedure.query(async () => {
      return await getPlanComptable();
    }),
    getJournaux: publicProcedure.query(async () => {
      return await getJournaux();
    }),
    getEcritures: publicProcedure
      .input(z.object({ journalId: z.string().optional(), exerciceId: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await getEcritures(input?.journalId, input?.exerciceId);
      }),
    createEcriture: protectedProcedure
      .input(
        z.object({
          journal_id: z.string(),
          date_ecriture: z.string(),
          numero_piece: z.string(),
          libelle: z.string(),
          lignes: z.array(
            z.object({
              compte_numero: z.string(),
              libelle: z.string(),
              debit: z.number(),
              credit: z.number(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // VALIDATION 1: Vérifier l'équilibre débit = crédit (SYSCOHADA)
        const equilibre = verifierEquilibreEcriture(input.lignes);
        if (!equilibre.equilibre) {
          throw new Error(
            `Écriture déséquilibrée : Débit = ${equilibre.total_debit.toLocaleString("fr-FR")} FCFA, Crédit = ${equilibre.total_credit.toLocaleString("fr-FR")} FCFA. Écart : ${equilibre.ecart.toLocaleString("fr-FR")} FCFA`
          );
        }

        // VALIDATION 2: Vérifier les numéros de compte OHADA
        for (const ligne of input.lignes) {
          const validation = validerCompteOHADA(ligne.compte_numero);
          if (!validation.valide) {
            throw new Error(`Compte ${ligne.compte_numero} invalide : ${validation.message}`);
          }
        }

        // VALIDATION 3: Au moins 2 lignes
        if (input.lignes.length < 2) {
          throw new Error("Une écriture comptable doit avoir au moins 2 lignes");
        }

        const { data, error } = await supabase
          .from("ecritures_comptables")
          .insert({
            journal_id: input.journal_id,
            date_ecriture: input.date_ecriture,
            numero_piece: input.numero_piece,
            libelle: input.libelle,
            statut: "brouillon",
            created_by: ctx.user.id.toString(),
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        if (data) {
          const lignes = input.lignes.map((l) => ({
            ecriture_id: data.id,
            compte_numero: l.compte_numero,
            libelle: l.libelle,
            debit: l.debit,
            credit: l.credit,
          }));
          await supabase.from("lignes_ecritures").insert(lignes);
        }

        await logAudit({
          utilisateur_id: ctx.user.id.toString(),
          utilisateur_code: ctx.user.name || "unknown",
          action: "Création écriture",
          module: "Comptabilité",
          details: `Écriture ${input.numero_piece} - ${input.libelle} (${equilibre.total_debit.toLocaleString("fr-FR")} FCFA)`,
          ip_address: null,
        });

        return data;
      }),
    createCompte: protectedProcedure
      .input(
        z.object({
          numero_compte: z.string(),
          libelle: z.string(),
          classe: z.number(),
          nature: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Validation OHADA
        const validation = validerCompteOHADA(input.numero_compte);
        if (!validation.valide) {
          throw new Error(`Numéro de compte invalide : ${validation.message}`);
        }

        const { data, error } = await supabase
          .from("plan_comptable")
          .insert(input)
          .select()
          .single();

        if (error) throw new Error(error.message);

        await logAudit({
          utilisateur_id: ctx.user.id.toString(),
          utilisateur_code: ctx.user.name || "unknown",
          action: "Création compte",
          module: "Comptabilité",
          details: `Compte ${input.numero_compte} - ${input.libelle} (${validation.message})`,
          ip_address: null,
        });

        return data;
      }),

    // Grand Livre
    getGrandLivre: publicProcedure
      .input(
        z.object({
          dateDebut: z.string().optional(),
          dateFin: z.string().optional(),
          compteDebut: z.string().optional(),
          compteFin: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await genererGrandLivre(
          input?.dateDebut,
          input?.dateFin,
          input?.compteDebut,
          input?.compteFin
        );
      }),

    // Balance Générale
    getBalance: publicProcedure
      .input(
        z.object({
          dateDebut: z.string().optional(),
          dateFin: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await genererBalance(input?.dateDebut, input?.dateFin);
      }),

    // Bilan SYSCOHADA
    getBilan: publicProcedure
      .input(z.object({ dateFin: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await genererBilan(input?.dateFin);
      }),

    // Compte de Résultat SYSCOHADA
    getCompteResultat: publicProcedure
      .input(
        z.object({
          dateDebut: z.string().optional(),
          dateFin: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await genererCompteResultat(input?.dateDebut, input?.dateFin);
      }),

    // Valider une écriture (changer statut)
    validerEcriture: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { error } = await supabase
          .from("ecritures_comptables")
          .update({ statut: "validee" })
          .eq("id", input.id);

        if (error) throw new Error(error.message);

        await logAudit({
          utilisateur_id: ctx.user.id.toString(),
          utilisateur_code: ctx.user.name || "unknown",
          action: "Validation écriture",
          module: "Comptabilité",
          details: `Écriture ${input.id} validée`,
          ip_address: null,
        });

        return { success: true };
      }),
  }),

  // ===== TIERS (AUXILIAIRE) =====
  tiers: router({
    getAll: publicProcedure
      .input(z.object({ type: z.enum(["client", "fournisseur"]).optional() }).optional())
      .query(async ({ input }) => {
        return await getTiers(input?.type);
      }),
    create: protectedProcedure
      .input(
        z.object({
          type_tiers: z.enum(["client", "fournisseur"]),
          code_tiers: z.string(),
          raison_sociale: z.string(),
          adresse: z.string().optional(),
          telephone: z.string().optional(),
          email: z.string().optional(),
          numero_compte: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase
          .from("tiers")
          .insert(input)
          .select()
          .single();

        if (error) throw new Error(error.message);

        await logAudit({
          utilisateur_id: ctx.user.id.toString(),
          utilisateur_code: ctx.user.name || "unknown",
          action: `Création ${input.type_tiers}`,
          module: "Auxiliaire",
          details: `${input.raison_sociale} (${input.code_tiers})`,
          ip_address: null,
        });

        return data;
      }),
    getBalanceAgee: publicProcedure
      .input(z.object({ type: z.enum(["client", "fournisseur"]) }))
      .query(async ({ input }) => {
        return await genererBalanceAgee(input.type);
      }),
  }),

  // ===== VENTES =====
  ventes: router({
    getFactures: publicProcedure.query(async () => {
      return await getFacturesVentes();
    }),
    createFacture: protectedProcedure
      .input(
        z.object({
          numero_facture: z.string(),
          client_id: z.string(),
          date_facture: z.string(),
          montant_ht: z.number(),
          tva: z.number().default(18),
          montant_ttc: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Vérification TVA 18%
        const tvaCalculee = calculerTVA(input.montant_ht);
        if (Math.abs(input.montant_ttc - tvaCalculee.montant_ttc) > 1) {
          // Tolérance de 1 FCFA pour arrondis
          throw new Error(
            `Montant TTC incorrect. HT: ${input.montant_ht.toLocaleString("fr-FR")} + TVA 18%: ${tvaCalculee.tva.toLocaleString("fr-FR")} = TTC attendu: ${tvaCalculee.montant_ttc.toLocaleString("fr-FR")} FCFA`
          );
        }

        const { data, error } = await supabase
          .from("factures_ventes")
          .insert({
            ...input,
            statut: "brouillon",
            created_by: ctx.user.id.toString(),
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        await logAudit({
          utilisateur_id: ctx.user.id.toString(),
          utilisateur_code: ctx.user.name || "unknown",
          action: "Création facture",
          module: "Ventes",
          details: `Facture ${input.numero_facture} - ${input.montant_ttc.toLocaleString("fr-FR")} FCFA TTC`,
          ip_address: null,
        });

        return data;
      }),
    // Calculer TVA
    calculerTVA: publicProcedure
      .input(z.object({ montant_ht: z.number() }))
      .query(({ input }) => {
        return calculerTVA(input.montant_ht);
      }),
  }),

  // ===== ACHATS =====
  achats: router({
    getBonsCommande: publicProcedure.query(async () => {
      return await getBonsCommande();
    }),
    createBonCommande: protectedProcedure
      .input(
        z.object({
          numero_bc: z.string(),
          fournisseur_id: z.string(),
          date_commande: z.string(),
          montant_ht: z.number(),
          montant_ttc: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase
          .from("bons_commande")
          .insert({
            ...input,
            statut: "brouillon",
            etape_validation: "controle_operationnel",
            created_by: ctx.user.id.toString(),
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        await logAudit({
          utilisateur_id: ctx.user.id.toString(),
          utilisateur_code: ctx.user.name || "unknown",
          action: "Création BC",
          module: "Achats",
          details: `BC ${input.numero_bc} - ${input.montant_ttc.toLocaleString("fr-FR")} FCFA`,
          ip_address: null,
        });

        return data;
      }),
    validerEtape: protectedProcedure
      .input(
        z.object({
          bonCommandeId: z.string(),
          etape: z.enum([
            "controle_operationnel",
            "validation_financiere",
            "validation_hierarchique",
            "autorisation_paiement",
          ]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const nextEtape: Record<string, string> = {
          controle_operationnel: "validation_financiere",
          validation_financiere: "validation_hierarchique",
          validation_hierarchique: "autorisation_paiement",
          autorisation_paiement: "valide",
        };

        const { error } = await supabase
          .from("bons_commande")
          .update({ etape_validation: nextEtape[input.etape] || "valide" })
          .eq("id", input.bonCommandeId);

        if (error) throw new Error(error.message);

        await logAudit({
          utilisateur_id: ctx.user.id.toString(),
          utilisateur_code: ctx.user.name || "unknown",
          action: `Validation ${input.etape}`,
          module: "Achats",
          details: `BC ${input.bonCommandeId}`,
          ip_address: null,
        });

        return { success: true };
      }),
  }),

  // ===== STOCK =====
  stock: router({
    getArticles: publicProcedure.query(async () => {
      return await getArticles();
    }),
    createArticle: protectedProcedure
      .input(
        z.object({
          code_article: z.string(),
          designation: z.string(),
          categorie_id: z.string().optional(),
          unite: z.string().default("unité"),
          prix_achat: z.number().default(0),
          prix_vente: z.number().default(0),
          stock_actuel: z.number().default(0),
          stock_minimum: z.number().default(0),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase
          .from("articles")
          .insert(input)
          .select()
          .single();

        if (error) throw new Error(error.message);

        await logAudit({
          utilisateur_id: ctx.user.id.toString(),
          utilisateur_code: ctx.user.name || "unknown",
          action: "Création article",
          module: "Stock",
          details: `${input.designation} (${input.code_article})`,
          ip_address: null,
        });

        return data;
      }),
    getCategories: publicProcedure.query(async () => {
      const { data, error } = await supabase
        .from("categories_articles")
        .select("*")
        .order("nom");
      if (error) return [];
      return data;
    }),
  }),

  // ===== RH & PAIE =====
  rh: router({
    getEmployes: publicProcedure.query(async () => {
      return await getEmployes();
    }),
    createEmploye: protectedProcedure
      .input(
        z.object({
          matricule: z.string(),
          nom: z.string(),
          prenom: z.string(),
          poste: z.string(),
          departement: z.string().optional(),
          date_embauche: z.string(),
          salaire_base: z.number(),
          situation_familiale: z.enum(["celibataire", "marie", "veuf", "divorce"]).default("celibataire"),
          enfants_a_charge: z.number().default(0),
          telephone: z.string().optional(),
          email: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase
          .from("employes")
          .insert({ ...input, statut: "actif" })
          .select()
          .single();

        if (error) throw new Error(error.message);

        await logAudit({
          utilisateur_id: ctx.user.id.toString(),
          utilisateur_code: ctx.user.name || "unknown",
          action: "Création employé",
          module: "RH",
          details: `${input.nom} ${input.prenom} (${input.matricule})`,
          ip_address: null,
        });

        return data;
      }),

    // Calcul bulletin de paie
    calculerBulletinPaie: publicProcedure
      .input(
        z.object({
          salaire_brut: z.number(),
          situation_familiale: z.object({
            statut: z.enum(["celibataire", "marie", "veuf", "divorce"]),
            enfants_a_charge: z.number(),
          }),
          est_expatrie: z.boolean().default(false),
          primes: z.number().default(0),
          avantages_nature: z.number().default(0),
          pret_mensualite: z.number().default(0),
          taux_at: z.number().optional(),
        })
      )
      .query(({ input }) => {
        return calculerPaie(input as CalculPaieInput);
      }),

    // Générer un bulletin de paie et le sauvegarder
    genererBulletinPaie: protectedProcedure
      .input(
        z.object({
          employe_id: z.string(),
          mois: z.number().min(1).max(12),
          annee: z.number(),
          primes: z.number().default(0),
          avantages_nature: z.number().default(0),
          heures_sup: z.number().default(0),
          pret_mensualite: z.number().default(0),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Récupérer l'employé
        const { data: employe, error: empError } = await supabase
          .from("employes")
          .select("*")
          .eq("id", input.employe_id)
          .single();

        if (empError || !employe) throw new Error("Employé non trouvé");

        // Calculer la paie
        const resultatPaie = calculerPaie({
          salaire_brut: (employe as any).salaire_base,
          situation_familiale: {
            statut: (employe as any).situation_familiale || "celibataire",
            enfants_a_charge: (employe as any).enfants_a_charge || 0,
          },
          est_expatrie: false,
          primes: input.primes,
          avantages_nature: input.avantages_nature,
          pret_mensualite: input.pret_mensualite,
        });

        // Sauvegarder le bulletin
        const { data: bulletin, error: bulError } = await supabase
          .from("bulletins_paie")
          .insert({
            employe_id: input.employe_id,
            mois: input.mois,
            annee: input.annee,
            salaire_brut: resultatPaie.salaire_brut,
            primes: resultatPaie.primes,
            brut_total: resultatPaie.brut_total,
            cnps_salarie: resultatPaie.cnps_retraite_salarie,
            its_net: resultatPaie.its_net,
            igr: resultatPaie.igr,
            contribution_nationale: resultatPaie.contribution_nationale,
            total_retenues: resultatPaie.total_cotisations_salariales + resultatPaie.total_impots_salarie,
            net_a_payer: resultatPaie.salaire_net,
            cnps_patron: resultatPaie.cnps_retraite_patron + resultatPaie.cnps_prestations_familiales + resultatPaie.cnps_accident_travail,
            contributions_employeur: resultatPaie.contributions_employeur,
            cout_total: resultatPaie.cout_total_employeur,
            nombre_parts: resultatPaie.nombre_parts,
            ricf: resultatPaie.ricf,
            created_by: ctx.user.id.toString(),
          })
          .select()
          .single();

        if (bulError) throw new Error(bulError.message);

        await logAudit({
          utilisateur_id: ctx.user.id.toString(),
          utilisateur_code: ctx.user.name || "unknown",
          action: "Génération bulletin de paie",
          module: "RH",
          details: `${(employe as any).nom} ${(employe as any).prenom} - ${input.mois}/${input.annee} - Net: ${resultatPaie.salaire_net.toLocaleString("fr-FR")} FCFA`,
          ip_address: null,
        });

        return { bulletin, detail: resultatPaie };
      }),

    // Récupérer les bulletins de paie
    getBulletins: publicProcedure
      .input(
        z.object({
          employe_id: z.string().optional(),
          mois: z.number().optional(),
          annee: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        let query = supabase.from("bulletins_paie").select("*, employe:employes(nom, prenom, matricule)");
        if (input?.employe_id) query = query.eq("employe_id", input.employe_id);
        if (input?.mois) query = query.eq("mois", input.mois);
        if (input?.annee) query = query.eq("annee", input.annee);
        const { data, error } = await query.order("annee", { ascending: false }).order("mois", { ascending: false });
        if (error) return [];
        return data;
      }),
  }),

  // ===== AUDIT =====
  audit: router({
    getTrail: publicProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        return await getAuditTrail(input?.limit || 50);
      }),
  }),

  // ===== NOTIFICATIONS =====
  notifications: router({
    getAll: publicProcedure
      .input(z.object({ userId: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await getNotifications(input?.userId);
      }),
    markAsRead: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const { error } = await supabase
          .from("notifications")
          .update({ lu: true })
          .eq("id", input.id);

        if (error) throw new Error(error.message);
        return { success: true };
      }),
  }),

  // ===== FISCALITÉ (UTILITAIRES) =====
  fiscalite: router({
    calculerTVA: publicProcedure
      .input(z.object({ montant_ht: z.number(), taux: z.number().optional() }))
      .query(({ input }) => {
        return calculerTVA(input.montant_ht, input.taux ? input.taux / 100 : TVA_TAUX_NORMAL);
      }),
    calculerHTdepuisTTC: publicProcedure
      .input(z.object({ montant_ttc: z.number(), taux: z.number().optional() }))
      .query(({ input }) => {
        return calculerHTdepuisTTC(input.montant_ttc, input.taux ? input.taux / 100 : TVA_TAUX_NORMAL);
      }),
    simulerPaie: publicProcedure
      .input(
        z.object({
          salaire_brut: z.number(),
          statut: z.enum(["celibataire", "marie", "veuf", "divorce"]),
          enfants: z.number().default(0),
          primes: z.number().default(0),
          est_expatrie: z.boolean().default(false),
        })
      )
      .query(({ input }) => {
        return calculerPaie({
          salaire_brut: input.salaire_brut,
          situation_familiale: {
            statut: input.statut,
            enfants_a_charge: input.enfants,
          },
          est_expatrie: input.est_expatrie,
          primes: input.primes,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
