"use client";

import { useEffect, useState } from "react";

import { getWebConfig } from "@birthub/config";

import { fetchWithSession, getStoredSession } from "../../../../lib/auth-client";

type Role = "OWNER" | "ADMIN" | "MEMBER" | "READONLY";

interface MemberItem {
  email: string;
  id: string;
  name: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
}

const webConfig = getWebConfig();

function canChangeRole(actorRole: Role, currentRole: Role, targetRole: Role): boolean {
  if (actorRole === "OWNER") {
    return currentRole !== "OWNER" || targetRole === "OWNER";
  }

  if (actorRole === "ADMIN") {
    if (currentRole === "OWNER" || targetRole === "OWNER" || targetRole === "ADMIN") {
      return false;
    }
    return true;
  }

  return false;
}

export default function TeamRolesPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/team/members`);

      if (!response.ok) {
        throw new Error(`Falha ao carregar membros (${response.status})`);
      }

      const payload = (await response.json()) as { items: MemberItem[] };
      setMembers(payload.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar membros.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const session = getStoredSession();
  const actor = members.find((member) => member.id === session?.userId);
  const actorRole = actor?.role ?? "READONLY";

  const updateRole = async (member: MemberItem, nextRole: Role) => {
    if (!canChangeRole(actorRole, member.role, nextRole)) {
      return;
    }

    await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/team/members/${member.id}/role`, {
      body: JSON.stringify({ role: nextRole }),
      headers: {
        "content-type": "application/json"
      },
      method: "PATCH"
    });

    await load();
  };

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h1 style={{ margin: 0 }}>Gestao de roles</h1>
        <p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>
          Owner promove admin; admin promove member/readonly. Owner nunca pode ser removido por admin.
        </p>
      </header>

      {error ? <p style={{ color: "#a11d2d", margin: 0 }}>{error}</p> : null}
      {isLoading ? <p>Carregando...</p> : null}

      {!isLoading ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th align="left" style={{ padding: "0.75rem" }}>
                  Usuario
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
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                    {member.name}
                  </td>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                    {member.email}
                  </td>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                    <select
                      disabled={!canChangeRole(actorRole, member.role, member.role)}
                      onChange={(event) => void updateRole(member, event.target.value as Role)}
                      value={member.role}
                    >
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="READONLY">Readonly</option>
                    </select>
                  </td>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                    {member.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

