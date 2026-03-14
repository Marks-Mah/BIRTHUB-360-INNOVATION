"use client";

import { create } from "zustand";

import { fetchWithSession, getStoredSession } from "../lib/auth-client";

export interface NotificationItem {
  content: string;
  createdAt: string;
  id: string;
  isRead: boolean;
  link: string | null;
  metadata?: Record<string, unknown> | null;
  type: string;
}

interface NotificationState {
  error: string | null;
  initialized: boolean;
  isLoading: boolean;
  items: NotificationItem[];
  nextCursor: string | null;
  unreadCount: number;
  loadMore: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function dedupeNotifications(items: NotificationItem[]): NotificationItem[] {
  const seen = new Set<string>();
  const deduped: NotificationItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    deduped.push(item);
  }

  return deduped.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

async function fetchFeed(cursor?: string | null, limit = 10) {
  const search = new URLSearchParams({
    limit: String(limit)
  });

  if (cursor) {
    search.set("cursor", cursor);
  }

  const response = await fetchWithSession(`/api/v1/notifications?${search.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar notificacoes (${response.status}).`);
  }

  return (await response.json()) as {
    items: NotificationItem[];
    nextCursor: string | null;
    unreadCount: number;
  };
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  error: null,
  initialized: false,
  isLoading: false,
  items: [],
  nextCursor: null,
  unreadCount: 0,
  async loadMore() {
    if (!getStoredSession() || !get().nextCursor || get().isLoading) {
      return;
    }

    set({
      error: null,
      isLoading: true
    });

    try {
      const payload = await fetchFeed(get().nextCursor, 20);

      set((state) => ({
        error: null,
        initialized: true,
        isLoading: false,
        items: dedupeNotifications([...state.items, ...payload.items]),
        nextCursor: payload.nextCursor,
        unreadCount: payload.unreadCount
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Falha ao carregar mais notificacoes.",
        isLoading: false
      });
    }
  },
  async markAllAsRead() {
    if (!getStoredSession()) {
      return;
    }

    try {
      const response = await fetchWithSession("/api/v1/notifications/read-all", {
        method: "PATCH"
      });

      if (!response.ok) {
        throw new Error(`Falha ao marcar notificacoes (${response.status}).`);
      }

      set((state) => ({
        error: null,
        items: state.items.map((item) => ({
          ...item,
          isRead: true
        })),
        unreadCount: 0
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Falha ao marcar notificacoes."
      });
    }
  },
  async markAsRead(id) {
    if (!getStoredSession()) {
      return;
    }

    const before = get().items;

    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              isRead: true
            }
          : item
      ),
      unreadCount: Math.max(
        0,
        state.unreadCount - (state.items.some((item) => item.id === id && !item.isRead) ? 1 : 0)
      )
    }));

    try {
      const response = await fetchWithSession(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH"
      });

      if (!response.ok) {
        throw new Error(`Falha ao marcar notificacao (${response.status}).`);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Falha ao marcar notificacao.",
        items: before
      });
      await get().refresh();
    }
  },
  async refresh() {
    if (!getStoredSession()) {
      set({
        error: null,
        initialized: true,
        items: [],
        nextCursor: null,
        unreadCount: 0
      });
      return;
    }

    set({
      error: null,
      isLoading: true
    });

    try {
      const payload = await fetchFeed(undefined, 10);

      set({
        error: null,
        initialized: true,
        isLoading: false,
        items: dedupeNotifications(payload.items),
        nextCursor: payload.nextCursor,
        unreadCount: payload.unreadCount
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Falha ao carregar notificacoes.",
        initialized: true,
        isLoading: false
      });
    }
  }
}));

