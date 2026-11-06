/**
 * Basic tool template
 *
 * Purpose: describe what the tool does
 * Use cases: when to use this tool
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "{{tool_name}}",
		label: "{{Tool Label}}",
		description: "{{tool description, visible to the LLM}}",

		parameters: Type.Object({
			action: StringEnum(["list", "add", "delete"] as const, {
				description: "Action to perform",
			}),
			name: Type.Optional(Type.String({
				description: "Item name",
			})),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const { action, name } = params;

			// check the abort signal
			if (signal?.aborted) {
				return {
					content: [{ type: "text", text: "Cancelled" }],
					details: { cancelled: true },
				};
			}

			// stream progress updates
			onUpdate?.({
				content: [{ type: "text", text: "Working..." }],
				details: { progress: 50 },
			});

			try {
				// perform the real work
				let result: string;

				switch (action) {
					case "list":
						result = "Listed all items";
						break;
					case "add":
						result = name ? `Added item: ${name}` : "Please provide an item name";
						break;
					case "delete":
						result = name ? `Deleted item: ${name}` : "Please provide an item name";
						break;
				}

				return {
					content: [{ type: "text", text: result }],
					details: { action, name, success: true },
				};
			} catch (error) {
				return {
					content: [{ type: "text", text: `Error: ${error}` }],
					isError: true,
					details: { error: String(error) },
				};
			}
		},

		// custom tool-call renderer (optional)
		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold(`${args.action} `));
			if (args.name) {
				text += theme.fg("muted", args.name);
			}
			return new Text(text, 0, 0);
		},

		// custom result renderer (optional)
		renderResult(result, { expanded, isPartial }, theme) {
			if (isPartial) {
				return new Text(theme.fg("warning", "Working..."), 0, 0);
			}

			if (result.isError) {
				return new Text(theme.fg("error", `✗ ${result.content[0]?.text}`), 0, 0);
			}

			return new Text(theme.fg("success", "✓ Done"), 0, 0);
		},
	});
}
