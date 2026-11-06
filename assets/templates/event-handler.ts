/**
 * Event handler template
 *
 * Purpose: react to Pi lifecycle events
 * Use cases: permission checks, logging, state
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	// ========== session events ==========

	pi.on("session_start", async (_event, ctx) => {
		// initialize when the session starts
		ctx.ui.notify("Extension loaded!", "info");
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		// clean up, save state
		console.log("Session ended, cleaning up...");
	});

	// ========== agent events ==========

	pi.on("before_agent_start", async (event, ctx) => {
		// modify the system prompt or inject a message before the agent starts
		return {
			// inject a persistent message
			message: {
				customType: "my-extension",
				content: "Additional context",
				display: true,
			},
			// modify the system prompt
			systemPrompt: event.systemPrompt + "\n\nExtra instructions...",
		};
	});

	pi.on("agent_start", async (_event, ctx) => {
		// agent starts processing user input
		ctx.ui.setStatus("my-ext", "Agent running...");
	});

	pi.on("agent_end", async (event, ctx) => {
		// agent finished
		ctx.ui.setStatus("my-ext", undefined);
	});

	// ========== tool events (can be blocked) ==========

	pi.on("tool_call", async (event, ctx) => {
		// check dangerous commands
		if (isToolCallEventType("bash", event)) {
			const cmd = event.input.command;

			// block dangerous commands
			if (cmd?.includes("rm -rf") || cmd?.includes("sudo ")) {
				const ok = await ctx.ui.confirm(
					"Dangerous operation!",
					`Allow execution: ${cmd}?`
				);

				if (!ok) {
					return {
						block: true,
						reason: "User rejected dangerous command",
					};
				}
			}
		}

		// check sensitive paths
		if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
			const path = event.input.path;
			const protectedPaths = [".env", ".env.local", "secrets.json"];

			if (protectedPaths.some((p) => path?.includes(p))) {
				const ok = await ctx.ui.confirm(
					"Sensitive file!",
					`Allow modification: ${path}?`
				);

				if (!ok) {
					return {
						block: true,
						reason: "User rejected modifying sensitive file",
					};
				}
			}
		}
	});

	pi.on("tool_result", async (event, ctx) => {
		// modify the tool result (optional)
		if (event.isError) {
			// handle errors...
		}
		// return the modified result
		// return { content: [...], details: {...} };
	});

	// ========== input events ==========

	pi.on("input", async (event, ctx) => {
		const text = event.text;

		// transform shortcut commands
		if (text.startsWith("?quick ")) {
			return {
				action: "transform",
				text: `Answer briefly: ${text.slice(7)}`,
			};
		}

		// handle specific input directly
		if (text === "ping") {
			ctx.ui.notify("pong!", "info");
			return { action: "handled" };
		}

		// continue normal processing
		return { action: "continue" };
	});

	// ========== session switch events ==========

	pi.on("session_before_switch", async (event, ctx) => {
		// event.reason: "new" | "resume"
		// return { cancel: true } to cancel the switch
	});

	pi.on("session_before_fork", async (event, ctx) => {
		// event.entryId: entry ID at the fork point
		// return { cancel: true } to cancel
		// return { skipConversationRestore: true } to skip restoring the conversation
	});

	// ========== compaction events ==========

	pi.on("session_before_compact", async (event, ctx) => {
		// customize compaction or cancel it
		// return { cancel: true };
		// or supply a custom summary
		// return { compaction: { summary: "...", ... } };
	});
}
