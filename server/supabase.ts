import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pwmezwmzpxbolxdvygxg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3bWV6d216cHhib2x4ZHZ5Z3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTc1MDcsImV4cCI6MjA5NTQ3MzUwN30.ZbBAKZTQ1MYVwy7aQiBq8S5CTmNcug5xUU26mHZf8vo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper types
export type AppUser = {
  id: string;
  code_utilisateur: string;
  nom: string;
  email: string | null;
  role: "exploitant" | "administrateur";
  actif: boolean;
  created_at: string;
};

export type AuditEntry = {
  id?: string;
  utilisateur_id: string;
  utilisateur_code: string;
  action: string;
  module: string;
  details: string | null;
  ip_address: string | null;
  created_at?: string;
};

// Audit trail helper
export async function logAudit(entry: Omit<AuditEntry, "id" | "created_at">) {
  const { error } = await supabase.from("audit_trail").insert(entry);
  if (error) {
    console.error("[Audit] Failed to log:", error.message);
  }
}

// User authentication (simple code + password)
export async function authenticateUser(code: string, password: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("code_utilisateur", code)
    .eq("actif", true)
    .single();

  if (error || !data) {
    return null;
  }

  // Simple password check (in production, use bcrypt)
  if (data.mot_de_passe !== password) {
    return null;
  }

  return data as AppUser;
}

// Get all users
export async function getUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, code_utilisateur, nom, email, role, actif, created_at")
    .order("code_utilisateur");

  if (error) return [];
  return data;
}

// Plan comptable
export async function getPlanComptable() {
  const { data, error } = await supabase
    .from("plan_comptable")
    .select("*")
    .order("numero_compte");

  if (error) return [];
  return data;
}

// Journaux
export async function getJournaux() {
  const { data, error } = await supabase
    .from("journaux")
    .select("*")
    .order("code");

  if (error) return [];
  return data;
}

// Écritures comptables
export async function getEcritures(journalId?: string, exerciceId?: string) {
  let query = supabase
    .from("ecritures_comptables")
    .select("*")
    .order("date_ecriture", { ascending: false });

  if (journalId) query = query.eq("journal_id", journalId);
  if (exerciceId) query = query.eq("exercice_id", exerciceId);

  const { data, error } = await query;
  if (error) return [];
  return data;
}

// Tiers (clients/fournisseurs)
export async function getTiers(type?: "client" | "fournisseur") {
  let query = supabase.from("tiers").select("*").order("raison_sociale");
  if (type) query = query.eq("type_tiers", type);

  const { data, error } = await query;
  if (error) return [];
  return data;
}

// Factures ventes
export async function getFacturesVentes() {
  const { data, error } = await supabase
    .from("factures_vente")
    .select("*")
    .order("date_facture", { ascending: false });

  if (error) return [];
  return data;
}

// Bons de commande
export async function getBonsCommande() {
  const { data, error } = await supabase
    .from("bons_commande")
    .select("*")
    .order("date_commande", { ascending: false });

  if (error) return [];
  return data;
}

// Articles stock
export async function getArticles() {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("designation");

  if (error) return [];
  return data;
}

// Employés
export async function getEmployes() {
  const { data, error } = await supabase
    .from("employes")
    .select("*")
    .order("matricule");

  if (error) return [];
  return data;
}

// Audit trail
export async function getAuditTrail(limit = 50) {
  const { data, error } = await supabase
    .from("audit_trail")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data;
}

// Notifications
export async function getNotifications(userId?: string) {
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("destinataire_id", userId);

  const { data, error } = await query;
  if (error) return [];
  return data;
}
