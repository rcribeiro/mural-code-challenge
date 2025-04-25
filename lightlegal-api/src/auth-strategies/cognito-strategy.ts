import {AuthenticationStrategy} from '@loopback/authentication';
import {injectable} from '@loopback/core';
import {UserProfile, securityId} from '@loopback/security';
import {Request} from '@loopback/rest';
import * as jwt from 'jsonwebtoken';
const jwksClient = require('jwks-rsa');

const REGION = 'us-east-1';
const USER_POOL_ID = 'us-east-1_xLn6qcvLN'; 
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const CLIENT_ID = '2v20v72sgtlrf1fu95okkmgt6t';

const client = jwksClient({
  jwksUri: `${ISSUER}/.well-known/jwks.json`,
});

@injectable()
export class CognitoStrategy implements AuthenticationStrategy {
  name = 'cognito';

  async authenticate(request: Request): Promise<UserProfile | undefined> {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header missing or invalid');
    }

    const token = authHeader.replace('Bearer ', '');

    const decoded: any = jwt.decode(token, {complete: true});
    if (!decoded) {
      throw new Error('Token decode failed');
    }

    const kid = decoded.header.kid;

    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();

    const payload: any = jwt.verify(token, signingKey, {
      issuer: ISSUER,
    });

    // Optional: Validate audience
    if (CLIENT_ID && payload.aud !== CLIENT_ID) {
      throw new Error('Invalid audience');
    }

    return {
      [securityId]: payload.sub,
      name: payload.name,
      email: payload.email,
    };
  }
}