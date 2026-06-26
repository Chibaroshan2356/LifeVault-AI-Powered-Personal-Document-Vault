/**
 * jwt.types.ts — JWT Payload Type Definitions
 *
 * Defines the shape of data embedded in each token type.
 * Keep payloads minimal — tokens are sent on every request.
 *
 * AccessTokenPayload: identity + role for authorization decisions
 * RefreshTokenPayload: identity only — used solely to issue new access tokens
 */

/** Data embedded in the access token */
export interface AccessTokenPayload {
  /** MongoDB user _id as string */
  sub:   string;
  email: string;
  role:  string;
  /** Token type discriminator — prevents a refresh token being used as an access token */
  type: 'access';
}

/** Data embedded in the refresh token */
export interface RefreshTokenPayload {
  sub:  string;
  /** Unique token ID — matches the _id in the RefreshTokens collection */
  jti:  string;
  type: 'refresh';
}

/** Shape of a successfully verified access token */
export interface VerifiedAccessToken extends AccessTokenPayload {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/** Shape of a successfully verified refresh token */
export interface VerifiedRefreshToken extends RefreshTokenPayload {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/** A token pair returned on login */
export interface TokenPair {
  accessToken:  string;
  refreshToken: string;
}
