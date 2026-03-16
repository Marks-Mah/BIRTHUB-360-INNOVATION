import { notFound } from "next/navigation";

import { getWebConfig } from "@birthub/config";

import { PolicyManager } from "../../../../../components/agents/PolicyManager";
import { getInstalledAgentById, getInstalledAgentPolicies } from "../../../../../lib/agents";

type ManifestPolicy = {
  actions: string[];
  effect: string;
  id: string;
  name: string;
};

function readPolicies(manifest: Record<string, unknown>): ManifestPolicy[] {
  const policies = manifest.policies;

  if (!Array.isArray(policies)) {
    return [];
  }

  return policies.filter((policy): policy is ManifestPolicy => {
    if (!policy || typeof policy !== "object") {
      return false;
    }

    const candidate = policy as Record<string, unknown>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.effect === "string" &&
      Array.isArray(candidate.actions)
    );
  });
}

export default async function AgentPoliciesPage({ params }: Readonly<{ params: { id: string } }>) {
  const [agent, policies] = await Promise.all([
    getInstalledAgentById(params.id),
    getInstalledAgentPolicies(params.id)
  ]);

  if (!agent) {
    notFound();
  }
  const config = getWebConfig();
  const manifestPolicies = policies?.manifestPolicies ?? readPolicies(agent.manifest);
  const managedPolicies = policies?.managedPolicies ?? [];
  const runtimeProvider = policies?.runtimeProvider ?? agent.runtimeProvider;

  return (
    <PolicyManager
      agentId={agent.id}
      apiUrl={config.NEXT_PUBLIC_API_URL}
      initialManagedPolicies={managedPolicies}
      initialManifestPolicies={manifestPolicies}
      runtimeProvider={runtimeProvider}
    />
  );
}
