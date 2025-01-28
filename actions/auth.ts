import {Db} from "mongodb";
import {LoginTicket} from "google-auth-library";
import {MongoDBCollection} from "../maps/constants";
import {User} from "../maps/schemas";

export class AuthService {
  private db;

  constructor(db: Db) {
    this.db = db;
  }

  async login(ticket: LoginTicket): Promise<User> {
    console.log("LOGIN", ticket.getPayload());

    const payload = ticket.getPayload();
    if (!payload) throw new Error("Cannot parse LoginTicket");
    const sub = payload.sub || "";

    const dbUser = await this.db.collection<User>(MongoDBCollection.USER).findOne({ sub: sub });
    if (!dbUser) return this.register(ticket);

    return dbUser;
  }

  async register(ticket: LoginTicket): Promise<User> {
    console.log("REGISTER", ticket.getPayload());

    const payload = ticket.getPayload();
    if (!payload) throw new Error("Cannot parse LoginTicket");

    const _id =  (await this.db.collection(MongoDBCollection.USER).insertOne({
      sub: payload.sub,
      name: payload.name || "",
      email: payload.email || "",
      picture: payload.picture || "",
    })).insertedId;

    const result = await this.db.collection<User>(MongoDBCollection.USER).findOne(_id);
    if (!result) throw new Error("Failed to login/register.");

    return result;
  }
}