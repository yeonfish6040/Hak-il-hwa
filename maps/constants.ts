export const MongoDBCollection = {
  USER: "user",
  GOOGLE_TOKENS: "google_tokens"
}

// [key: env key]: is required
export const ENV_List = {
  PAGE_URI: true,
  NEIS_OPEN_API_KEY: true,
  GOOGLE_OAUTH_CLIENT_ID: true,
  GOOGLE_OAUTH_CLIENT_PW: true,

  MONGODB_URI: true,
  MONGODB_USER: true,
  MONGODB_PASS: true,
  MONGODB_DB: true,
}

export const DashboardSidebarMenus = {
  summary: "개요",
  add: "추가",
  // pay: "결제",
}