export type SlackMode = "webhook" | "api";

export interface SlackMessageInput {
  channel: string;
  mode: SlackMode;
  text: string;
  token?: string;
  webhookUrl?: string;
}

export interface SlackMessageResult {
  mode: SlackMode;
  ok: boolean;
  ts: string;
}

export async function postSlackMessage(
  input: SlackMessageInput,
  options?: { simulate?: boolean }
): Promise<SlackMessageResult> {
  if (options?.simulate ?? true) {
    return {
      mode: input.mode,
      ok: true,
      ts: new Date().toISOString()
    };
  }

  if (input.mode === "webhook") {
    if (!input.webhookUrl) {
      throw new Error("webhookUrl is required for Slack webhook mode.");
    }

    const response = await fetch(input.webhookUrl, {
      body: JSON.stringify({ channel: input.channel, text: input.text }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed with status ${response.status}.`);
    }

    return {
      mode: input.mode,
      ok: true,
      ts: new Date().toISOString()
    };
  }

  if (!input.token) {
    throw new Error("token is required for Slack API mode.");
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    body: JSON.stringify({ channel: input.channel, text: input.text }),
    headers: {
      authorization: `Bearer ${input.token}`,
      "content-type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Slack API failed with status ${response.status}.`);
  }

  return {
    mode: input.mode,
    ok: true,
    ts: new Date().toISOString()
  };
}
