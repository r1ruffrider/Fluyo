import { createSupabaseServerClient } from "./server";

export interface VerifiedWebIdentity {
  accessToken: string;
  email: string | null;
  id: string;
}

export async function getVerifiedWebIdentity(): Promise<VerifiedWebIdentity | null> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const subject = claims?.sub;
  const email = claims?.email;

  if (claimsError || typeof subject !== "string") {
    return null;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    email: typeof email === "string" ? email : null,
    id: subject,
  };
}
