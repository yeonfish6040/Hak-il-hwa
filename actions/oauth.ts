import {Db, ObjectId} from "mongodb";
import { google } from "googleapis";
import {RefreshAccessTokenResponse} from "google-auth-library/build/src/auth/oauth2client";
import {GoogleTokens, User} from "../maps/schemas";
import {MongoDBCollection} from "../maps/constants";

export class OAuthService {
  private db;
  private oauth2Client;

  constructor(db: Db) {
    this.db = db;

    this.oauth2Client = OAuthService.createOAuth2Client();
  }

  async updateToken(user: string, access_token: string, refresh_token: string): Promise<void> {
    await this.db.collection<GoogleTokens>(MongoDBCollection.GOOGLE_TOKENS).deleteMany({ user: user });

    await this.db.collection(MongoDBCollection.GOOGLE_TOKENS).insertOne({
      accessToken: access_token,
      refreshToken: refresh_token,
      user,
    });
  }

  async refreshToken(user: string): Promise<string> {
    const tokens = await this.db.collection<GoogleTokens>(MongoDBCollection.GOOGLE_TOKENS).findOne({ user: user });
    if (!tokens) throw new Error("Cannot find token for user");

    this.oauth2Client.setCredentials({ refresh_token: tokens.refreshToken });
    const res: RefreshAccessTokenResponse = await this.oauth2Client.refreshAccessToken();
    if (!res.credentials.access_token) throw new Error("Cannot retrieve access token");
    if (!res.credentials.refresh_token) throw new Error("Cannot retrieve refresh token");

    await this.db.collection<GoogleTokens>(MongoDBCollection.GOOGLE_TOKENS).deleteMany({ user: user });
    await this.db.collection(MongoDBCollection.GOOGLE_TOKENS).insertOne({
      accessToken: res.credentials.access_token,
      refreshToken: res.credentials.refresh_token,
      user,
    });

    return res.credentials.access_token;
  }

  static createOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_PW,
        `${process.env.PAGE_URI}/auth`
    );
  }
}