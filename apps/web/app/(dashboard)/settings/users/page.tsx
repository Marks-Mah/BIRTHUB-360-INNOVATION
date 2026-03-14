"use client";

import { useEffect, useState } from "react";

import { getWebConfig } from "@birthub/config";

import { fetchWithSession } from "../../../../lib/auth-client";

type Role = "OWNER" | "ADMIN" | "MEMBER" | "READONLY";
type UserStatus = "ACTIVE" | "SUSPENDED";

interface UserItem {
  email: string;
  id: string;
  name: string;
  role: Role;
  status: UserStatus;
}

const webConfig = getWebConfig();

export default function UsersAdminPage() {
  const [filters, setFilters] = useState({
    role: "",
    search: "",
    status: ""
  });
  const [users, setUsers] = useState<UserItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [removeCandidate, setRemoveCandidate] = useState<string | null>(null);
  const [removeConfirmation, setRemoveConfirmation] = useState("");

  const loadUsers = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();

      if (filters.search) {
        params.set("search", filters.search);
      }

      if (filters.role) {
        params.set("role", filters.role);
      }

      if (filters.status) {
        params.set("status", filters.status);
      }

      const response = await fetchWithSession(
        `${webConfig.NEXT_PUBLIC_API_URL}/api/v1/users?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Falha ao carregar usuarios (${response.status})`);
      }

      const payload = (await response.json()) as { items: UserItem[] };
      setUsers(payload.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar usuarios.");
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [filters.role, filters.search, filters.status]);

  const suspendUser = async (userId: string) => {
    await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/users/${userId}/suspend`, {
      method: "PATCH"
    });
    await loadUsers();
  };

  const removeUser = async (userId: string) => {
    if (removeConfirmation !== "REMOVER") {
      setError("Digite REMOVER para confirmar a exclusao.");
      return;
    }

    await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/users/${userId}`, {
      method: "DELETE"
    });

    setRemoveCandidate(null);
    setRemoveConfirmation("");
    await loadUsers();
  };

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h1 style={{ margin: 0 }}>Administracao de usuarios</h1>
        <p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>
          Lista, busca, filtro por role/status, suspensao soft e remocao com confirmacao textual.
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <input
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          placeholder="Buscar por nome/email"
          value={filters.search}
        />
        <select
          onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
          value={filters.role}
        >
          <option value="">Todos os roles</option>
          <option value="OWNER">Owner</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="READONLY">Readonly</option>
        </select>
        <select
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          value={filters.status}
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>

      {error ? <p style={{ color: "#a11d2d", margin: 0 }}>{error}</p> : null}

      <div style={{ border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th align="left" style={{ padding: "0.75rem" }}>
                Nome
              </th>
              <th align="left" style={{ padding: "0.75rem" }}>
                Email
              </th>
              <th align="left" style={{ padding: "0.75rem" }}>
                Role
              </th>
              <th align="left" style={{ padding: "0.75rem" }}>
                Status
              </th>
              <th align="left" style={{ padding: "0.75rem" }}>
                Acoes
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>{user.name}</td>
                <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>{user.email}</td>
                <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>{user.role}</td>
                <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>{user.status}</td>
                <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => void suspendUser(user.id)} type="button">
                      Suspender
                    </button>
                    <button onClick={() => setRemoveCandidate(user.id)} type="button">
                      Remover
                    </button>
                  </div>
                  {removeCandidate === user.id ? (
                    <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.5rem" }}>
                      <input
                        onChange={(event) => setRemoveConfirmation(event.target.value)}
                        placeholder='Digite "REMOVER"'
                        value={removeConfirmation}
                      />
                      <button onClick={() => void removeUser(user.id)} type="button">
                        Confirmar remocao
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

