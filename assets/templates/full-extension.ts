/**
 * Full extension example
 *
 * Shows how to combine tools, commands, events and UI
 * Purpose: a simple todo manager
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Text, Container, SettingsList, getSettingsListTheme } from "@earendil-works/pi-tui";

// state types
interface TodoItem {
	id: string;
	text: string;
	completed: boolean;
	createdAt: number;
}

interface TodoState {
	items: TodoItem[];
}

export default function (pi: ExtensionAPI) {
	// in-memory state
	let todos: TodoItem[] = [];

	// ========== state management ==========

	function persistState() {
		pi.appendEntry<TodoState>("todo-state", { items: todos });
	}

	function restoreFromBranch(ctx: ExtensionContext) {
		const branchEntries = ctx.sessionManager.getBranch();

		for (const entry of branchEntries) {
			if (entry.type === "custom" && entry.customType === "todo-state") {
				const data = entry.data as TodoState | undefined;
				if (data?.items) {
					todos = data.items;
				}
			}
		}
	}

	// ========== tools ==========

	pi.registerTool({
		name: "todo",
		label: "Todo",
		description: "Manage todos: list, add, complete, delete",

		parameters: Type.Object({
			action: Type.String({
				description: "Action: list, add, complete, delete",
			}),
			text: Type.Optional(Type.String({
				description: "Todo text (required for add)",
			})),
			id: Type.Optional(Type.String({
				description: "Todo ID (required for complete/delete)",
			})),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const { action, text, id } = params;

			switch (action) {
				case "list": {
					if (todos.length === 0) {
						return {
							content: [{ type: "text", text: "No todos yet" }],
							details: { items: [] },
						};
					}

					const list = todos
						.map((t) => `${t.completed ? "✓" : "○"} ${t.text} (${t.id})`)
						.join("\n");

					return {
						content: [{ type: "text", text: list }],
						details: { items: todos },
					};
				}

				case "add": {
					if (!text?.trim()) {
						return {
							content: [{ type: "text", text: "Please provide todo text" }],
							isError: true,
						};
					}

					const newTodo: TodoItem = {
						id: Date.now().toString(36),
						text: text.trim(),
						completed: false,
						createdAt: Date.now(),
					};

					todos.push(newTodo);
					persistState();

					return {
						content: [{ type: "text", text: `Added: ${newTodo.text}` }],
						details: { items: todos },
					};
				}

				case "complete": {
					if (!id) {
						return {
							content: [{ type: "text", text: "Please provide a todo ID" }],
							isError: true,
						};
					}

					const todo = todos.find((t) => t.id === id);
					if (!todo) {
						return {
							content: [{ type: "text", text: `Todo not found: ${id}` }],
							isError: true,
						};
					}

					todo.completed = !todo.completed;
					persistState();

					return {
						content: [{ type: "text", text: `${todo.completed ? "Done" : "Reopened"}: ${todo.text}` }],
						details: { items: todos },
					};
				}

				case "delete": {
					if (!id) {
						return {
							content: [{ type: "text", text: "Please provide a todo ID" }],
							isError: true,
						};
					}

					const index = todos.findIndex((t) => t.id === id);
					if (index === -1) {
						return {
							content: [{ type: "text", text: `Todo not found: ${id}` }],
							isError: true,
						};
					}

					const deleted = todos.splice(index, 1)[0];
					persistState();

					return {
						content: [{ type: "text", text: `Deleted: ${deleted.text}` }],
						details: { items: todos },
					};
				}

				default:
					return {
						content: [{ type: "text", text: `Unknown action: ${action}` }],
						isError: true,
					};
			}
		},

		renderCall(args, theme) {
			return new Text(
				theme.fg("toolTitle", theme.bold("todo ")) +
				theme.fg("muted", `${args.action}${args.text ? " " + args.text : ""}`),
				0, 0
			);
		},

		renderResult(result, { isPartial }, theme) {
			if (isPartial) return new Text(theme.fg("warning", "Working..."), 0, 0);
			if (result.isError) return new Text(theme.fg("error", "✗ Failed"), 0, 0);
			return new Text(theme.fg("success", "✓ Success"), 0, 0);
		},
	});

	// ========== commands ==========

	pi.registerCommand("todos", {
		description: "Open the todo manager",

		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("Interactive mode required", "error");
				return;
			}

			await ctx.ui.custom((tui, theme, _kb, done) => {
				const items = todos.map((t) => ({
					id: t.id,
					label: t.text,
					currentValue: t.completed ? "Done" : "Pending",
					values: ["Done", "Pending", "Delete"],
				}));

				const container = new Container();

				container.addChild({
					render(_w) {
						return [theme.fg("accent", theme.bold("Todos")), ""];
					},
					invalidate() {},
				});

				const settingsList = new SettingsList(
					items,
					Math.min(items.length + 2, 10),
					getSettingsListTheme(),
					(id, newValue) => {
						if (newValue === "Delete") {
							todos = todos.filter((t) => t.id !== id);
						} else {
							const todo = todos.find((t) => t.id === id);
							if (todo) {
								todo.completed = newValue === "Done";
							}
						}
						persistState();
						tui.requestRender();
					},
					() => done(undefined),
					(newText) => {
						// add a new todo
						if (newText?.trim()) {
							todos.push({
								id: Date.now().toString(36),
								text: newText.trim(),
								completed: false,
								createdAt: Date.now(),
							});
							persistState();
							tui.requestRender();
						}
					}
				);

				container.addChild(settingsList);

				return {
					render(width: number) {
						return container.render(width);
					},
					invalidate() {
						container.invalidate();
					},
					handleInput(data: string) {
						settingsList.handleInput?.(data);
						tui.requestRender();
					},
				};
			});
		},
	});

	// ========== events ==========

	pi.on("session_start", async (_event, ctx) => {
		restoreFromBranch(ctx);
	});

	pi.on("session_tree", async (_event, ctx) => {
		restoreFromBranch(ctx);
	});

	// Pi 1.5.0 has no post-fork event. Restore branch state from
	// session_start / session_tree instead (see references/api-surface-1.5.md).
}
