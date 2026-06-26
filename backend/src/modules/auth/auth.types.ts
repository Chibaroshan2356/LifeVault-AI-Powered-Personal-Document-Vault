/**
 * auth.types.ts — Auth Module Return Types
 *
 * Defines the shape of data returned FROM auth.service.ts TO auth.controller.ts.
 * Controllers never construct these — they only receive and serialize them.
 */
import { IUserLean } from '../user/user.model';
import { TokenPair } from './jwt/jwt.types';

/** Returned by auth.service.login() */
export interface LoginResult {
  user:         IUserLean;
  accessToken:  string;
  refreshToken: string;
}

/** Returned by auth.service.refresh() */
export interface RefreshResult {
  accessToken: string;
}
