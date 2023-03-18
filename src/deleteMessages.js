const { ChannelStore, PermissionStore } = Vencord.Webpack.Common;
const MessageActions = Vencord.Webpack.findByProps("deleteMessage", "startEditMessage");

let running = false;

const failed = [];
const skipped = [];
let success = 0;

const canAccessChannel = (channel) => PermissionStore.can(channel.accessPermissions, channel);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function deleteMessages(guilds) {
	if (running) {
		console.log("This is already running... Wait for it to finish or restart discord and try again.")
		return;
	}
	running = true;
	for (const [guildId, channels] of Object.entries(guilds)) {
		// For every channel, loop through every message and delete.
		// It will wait 5s between each deletion.
		for (const [channelId, messages] of Object.entries(channels)) {
			const channel = ChannelStore.getChannel(channelId)
			if (!channel) continue
			for (const messageId of messages) {
				try {
					const canAccess = canAccessChannel(channel);
					if (!canAccess) {
						skipped.push([guildId, channelId, messageId, "Can't access channel"])
						continue
					}

					console.log("Deleting message", guildId, channelId, messageId);
					await MessageActions.deleteMessage(channelId, messageId)
					success++
				} catch (e) {
					failed.push([guildId, channelId, messageId, e])
				}
				await sleep(6000)
			}
		}
	}

	console.log("Failed to delete:", failed)
	console.log("Skipped:", skipped)
	console.log("Successfully deleted", success, "messages")
	running = false;
}
