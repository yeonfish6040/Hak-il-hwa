import * as dotenv from "dotenv";
dotenv.config();

import * as crypto from "crypto";
import * as path from "path";
import * as express from "express";
import * as session from "express-session";

import { Db, MongoClient } from "mongodb";
import { google } from "googleapis";
import { Request, Response } from "express";
import {AuthService} from "./actions/auth";
import {OAuthService} from "./actions/oauth";
import {User} from "./maps/schemas";
import {ENV_Validator} from "./actions/util";
import {ApiService} from "./actions/api";

// Before init
ENV_Validator();

// init
// port
const PORT: number = parseInt(process.env.PORT!) | 3000;

// services
let apiService: ApiService;
let authService: AuthService;
let oauthSercice: OAuthService;

// db
const client = new MongoClient(`mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@${process.env.MONGODB_URI}`);
let db: Db;

// google oauth client
const oauth2Client = OAuthService.createOAuth2Client();

const scopes: string[] = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
];


// express
const app = express.default();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session.default({secret: crypto.randomBytes(64).toString("hex"), resave: false, saveUninitialized: true, cookie: {}}));

app.set('view engine','ejs')
app.set('views', path.join(__dirname, 'views'));

declare module 'express-session' {
  interface SessionData {
    user: User;
  }
}

// TODO: state
app.get("/login", (req: Request, res: Response) => {
  const oauth_url = "https://accounts.google.com/o/oauth2/v2/auth"+
      `?client_id=${process.env.GOOGLE_OAUTH_CLIENT_ID}`+
      `&redirect_uri=${process.env.PAGE_URI}/auth`+
      `&scope=${scopes.join(" ")}`+
      `&response_type=code`+
      `&access_type=offline`+
      `&prompt=consent`+
      `&include_granted_scopes=true`;
  res.redirect(oauth_url);
});

app.get("/auth", async (req: Request, res: Response) => {
  const code: string = req.query.code as string;
  if (!code) {
    res.status(400).send(`ERROR<script>setTimeout(() => {location.href = "${process.env.PAGE_URI}/"}, 2000)</script>`).end();
    return;
  }
  try {
    const tokenRes = await oauth2Client.getToken(code);
    if (!scopes.every((s) => tokenRes.tokens.scope && tokenRes.tokens.scope.includes(s))) {
      res.send(`<script>alert("구글 로그인시 모든 권한을 허용해주세요"); location.href="${process.env.PAGE_URI}/login"</script>`).end();
      return;
    }

    const id_token = tokenRes.tokens.id_token;
    const refresh_token = tokenRes.tokens.refresh_token;
    if (!(id_token && refresh_token)) throw new Error("Cannot verify request");
    const ticket = await oauth2Client.verifyIdToken({ idToken: id_token });

    const dbUser = await authService.login(ticket);

    req.session.user = dbUser;

    await oauthSercice.updateToken(dbUser._id.toString(), tokenRes.tokens.access_token!, tokenRes.tokens.refresh_token!);

    res.redirect("/");
  }catch (e) {
    console.error(e);
    res.status(500).send(e).end();
  }
});

app.get("/logout", (req: Request, res: Response) => {
  req.session.user = undefined;
});

app.get("/test", async (req: Request, res: Response) => {
  const user = req.session.user;
  if (!user) {
    res.redirect("/");
    return;
  }

  await apiService.insertEventToCalendar(user._id.toString(), "2025-01-28", "asdf", "asdf");
});

// run
(async () => {
  await client.connect();
  db = client.db("hakilhwa");
  apiService = new ApiService(db);
  authService = new AuthService(db);
  oauthSercice = new OAuthService(db);

  app.listen(PORT, () => {
    console.log("Server is listening on port "+PORT);
  });
})();
