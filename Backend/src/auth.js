// Microsoft Entra ID (Azure AD) bearer-token validation for the MARSIS API.
//
// The SPA signs the user in with MSAL and requests an access token for
// api://<AZURE_API_CLIENT_ID>/access_as_user; it sends it as "Authorization: Bearer …".
// We verify signature (tenant JWKS), issuer, audience, expiry, scope and calling app.

import { createRemoteJWKSet, jwtVerify } from "jose";

const TENANT_ID = process.env.AZURE_TENANT_ID ?? "";
const API_CLIENT_ID = process.env.AZURE_API_CLIENT_ID ?? "";
const API_APP_ID_URI = process.env.AZURE_API_APP_ID_URI ?? (API_CLIENT_ID ? `api://${API_CLIENT_ID}` : "");
const REQUIRED_SCOPE = process.env.AZURE_REQUIRED_SCOPE ?? "access_as_user";
const ALLOWED_CLIENT_IDS = (process.env.AZURE_ALLOWED_CLIENT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const SPA_CLIENT_ID = process.env.AZURE_SPA_CLIENT_ID ?? ALLOWED_CLIENT_IDS[0] ?? "";

/** "off": ignore tokens · "optional": use a token when sent · "required": reject requests without one. */
const MODE = (process.env.AUTH_MODE ?? (TENANT_ID && API_CLIENT_ID ? "optional" : "off")).toLowerCase();

export const authConfig = {
  enabled: MODE !== "off" && Boolean(TENANT_ID && API_CLIENT_ID),
  required: MODE === "required",
  tenantId: TENANT_ID,
  apiClientId: API_CLIENT_ID,
  scope: API_APP_ID_URI ? `${API_APP_ID_URI}/${REQUIRED_SCOPE}` : "",
  spaClientId: SPA_CLIENT_ID,
  authority: TENANT_ID ? `https://login.microsoftonline.com/${TENANT_ID}` : "",
};

// Entra issues v1 or v2 access tokens depending on the API app's manifest
// (accessTokenAcceptedVersion), so accept both issuer formats and both audience forms.
const ISSUERS = [`https://login.microsoftonline.com/${TENANT_ID}/v2.0`, `https://sts.windows.net/${TENANT_ID}/`];
const AUDIENCES = [API_CLIENT_ID, API_APP_ID_URI].filter(Boolean);

const tenantJwks = authConfig.enabled
  ? createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`), {
      cooldownDuration: 30_000,
      cacheMaxAge: 6 * 60 * 60 * 1000,
    })
  : null;

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Verify an Entra access token and return the user it represents. Exported with an injectable key set for tests. */
export async function verifyAccessToken(token, jwks = tenantJwks) {
  if (!jwks) throw new AuthError("Authentication is not configured on this server.", 500);
  let payload;
  try {
    ({ payload } = await jwtVerify(token, jwks, {
      issuer: ISSUERS,
      audience: AUDIENCES,
      algorithms: ["RS256"],
      clockTolerance: 60,
    }));
  } catch (e) {
    throw new AuthError(`Invalid access token: ${e.code ?? e.message}`);
  }
  if (payload.tid !== TENANT_ID) throw new AuthError("Token was issued for a different tenant.");
  const scopes = typeof payload.scp === "string" ? payload.scp.split(" ") : [];
  if (!scopes.includes(REQUIRED_SCOPE)) throw new AuthError(`Token is missing the "${REQUIRED_SCOPE}" scope.`, 403);
  const caller = payload.azp ?? payload.appid;
  if (ALLOWED_CLIENT_IDS.length && !ALLOWED_CLIENT_IDS.includes(caller)) throw new AuthError("This application is not allowed to call the API.", 403);
  if (!payload.oid) throw new AuthError("Token has no user object id.");
  return {
    oid: payload.oid,
    tenantId: payload.tid,
    name: payload.name ?? null,
    username: payload.preferred_username ?? payload.upn ?? payload.unique_name ?? null,
    scopes,
  };
}

/** Express middleware: sets req.user (or null) according to AUTH_MODE. */
export function authenticate(jwks = tenantJwks) {
  return async (req, res, next) => {
    req.user = null;
    if (!authConfig.enabled || req.method === "OPTIONS") return next();
    const header = req.headers.authorization ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) {
      if (authConfig.required) {
        res.setHeader("WWW-Authenticate", `Bearer realm="MARSIS", scope="${authConfig.scope}"`);
        return res.status(401).json({ error: "Sign in required." });
      }
      return next();
    }
    try {
      req.user = await verifyAccessToken(match[1], jwks);
      next();
    } catch (e) {
      const status = e instanceof AuthError ? e.status : 401;
      res.setHeader("WWW-Authenticate", `Bearer realm="MARSIS", error="invalid_token"`);
      res.status(status).json({ error: e.message });
    }
  };
}
