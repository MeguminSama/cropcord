import * as fastCsv from "fast-csv";
import fs from "fs";
import { mkdirpSync as mkdirp } from "mkdirp";
import fetch from "node-fetch";
import path from "path";

const DOWNLOAD_DIR = path.resolve(__dirname, "..", "downloads");
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
        SCREENSHOT_REGEX.lastIndex = 0;

        // get all of the screenshot urls
        let match;
        if (process.argv.includes("--download")) {
          while ((match = SCREENSHOT_REGEX.exec(msg))) {
            // get the url from match
            const [url, channelId, messageId, fileName] = match;
            mkdirp(
              path.resolve(
                DOWNLOAD_DIR,
                "attachments",
                guildId,
                json.id,
                messageId
              )
            );

            // download the file url and save it to the path
            const file = fs.createWriteStream(
              path.resolve(
                DOWNLOAD_DIR,
                "attachments",
                guildId,
                json.id,
                messageId,
                fileName
              )
            );

            // Downloading from bucket is faster than from cdn
            const request = await fetch(
              url.replace(
                "https://cdn.discordapp.com",
                "https://discord.storage.googleapis.com"
              )
            );
            if (!request?.body) {
              console.log("Failed to download", url);
              continue;
            }

            request.body.pipe(file);

            // wait for the file to finish downloading
            await new Promise((resolve) => {
              file.on("finish", resolve);
            });
          }
        }
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
