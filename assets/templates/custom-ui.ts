/**
 * Custom UI template
 *
 * Purpose: build a complex custom interactive UI
 * Use cases: forms, wizards, games, dashboards
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	Editor,
	Text,
	Container,
	matchesKey,
	Key,
	truncateToWidth,
} from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("{{ui_command}}", {
		description: "Open custom UI",

		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("Interactive mode required", "error");
				return;
			}

			const result = await ctx.ui.custom<string | null>((tui, theme, keybindings, done) => {
				// state
				let selectedIndex = 0;
				let editMode = false;
				let inputText = "";

				// options
				const options = ["Option A", "Option B", "Option C", "Custom input"];

				// editor (used by the custom-input mode)
				const editor = new Editor(tui, {
					borderColor: (s) => theme.fg("accent", s),
				});

				editor.onSubmit = (value) => {
					if (value.trim()) {
						done(`Custom: ${value.trim()}`);
					} else {
						editMode = false;
						tui.requestRender();
					}
				};

				// input handling
				function handleInput(data: string) {
					if (editMode) {
						if (matchesKey(data, Key.escape)) {
							editMode = false;
							tui.requestRender();
							return;
						}
						editor.handleInput(data);
						tui.requestRender();
						return;
					}

					if (matchesKey(data, Key.up)) {
						selectedIndex = Math.max(0, selectedIndex - 1);
						tui.requestRender();
						return;
					}

					if (matchesKey(data, Key.down)) {
						selectedIndex = Math.min(options.length - 1, selectedIndex + 1);
						tui.requestRender();
						return;
					}

					if (matchesKey(data, Key.enter)) {
						const selected = options[selectedIndex];

						if (selected === "Custom input") {
							editMode = true;
							tui.requestRender();
						} else {
							done(selected);
						}
						return;
					}

					if (matchesKey(data, Key.escape)) {
						done(null);
					}
				}

				// rendering
				function render(width: number): string[] {
					const lines: string[] = [];
					const add = (s: string) => lines.push(truncateToWidth(s, width));

					// title
					add(theme.fg("accent", "═".repeat(width)));
					add(theme.fg("text", "  Custom UI example"));
					add(theme.fg("accent", "═".repeat(width)));
					lines.push("");

					// option list
					for (let i = 0; i < options.length; i++) {
						const opt = options[i];
						const selected = i === selectedIndex;
						const prefix = selected ? theme.fg("accent", "▸ ") : "  ";
						const text = selected
							? theme.fg("accent", opt)
							: theme.fg("text", opt);

						add(`${prefix}${text}`);
					}

					// edit mode
					if (editMode) {
						lines.push("");
						add(theme.fg("muted", "  Input:"));
						for (const line of editor.render(width - 4)) {
							add(`  ${line}`);
						}
					}

					// help
					lines.push("");
					if (editMode) {
						add(theme.fg("dim", "  Enter confirm • Esc back"));
					} else {
						add(theme.fg("dim", "  ↑↓ navigate • Enter select • Esc cancel"));
					}
					add(theme.fg("accent", "═".repeat(width)));

					return lines;
				}

				return {
					render,
					invalidate: () => {},
					handleInput,
				};
			});

			if (result) {
				ctx.ui.notify(`Selected: ${result}`, "info");
			} else {
				ctx.ui.notify("Cancelled", "info");
			}
		},
	});
}
