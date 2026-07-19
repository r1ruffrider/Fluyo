export interface UserProfile {
  id: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentProfileResponse {
  profile: UserProfile | null;
}

export interface UpdateCurrentProfileRequest {
  displayName: string | null;
}
