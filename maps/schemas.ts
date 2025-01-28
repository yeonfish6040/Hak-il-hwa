import type { WithId, Document, ObjectId } from "mongodb";

export interface User extends WithId<Document> {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

export interface GoogleTokens extends WithId<Document> {
  accessToken: string;
  refreshToken: string;

  user: string;
}

export interface SchoolInfo extends WithId<Document> {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  SCHUL_NM: string;

  user: string;
}

export interface FetchInfo extends WithId<Document> {
  period: string;
  from: string;
  to: string;
  calendar_id: string;

  schoolInfo: string;
  user: string;
}
