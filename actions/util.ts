import {ENV_List} from "../maps/constants";

export const ENV_Validator = () => {
  const missingList: string[] = [];
  Object.entries(ENV_List).forEach(([key, value]) => {
    if (!process.env[key] && value) missingList.push(key);
  });

  if (missingList.length > 0) throw new Error(`Environment variable missing: ${missingList.join(", ")}`);
}