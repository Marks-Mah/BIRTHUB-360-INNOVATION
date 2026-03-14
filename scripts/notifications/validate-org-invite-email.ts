function parseFlag(name: string): string | undefined {
  const flag = process.argv.find((item) => item.startsWith(`${name}=`));
  return flag ? flag.slice(name.length + 1) : undefined;
}

async function main() {
  const token = parseFlag("--token") ?? "invite-token-sample";
  const appUrl = process.env.WEB_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const acceptUrl = new URL(`/invites/accept?token=${encodeURIComponent(token)}`, appUrl).toString();

  if (!acceptUrl.includes("/invites/accept?token=")) {
    throw new Error("Invite acceptance URL is malformed.");
  }

  console.log(
    JSON.stringify(
      {
        acceptUrl,
        ok: true,
        token
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
