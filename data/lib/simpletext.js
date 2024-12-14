import { SimpleTextClient } from "@simpletext/client";
const config = {
  secretKey: process.env.SIMPLETEXT_SECRET,
  appId: process.env.SIMPLETEXT_APP_ID,
};

export const simpletext = new SimpleTextClient(config);
