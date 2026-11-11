export type AccountTabKey =
  'wishlist' | 'comparisons' | 'conversations' | 'preferences' | 'profile';

export interface UpdateProfilePayload {
  name: string;
  email: string;
}

export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface UpdatePreferencesPayload {
  budget_default: number | null;
  favourite_categories: string[];
  priorities: string[];
}
