import { cookies } from "next/headers";
import { isValidSessionToken, SESSION_COOKIE } from "./session-token";

export { SESSION_COOKIE } from "./session-token";
export { getSessionToken } from "./session-token";

export async function getServerSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return isValidSessionToken(token);
}
