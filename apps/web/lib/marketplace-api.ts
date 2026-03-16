import { getWebConfig } from "@birthub/config";

export async function approveOutput(outputId: string) {
  const config = getWebConfig();
  const response = await fetch(`${config.NEXT_PUBLIC_API_URL}/api/v1/outputs/${encodeURIComponent(outputId)}/approve`, {
    credentials: "include",
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Failed to approve ${outputId}: ${response.status}`);
  }

  return (await response.json()) as {
    output: {
      approvedAt: string | null;
      approvedByUserId: string | null;
      id: string;
      status: string;
    };
  };
}
