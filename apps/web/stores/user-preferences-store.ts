"use client";

import { create } from "zustand";

import { fetchWithSession, getStoredSession } from "../lib/auth-client";

export type CookieConsentStatus = "ACCEPTED" | "PENDING" | "REJECTED";

export interface UserNotificationPreferences {
  cookieConsent: CookieConsentStatus;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  marketingEmails: boolean;
  pushNotifications: boolean;
}

interface UserPreferencesState {
  error: string | null;
  hydrated: boolean;
  isSaving: boolean;
  preferences: UserNotificationPreferences;
  hydrate: () => Promise<void>;
  update: (next: Partial<UserNotificationPreferences>) => Promise<void>;
}

const defaultPreferences: UserNotificationPreferences = {
  cookieConsent: "PENDING",
  emailNotifications: true,
  inAppNotifications: true,
  marketingEmails: false,
  pushNotifications: false
};

function normalizePreferences(
  input: Partial<UserNotificationPreferences> | null | undefined
): UserNotificationPreferences {
  return {
    cookieConsent: input?.cookieConsent ?? defaultPreferences.cookieConsent,
    emailNotifications: input?.emailNotifications ?? defaultPreferences.emailNotifications,
    inAppNotifications: input?.inAppNotifications ?? defaultPreferences.inAppNotifications,
    marketingEmails: input?.marketingEmails ?? defaultPreferences.marketingEmails,
    pushNotifications: input?.pushNotifications ?? defaultPreferences.pushNotifications
  };
}

export const useUserPreferencesStore = create<UserPreferencesState>((set, get) => ({
  error: null,
  hydrated: false,
  isSaving: false,
  preferences: defaultPreferences,
  async hydrate() {
    if (!getStoredSession()) {
      set({
        error: null,
        hydrated: true,
        preferences: defaultPreferences
      });
      return;
    }

    try {
      const response = await fetchWithSession("/api/v1/notifications/preferences", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Falha ao carregar preferencias (${response.status}).`);
      }

      const payload = (await response.json()) as {
        preferences?: Partial<UserNotificationPreferences>;
      };

      set({
        error: null,
        hydrated: true,
        preferences: normalizePreferences(payload.preferences)
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Falha ao carregar preferencias.",
        hydrated: true
      });
    }
  },
  async update(next) {
    if (!getStoredSession()) {
      return;
    }

    const previous = get().preferences;
    const optimistic = normalizePreferences({
      ...previous,
      ...next
    });

    set({
      error: null,
      isSaving: true,
      preferences: optimistic
    });

    try {
      const response = await fetchWithSession("/api/v1/notifications/preferences", {
        body: JSON.stringify(next),
        headers: {
          "content-type": "application/json"
        },
        method: "PUT"
      });

      if (!response.ok) {
        throw new Error(`Falha ao salvar preferencias (${response.status}).`);
      }

      const payload = (await response.json()) as {
        preferences?: Partial<UserNotificationPreferences>;
      };

      set({
        error: null,
        isSaving: false,
        preferences: normalizePreferences(payload.preferences)
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Falha ao salvar preferencias.",
        isSaving: false,
        preferences: previous
      });
    }
  }
}));

