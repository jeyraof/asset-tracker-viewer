import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
} from "@simplewebauthn/server";
import type { Env } from "../env";
import { base64urlDecode, utf8Encode } from "../lib/base64url";
import type { StoredCredential } from "./store";

/** Stable single-user identifier; the passkey credential is the actual identity. */
export const OWNER_UID = "asset-tracker-owner";
const OWNER_NAME = "owner";

export interface RpConfig {
  rpIDs: string[];
  origins: string[];
}

export function rpConfig(env: Env): RpConfig {
  const rpIDs = (env.RP_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = (env.ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (rpIDs.length === 0 || origins.length === 0) {
    throw new Error("RP_IDS and ORIGINS must be configured");
  }
  return { rpIDs, origins };
}

/**
 * Picks the configured RP ID for a request host: the longest RP ID that equals
 * the host or is a registrable suffix of it. Returns null for unknown hosts.
 */
export function resolveRpId(rpIDs: readonly string[], host: string): string | null {
  let match: string | null = null;
  for (const rpID of rpIDs) {
    if (host === rpID || host.endsWith(`.${rpID}`)) {
      if (!match || rpID.length > match.length) match = rpID;
    }
  }
  return match;
}

export function registrationOptions(
  env: Env,
  rpID: string,
  existing: readonly StoredCredential[],
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return generateRegistrationOptions({
    rpName: env.RP_NAME || "Asset Tracker",
    rpID,
    userName: OWNER_NAME,
    userID: utf8Encode(OWNER_UID),
    userDisplayName: OWNER_NAME,
    attestationType: "none",
    excludeCredentials: existing.map((credential) => ({
      id: credential.id,
      transports: credential.transports,
    })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
}

export function authenticationOptions(
  env: Env,
  rpID: string,
  credentials: readonly StoredCredential[],
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map((credential) => ({
      id: credential.id,
      transports: credential.transports,
    })),
    userVerification: "preferred",
  });
}

export function verifyRegistration(
  env: Env,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
): Promise<VerifiedRegistrationResponse> {
  const { rpIDs, origins } = rpConfig(env);
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origins,
    expectedRPID: rpIDs,
    // Passkeys on platform authenticators verify the user; security keys may not.
    requireUserVerification: false,
  });
}

export function verifyAuthentication(
  env: Env,
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: StoredCredential,
): Promise<VerifiedAuthenticationResponse> {
  const { rpIDs, origins } = rpConfig(env);
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origins,
    expectedRPID: rpIDs,
    credential: {
      id: credential.id,
      publicKey: base64urlDecode(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports,
    },
    requireUserVerification: false,
  });
}
