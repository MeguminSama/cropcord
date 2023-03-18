import * as fastCsv from "fast-csv";
import path from "path";
import fs from "fs";

const PACKAGE_DIR = path.resolve(__dirname, "..", "package");
const MESSAGE_DIR = path.resolve(PACKAGE_DIR, "messages");

const SCREENSHOT_REGEX =
  /https:\/\/cdn\.discordapp\.com\/attachments\/(\d+)\/(\d+)\/(Screenshot_\d+-\d+\.png)/g;

export interface ChannelInfo {
  id: string;
  type: number;
  name: string;
  guild?: { id: string; name: string };
  recipients?: string[];
}

export interface InfoCache {
  [guildId: string]: {
    [channelId: string]: string[];
  };
}

const guilds: InfoCache = {};

async function main() {
  for (const channel of fs.readdirSync(MESSAGE_DIR)) {
    if (!channel.startsWith("c")) continue;
    const json: ChannelInfo = JSON.parse(
      fs.readFileSync(
        path.resolve(MESSAGE_DIR, channel, "channel.json"),
        "utf-8"
      )
    );

    // Support for DMs
    const guildId = json.guild?.id ?? "@me";

    const csv = fastCsv.parseFile(
      path.resolve(MESSAGE_DIR, channel, "messages.csv")
    );

    for await (const row of csv) {
      const [id, timestamp, message, ...attachments] = row;
      const msg = [message, ...attachments].join(",");
      if (SCREENSHOT_REGEX.test(msg)) {
        guilds[guildId] ??= {};
        guilds[guildId][json.id] ??= [];
        guilds[guildId][json.id].push(id);
      }
    }

    if (guilds[guildId]?.[json.id]?.length) {
      console.log(
        `[INFO] Finished ${json.guild?.name ?? `DM ${json.id}`} (${
          json.id
        }) with ${guilds[guildId]?.[json.id]?.length ?? 0} screenshot(s)`
      );
    }
  }

  // count number of messages in every channel in every guild
  let total = 0;
  for (const guildId in guilds) {
    for (const channelId in guilds[guildId]) {
      total += guilds[guildId][channelId].length;
    }
  }

  console.log(`[INFO] Found ${total} screenshot(s) in total`);

  fs.writeFileSync("./messages.json", JSON.stringify(guilds), "utf-8");
}
main();
