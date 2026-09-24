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
  rpID: string;
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
  const rpID = rpIDs[0];
  if (!rpID || origins.length === 0) {
    throw new Error("RP_IDS and ORIGINS must be configured");
  }
  return { rpID, rpIDs, origins };
}

export function registrationOptions(
  env: Env,
  existing: readonly StoredCredential[],
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { rpID } = rpConfig(env);
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
  credentials: readonly StoredCredential[],
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { rpID } = rpConfig(env);
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
