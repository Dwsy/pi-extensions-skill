/**
 * Basic command template
 *
 * Purpose: describe what the command does
 * Invocation: /commandname <args>
 */

import type { ExtensionAPI, AutocompleteItem } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("{{command_name}}", {
		description: "{{command description}}",

		// optional: argument autocomplete
		getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
			const options = ["option1", "option2", "option3"];
			const items = options.map((e) => ({ value: e, label: e }));
			const filtered = items.filter((i) => i.value.startsWith(prefix));
			return filtered.length > 0 ? filtered : null;
		},

		handler: async (args, ctx) => {
			// check UI availability
			if (!ctx.hasUI) {
				// UI is unavailable in non-interactive mode
				return;
			}

			const trimmedArgs = args.trim();

			// show help when no args are given
			if (!trimmedArgs) {
				ctx.ui.notify("Usage: /{{command_name}} <args>", "warning");
				return;
			}

			// execute the command
			try {
				// example: a select dialog
				const choice = await ctx.ui.select("Choose an action:", [
					"View status",
					"Run action",
					"Cancel",
				]);

				if (choice === "Cancel" || choice === undefined) {
					ctx.ui.notify("Cancelled", "info");
					return;
				}

				// handle the selection
				switch (choice) {
					case "View status":
						ctx.ui.notify(`Current args: ${trimmedArgs}`, "info");
						break;
					case "Run action":
						// perform the action...
						ctx.ui.notify("Done!", "info");
						break;
				}
			} catch (error) {
				ctx.ui.notify(`Error: ${error}`, "error");
			}
		},
	});
}
