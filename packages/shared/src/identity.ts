export interface AuthenticatedIdentity {
  id: string;
  email: string | null;
}

export interface CurrentIdentityResponse {
  identity: AuthenticatedIdentity;
}
