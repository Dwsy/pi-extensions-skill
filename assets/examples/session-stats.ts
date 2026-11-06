/**
 * Session statistics extension
 *
 * Provides /stats to show session statistics
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("stats", {
		description: "Show session statistics",

		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				// non-interactive mode: print to the console
				const entries = ctx.sessionManager.getEntries();
				console.log(`Entries: ${entries.length}`);
				return;
			}

			// collect statistics
			const entries = ctx.sessionManager.getEntries();
			const branch = ctx.sessionManager.getBranch();
			const leafId = ctx.sessionManager.getLeafId();

			let userMessages = 0;
			let assistantMessages = 0;
			let toolCalls = 0;

			for (const entry of entries) {
				if (entry.type === "message") {
					const msg = entry.message;
					if ("role" in msg) {
						if (msg.role === "user") userMessages++;
						if (msg.role === "assistant") assistantMessages++;
						if (msg.role === "toolResult") toolCalls++;
					}
				}
			}

			const usage = ctx.getContextUsage();

			// format the output
			const lines = [
				"",
				"📊 Session statistics",
				"─".repeat(30),
				`Total entries: ${entries.length}`,
				`Current branch: ${branch.length}`,
				`Current leaf: ${leafId?.slice(0, 8) || "N/A"}...`,
				"",
				`User messages: ${userMessages}`,
				`Assistant messages: ${assistantMessages}`,
				`Tool calls: ${toolCalls}`,
			];

			if (usage) {
				lines.push(
					"",
					`Token usage: ${usage.tokens.toLocaleString()}`,
					`Context window: ${usage.contextWindow.toLocaleString()}`,
					`Utilization: ${(usage.tokens / usage.contextWindow * 100).toFixed(1)}%`,
				);
			}

			lines.push("─".repeat(30), "");

			// display as a widget
			ctx.ui.setWidget("session-stats", lines, { placement: "belowEditor" });

			// clear automatically after 3 seconds
			setTimeout(() => {
				ctx.ui.setWidget("session-stats", undefined);
			}, 5000);
		},
	});

	// register a tool so the LLM can fetch stats too
	pi.registerTool({
		name: "get_session_stats",
		label: "Get Session Stats",
		description: "Get statistics for the current session",
		parameters: {},

		async execute(_id, _params, _signal, _onUpdate, ctx) {
			const entries = ctx.sessionManager.getEntries();
			const usage = ctx.getContextUsage();

			return {
				content: [{
					type: "text",
					text: `Session stats:\n- Total entries: ${entries.length}\n- Token usage: ${usage?.tokens || "N/A"}`,
				}],
				details: { entryCount: entries.length, usage },
			};
		},

		renderResult(result, _opts, theme) {
			return new Text(theme.fg("success", "✓ Session stats fetched"), 0, 0);
		},
	});
}
