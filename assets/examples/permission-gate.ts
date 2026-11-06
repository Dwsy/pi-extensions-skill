/**
 * Permission gate extension example
 *
 * Blocks dangerous commands and sensitive path access
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	// dangerous command patterns
	const DANGEROUS_COMMANDS = [
		{ pattern: /rm\s+-rf\s+\//, name: "delete root directory" },
		{ pattern: /rm\s+-rf\s+~\/\./, name: "delete home dotfiles" },
		{ pattern: />\s*\/dev\/null/, name: "redirect to null" },
		{ pattern: /:\(\)\{\s*:\|:&\s*\};:/, name: "fork bomb" },
	];

	// sensitive paths
	const SENSITIVE_PATHS = [
		".env",
		".env.local",
		".env.production",
		"secrets.json",
		"credentials.json",
		"private.key",
		"id_rsa",
		"node_modules/",
		".git/",
	];

	pi.on("tool_call", async (event, ctx) => {
		// inspect bash commands
		if (isToolCallEventType("bash", event)) {
			const cmd = event.input.command;
			if (!cmd) return;

			for (const { pattern, name } of DANGEROUS_COMMANDS) {
				if (pattern.test(cmd)) {
					const ok = await ctx.ui.confirm(
						"⚠️ Dangerous command",
						`Detected: ${name}\nCommand: ${cmd}\n\nAllow execution?`
					);
					if (!ok) {
						return {
							block: true,
							reason: `User rejected dangerous command: ${name}`,
						};
					}
				}
			}
		}

		// inspect sensitive paths
		const path = event.input.path;
		if (!path) return;

		for (const sensitive of SENSITIVE_PATHS) {
			if (path.includes(sensitive)) {
				// read operations only warn
				if (isToolCallEventType("read", event)) {
					console.log(`[PermissionGate] reading sensitive path: ${path}`);
					return;
				}

				// write/edit operations require confirmation
				const ok = await ctx.ui.confirm(
					"🔒 Sensitive path",
					`Accessing: ${path}\n\nAllow this operation?`
				);
				if (!ok) {
					return {
						block: true,
						reason: `User rejected access to sensitive path: ${sensitive}`,
					};
				}
			}
		}
	});

	// show a hint when the session starts
	pi.on("session_start", async (_event, ctx) => {
		console.log("[PermissionGate] permission gate active");
	});
}
