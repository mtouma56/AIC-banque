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
import {
  getAxesAnalytiques,
  getCentresAnalytiques,
  genererRentabiliteParAxe,
  getEcrituresCentre,
  creerVentilationAnalytique,
} from "./analytique";
import { genererHTMLBulletinPaie, type BulletinPaieData } from "./pdf-bulletin";

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

    // Export PDF bulletin de paie (renvoie le HTML pour impression/PDF)
    exportBulletinPDF: publicProcedure
      .input(z.object({ bulletinId: z.string() }))
      .query(async ({ input }) => {
        // Récupérer le bulletin
        const { data: bulletin, error: bulErr } = await supabase
          .from("bulletins_paie")
          .select("*, employe:employes(matricule, nom, prenom, poste, departement, date_embauche, situation_familiale, enfants_a_charge)")
          .eq("id", input.bulletinId)
          .single();
        if (bulErr || !bulletin) throw new Error("Bulletin non trouvé");

        // Récupérer les paramètres entreprise
        const { data: params } = await supabase.from("parametres_entreprise").select("*");
        const getParam = (cle: string) => params?.find((p: any) => p.cle === cle)?.valeur || "";

        const pdfData: BulletinPaieData = {
          entreprise: {
            raison_sociale: getParam("raison_sociale") || "AIC - Africa Invest Capital",
            forme_juridique: getParam("forme_juridique") || "SARL",
            rccm: getParam("rccm") || "",
            ncc: getParam("ncc") || "",
            adresse: getParam("adresse") || "Abidjan, Côte d'Ivoire",
            telephone: getParam("telephone") || "",
          },
          employe: {
            matricule: (bulletin as any).employe?.matricule || "",
            nom: (bulletin as any).employe?.nom || "",
            prenom: (bulletin as any).employe?.prenom || "",
            poste: (bulletin as any).employe?.poste || "",
            departement: (bulletin as any).employe?.departement,
            date_embauche: (bulletin as any).employe?.date_embauche || "",
            situation_familiale: (bulletin as any).employe?.situation_familiale || "celibataire",
            enfants_a_charge: (bulletin as any).employe?.enfants_a_charge || 0,
          },
          mois: (bulletin as any).mois,
          annee: (bulletin as any).annee,
          salaire_brut: Number((bulletin as any).salaire_brut) || 0,
          primes: Number((bulletin as any).primes) || 0,
          brut_total: Number((bulletin as any).brut_total) || 0,
          cnps_salarie: Number((bulletin as any).cnps_salarie) || 0,
          its_net: Number((bulletin as any).its_net) || 0,
          igr: Number((bulletin as any).igr) || 0,
          contribution_nationale: Number((bulletin as any).contribution_nationale) || 0,
          total_retenues: Number((bulletin as any).total_retenues) || 0,
          net_a_payer: Number((bulletin as any).net_a_payer) || 0,
          cnps_patron: Number((bulletin as any).cnps_patron) || 0,
          contributions_employeur: Number((bulletin as any).contributions_employeur) || 0,
          cout_total: Number((bulletin as any).cout_total) || 0,
          nombre_parts: Number((bulletin as any).nombre_parts) || 1,
          ricf: Number((bulletin as any).ricf) || 0,
        };

        return { html: genererHTMLBulletinPaie(pdfData) };
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

  // ===== CONGÉS =====
  conges: router({
    getAll: publicProcedure.query(async () => {
      const { data, error } = await supabase.from("conges").select("*, employe:employes(nom, prenom, matricule)").order("created_at", { ascending: false });
      if (error) return [];
      return data;
    }),
    create: protectedProcedure
      .input(z.object({
        employe_id: z.number(),
        type_conge: z.enum(["annuel", "maladie", "maternite", "special", "sans_solde"]),
        date_debut: z.string(),
        date_fin: z.string(),
        nombre_jours: z.number(),
        motif: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase.from("conges").insert({ ...input, statut: "en_attente" }).select().single();
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Demande de congé", module: "RH", details: `${input.type_conge} du ${input.date_debut} au ${input.date_fin} (${input.nombre_jours} jours)`, ip_address: null });
        return data;
      }),
    valider: protectedProcedure
      .input(z.object({ id: z.number(), statut: z.enum(["approuve", "refuse"]) }))
      .mutation(async ({ input, ctx }) => {
        const { error } = await supabase.from("conges").update({ statut: input.statut, valide_par: ctx.user.name, date_validation: new Date().toISOString() }).eq("id", input.id);
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: `Congé ${input.statut}`, module: "RH", details: `Congé #${input.id}`, ip_address: null });
        return { success: true };
      }),
  }),

  // ===== PRÊTS =====
  prets: router({
    getAll: publicProcedure.query(async () => {
      const { data, error } = await supabase.from("prets").select("*, employe:employes(nom, prenom, matricule)").order("created_at", { ascending: false });
      if (error) return [];
      return data;
    }),
    create: protectedProcedure
      .input(z.object({
        employe_id: z.number(),
        montant: z.number(),
        montant_mensualite: z.number(),
        nombre_mensualites: z.number(),
        motif: z.string().optional(),
        date_debut: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase.from("prets").insert({ ...input, mensualites_restantes: input.nombre_mensualites, statut: "en_cours" }).select().single();
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Nouveau prêt employé", module: "RH", details: `Montant: ${input.montant.toLocaleString("fr-FR")} FCFA - ${input.nombre_mensualites} mensualités`, ip_address: null });
        return data;
      }),
  }),

  // ===== PARAMÈTRES ENTREPRISE =====
  parametres: router({
    getAll: publicProcedure.query(async () => {
      const { data, error } = await supabase.from("parametres_entreprise").select("*");
      if (error) return [];
      return data;
    }),
    update: protectedProcedure
      .input(z.object({ cle: z.string(), valeur: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { error } = await supabase.from("parametres_entreprise").upsert({ cle: input.cle, valeur: input.valeur, updated_at: new Date().toISOString() }, { onConflict: "cle" });
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Modification paramètre", module: "Paramètres", details: `${input.cle} = ${input.valeur}`, ip_address: null });
        return { success: true };
      }),
    updateBatch: protectedProcedure
      .input(z.array(z.object({ cle: z.string(), valeur: z.string() })))
      .mutation(async ({ input, ctx }) => {
        for (const param of input) {
          await supabase.from("parametres_entreprise").upsert({ cle: param.cle, valeur: param.valeur, updated_at: new Date().toISOString() }, { onConflict: "cle" });
        }
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Mise à jour paramètres", module: "Paramètres", details: `${input.length} paramètres modifiés`, ip_address: null });
        return { success: true };
      }),
  }),

  // ===== COMPTES BANCAIRES =====
  comptesBancaires: router({
    getAll: publicProcedure.query(async () => {
      const { data, error } = await supabase.from("comptes_bancaires").select("*").order("code_compte");
      if (error) return [];
      return data;
    }),
    create: protectedProcedure
      .input(z.object({
        code_compte: z.string(),
        libelle: z.string(),
        banque: z.string(),
        numero_compte: z.string().optional(),
        iban: z.string().optional(),
        swift_bic: z.string().optional(),
        agence: z.string().optional(),
        solde_initial: z.number().default(0),
        devise: z.string().default("XOF"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase.from("comptes_bancaires").insert(input).select().single();
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Création compte bancaire", module: "Paramètres", details: `${input.banque} - ${input.libelle}`, ip_address: null });
        return data;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code_compte: z.string().optional(),
        libelle: z.string().optional(),
        banque: z.string().optional(),
        numero_compte: z.string().optional(),
        iban: z.string().optional(),
        swift_bic: z.string().optional(),
        agence: z.string().optional(),
        solde_initial: z.number().optional(),
        is_active: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const { error } = await supabase.from("comptes_bancaires").update(updates).eq("id", id);
        if (error) throw new Error(error.message);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { error } = await supabase.from("comptes_bancaires").delete().eq("id", input.id);
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Suppression compte bancaire", module: "Paramètres", details: `Compte #${input.id}`, ip_address: null });
        return { success: true };
      }),
  }),

  // ===== RAPPROCHEMENT BANCAIRE =====
  rapprochement: router({
    getAll: publicProcedure.query(async () => {
      const { data, error } = await supabase.from("rapprochement_bancaire").select("*").order("date_rapprochement", { ascending: false });
      if (error) return [];
      return data;
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { data: rapprochement } = await supabase.from("rapprochement_bancaire").select("*").eq("id", input.id).single();
        const { data: lignes } = await supabase.from("lignes_rapprochement").select("*").eq("rapprochement_id", input.id).order("date_operation");
        return { rapprochement, lignes: lignes || [] };
      }),
    create: protectedProcedure
      .input(z.object({
        compte_banque: z.string(),
        date_rapprochement: z.string(),
        solde_comptable: z.number(),
        solde_releve: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const ecart = input.solde_releve - input.solde_comptable;
        const { data, error } = await supabase.from("rapprochement_bancaire").insert({ ...input, ecart, statut: "en_cours", created_by: ctx.user.id.toString() }).select().single();
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Création rapprochement", module: "Banque", details: `Compte ${input.compte_banque} - Écart: ${ecart.toLocaleString("fr-FR")} FCFA`, ip_address: null });
        return data;
      }),
    addLigne: protectedProcedure
      .input(z.object({
        rapprochement_id: z.number(),
        date_operation: z.string(),
        libelle: z.string(),
        montant: z.number(),
        sens: z.enum(["debit", "credit"]),
        ecriture_id: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { data, error } = await supabase.from("lignes_rapprochement").insert(input).select().single();
        if (error) throw new Error(error.message);
        return data;
      }),
    pointerLigne: protectedProcedure
      .input(z.object({ id: z.number(), pointe: z.boolean() }))
      .mutation(async ({ input }) => {
        const { error } = await supabase.from("lignes_rapprochement").update({ pointe: input.pointe, date_pointage: input.pointe ? new Date().toISOString().split("T")[0] : null }).eq("id", input.id);
        if (error) throw new Error(error.message);
        return { success: true };
      }),
    valider: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { error } = await supabase.from("rapprochement_bancaire").update({ statut: "valide" }).eq("id", input.id);
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Validation rapprochement", module: "Banque", details: `Rapprochement #${input.id} validé`, ip_address: null });
        return { success: true };
      }),
  }),

  // ===== CLÔTURES COMPTABLES =====
  clotures: router({
    getAll: publicProcedure.query(async () => {
      const { data, error } = await supabase.from("clotures_comptables").select("*").order("annee", { ascending: false }).order("mois", { ascending: false });
      if (error) return [];
      return data;
    }),
    creerClotureMensuelle: protectedProcedure
      .input(z.object({ mois: z.number().min(1).max(12), annee: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Vérifier qu'il n'y a pas déjà une clôture pour ce mois
        const { data: existing } = await supabase.from("clotures_comptables").select("id").eq("mois", input.mois).eq("annee", input.annee).eq("type_cloture", "mensuelle");
        if (existing && existing.length > 0) throw new Error(`Le mois ${input.mois}/${input.annee} est déjà clôturé`);

        // Calculer les totaux du mois
        const dateDebut = `${input.annee}-${String(input.mois).padStart(2, "0")}-01`;
        const dateFin = `${input.annee}-${String(input.mois).padStart(2, "0")}-${new Date(input.annee, input.mois, 0).getDate()}`;
        const { data: ecritures } = await supabase.from("lignes_ecritures").select("debit, credit, ecriture:ecritures_comptables!inner(date_ecriture)").gte("ecriture.date_ecriture", dateDebut).lte("ecriture.date_ecriture", dateFin);

        let totalDebit = 0, totalCredit = 0;
        if (ecritures) {
          for (const e of ecritures) { totalDebit += Number((e as any).debit || 0); totalCredit += Number((e as any).credit || 0); }
        }

        const { data, error } = await supabase.from("clotures_comptables").insert({
          type_cloture: "mensuelle", mois: input.mois, annee: input.annee,
          date_cloture: new Date().toISOString().split("T")[0],
          total_debit: totalDebit, total_credit: totalCredit, resultat: totalCredit - totalDebit,
          statut: "cloturee", cloture_par: ctx.user.name || ctx.user.id.toString(),
        }).select().single();
        if (error) throw new Error(error.message);

        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Clôture mensuelle", module: "Comptabilité", details: `${input.mois}/${input.annee} - Débit: ${totalDebit.toLocaleString("fr-FR")} / Crédit: ${totalCredit.toLocaleString("fr-FR")}`, ip_address: null });
        return data;
      }),
    creerClotureAnnuelle: protectedProcedure
      .input(z.object({ annee: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { data: existing } = await supabase.from("clotures_comptables").select("id").eq("annee", input.annee).eq("type_cloture", "annuelle");
        if (existing && existing.length > 0) throw new Error(`L'exercice ${input.annee} est déjà clôturé`);

        const dateDebut = `${input.annee}-01-01`;
        const dateFin = `${input.annee}-12-31`;
        const { data: ecritures } = await supabase.from("lignes_ecritures").select("debit, credit, ecriture:ecritures_comptables!inner(date_ecriture)").gte("ecriture.date_ecriture", dateDebut).lte("ecriture.date_ecriture", dateFin);

        let totalDebit = 0, totalCredit = 0;
        if (ecritures) {
          for (const e of ecritures) { totalDebit += Number((e as any).debit || 0); totalCredit += Number((e as any).credit || 0); }
        }

        const { data, error } = await supabase.from("clotures_comptables").insert({
          type_cloture: "annuelle", mois: 12, annee: input.annee,
          date_cloture: new Date().toISOString().split("T")[0],
          total_debit: totalDebit, total_credit: totalCredit, resultat: totalCredit - totalDebit,
          statut: "cloturee", cloture_par: ctx.user.name || ctx.user.id.toString(),
        }).select().single();
        if (error) throw new Error(error.message);

        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Clôture annuelle", module: "Comptabilité", details: `Exercice ${input.annee} - Résultat: ${(totalCredit - totalDebit).toLocaleString("fr-FR")} FCFA`, ip_address: null });
        return data;
      }),
  }),

  // ===== DÉCLARATIONS FISCALES =====
  declarations: router({
    getAll: publicProcedure.query(async () => {
      const { data, error } = await supabase.from("declarations_fiscales").select("*").order("date_echeance", { ascending: false });
      if (error) return [];
      return data;
    }),
    create: protectedProcedure
      .input(z.object({
        type_declaration: z.string(),
        periode_debut: z.string(),
        periode_fin: z.string(),
        montant_base: z.number(),
        montant_impot: z.number(),
        date_echeance: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase.from("declarations_fiscales").insert({ ...input, statut: "brouillon", created_by: ctx.user.id.toString() }).select().single();
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Création déclaration", module: "Fiscalité", details: `${input.type_declaration} - ${input.montant_impot.toLocaleString("fr-FR")} FCFA`, ip_address: null });
        return data;
      }),
    soumettre: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { error } = await supabase.from("declarations_fiscales").update({ statut: "soumise", date_soumission: new Date().toISOString().split("T")[0] }).eq("id", input.id);
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Soumission déclaration", module: "Fiscalité", details: `Déclaration #${input.id} soumise`, ip_address: null });
        return { success: true };
      }),
    marquerPayee: protectedProcedure
      .input(z.object({ id: z.number(), reference_paiement: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { error } = await supabase.from("declarations_fiscales").update({ statut: "payee", reference_paiement: input.reference_paiement }).eq("id", input.id);
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Paiement déclaration", module: "Fiscalité", details: `Déclaration #${input.id} payée - Réf: ${input.reference_paiement}`, ip_address: null });
        return { success: true };
      }),
  }),

  // ===== COMPTABILITÉ ANALYTIQUE =====
  analytique: router({
    getAxes: publicProcedure.query(async () => {
      return await getAxesAnalytiques();
    }),
    getCentres: publicProcedure
      .input(z.object({ axeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await getCentresAnalytiques(input?.axeId);
      }),
    getRentabilite: publicProcedure
      .input(z.object({
        axeType: z.string().optional(),
        dateDebut: z.string().optional(),
        dateFin: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await genererRentabiliteParAxe(input?.axeType, input?.dateDebut, input?.dateFin);
      }),
    getEcrituresCentre: publicProcedure
      .input(z.object({ centreId: z.number() }))
      .query(async ({ input }) => {
        return await getEcrituresCentre(input.centreId);
      }),
    createCentre: protectedProcedure
      .input(z.object({
        axe_id: z.number(),
        code: z.string(),
        libelle: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase
          .from("centres_analytiques")
          .insert({ ...input, is_active: true })
          .select()
          .single();
        if (error) throw new Error(error.message);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Création centre analytique", module: "Analytique", details: `${input.code} - ${input.libelle}`, ip_address: null });
        return data;
      }),
    createVentilation: protectedProcedure
      .input(z.object({
        ecriture_id: z.number(),
        ligne_ecriture_id: z.number(),
        centre_id: z.number(),
        montant: z.number(),
        sens: z.enum(["debit", "credit"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await creerVentilationAnalytique(input);
        await logAudit({ utilisateur_id: ctx.user.id.toString(), utilisateur_code: ctx.user.name || "unknown", action: "Ventilation analytique", module: "Analytique", details: `Centre ${input.centre_id} - ${input.montant.toLocaleString("fr-FR")} FCFA (${input.sens})`, ip_address: null });
        return result;
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
