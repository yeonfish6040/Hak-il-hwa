import * as axios from "axios";
import {AcademicCalendarAPIResponse, SchoolInfoAPIResponse} from "../maps/type";
import {google} from "googleapis";
import {OAuthService} from "./oauth";
import {Db} from "mongodb";
import {GoogleTokens} from "../maps/schemas";
import {MongoDBCollection} from "../maps/constants";

export class ApiService {
  private db;
  private client;

  constructor(db: Db) {
    this.db = db;
    this.client = new axios.Axios();
  }

  /**
{
    ATPT_OFCDC_SC_CODE: 'J10',
    ATPT_OFCDC_SC_NM: '경기도교육청',
    SD_SCHUL_CODE: '7530560',
    SCHUL_NM: '한국디지털미디어고등학교',
    ENG_SCHUL_NM: 'Korea Digital Media High School',
    SCHUL_KND_SC_NM: '고등학교',
    LCTN_SC_NM: '경기도',
    JU_ORG_NM: '경기도교육청',
    FOND_SC_NM: '사립',
    ORG_RDNZC: '15255 ',
    ORG_RDNMA: '경기도 안산시 단원구 사세충열로 94',
    ORG_RDNDA: '(와동/ 한국디지털미디어고등학교)',
    ORG_TELNO: '031-363-7800',
    HMPG_ADRES: 'www.dimigo.hs.kr',
    COEDU_SC_NM: '남여공학',
    ORG_FAXNO: '031-402-8363',
    HS_SC_NM: '특성화고',
    INDST_SPECL_CCCCL_EXST_YN: 'N',
    HS_GNRL_BUSNS_SC_NM: '전문계',
    SPCLY_PURPS_HS_ORD_NM: null,
    ENE_BFE_SEHF_SC_NM: '전기',
    DGHT_SC_NM: '주간',
    FOND_YMD: '20020305',
    FOAS_MEMRD: '20020305',
    LOAD_DTM: '20230615'
  }

 */
  async searchSchool(schoolName: string): Promise<SchoolInfoAPIResponse[]> {
    const data = await this.client.get(`https://open.neis.go.kr/hub/schoolInfo?Type=json&KEY=${process.env.NEIS_OPEN_API_KEY}&SCHUL_NM=${encodeURIComponent(schoolName)}`);
    return data.data.schoolInfo[1].row;
  }

  /**
  {
    ATPT_OFCDC_SC_CODE: 'J10',
    SD_SCHUL_CODE: '7530560',
    AY: '2023',
    AA_YMD: '20240213',
    ATPT_OFCDC_SC_NM: '경기도교육청',
    SCHUL_NM: '한국디지털미디어고등학교',
    DGHT_CRSE_SC_NM: '주간',
    SCHUL_CRSE_SC_NM: '고등학교',
    EVENT_NM: '동계방학기간',
    EVENT_CNTNT: '',
    ONE_GRADE_EVENT_YN: 'Y',
    TW_GRADE_EVENT_YN: 'Y',
    THREE_GRADE_EVENT_YN: 'Y',
    FR_GRADE_EVENT_YN: '*',
    FIV_GRADE_EVENT_YN: '*',
    SIX_GRADE_EVENT_YN: '*',
    SBTR_DD_SC_NM: '휴업일',
    LOAD_DTM: '20241225'
  }
   */
  async getAcademicCalendar(ATPT_OFCDC_SC_CODE: string, SD_SCHUL_CODE: string, AA_FROM_YMD: string, AA_TO_YMD: string): Promise<AcademicCalendarAPIResponse[]> {
    const data = await this.client.get(`https://open.neis.go.kr/hub/SchoolSchedule?Type=json&pSize=365&KEY=${process.env.NEIS_OPEN_API_KEY}&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&AA_FROM_YMD=${AA_FROM_YMD}&AA_TO_YMD=${AA_TO_YMD}`);
    const fixedData: AcademicCalendarAPIResponse[] = data.data.SchoolSchedule[1].row;
    return fixedData.sort((d1, d2) => parseInt(d1.AA_YMD) - parseInt(d2.AA_YMD));
  }

  async insertEventToCalendar(user: string, date: string, school_name: string, event_name: string): Promise<void> {
    const tokens = await this.db.collection<GoogleTokens>(MongoDBCollection.GOOGLE_TOKENS).findOne({ user: user });
    if (!tokens) throw new Error("Cannot find token for user");

    const auth = OAuthService.createOAuth2Client();
    auth.setCredentials({ access_token: tokens.accessToken });
    const calendarApi = google.calendar({version: 'v3', auth});

    const calendars = (await calendarApi.calendarList.list()).data.items;
    let target = calendars?.find((e) => e.summary === `${school_name} 학사일정`);
    if (!target) {
      target = (await calendarApi.calendars.insert({
        requestBody: {
          summary: `${school_name} 학사일정`,
          timeZone: "Asia/Seoul",
        }
      })).data;
    }

    const event = {
      'summary': event_name,
      'location': school_name,
      'description': event_name,
      'start': {
        'date': date,
        'timeZone': 'Asia/Seoul',
      },
      'end': {
        'date': date,
        'timeZone': 'Asia/Seoul',
      },
    };
    await new Promise(async (resolve, reject) => {
      calendarApi.events.insert({
        calendarId: target!.id!,
        requestBody: event,
      }, (err: any, event: any) => {
        if (err) return reject(err);
        else resolve(event);
      });
    });
  }
}