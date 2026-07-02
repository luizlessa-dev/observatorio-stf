import { supabase } from "./supabase";

export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getAssinatura(email: string) {
  const { data } = await supabase
    .from("stf_assinaturas")
    .select("plano, status, vigente_ate")
    .eq("email", email)
    .eq("status", "ativa")
    .maybeSingle();
  return data;
}
