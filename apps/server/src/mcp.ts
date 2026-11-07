import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  actorSchema,
  type Core,
  itemCreate,
  itemKeySchema,
  itemPatch,
  projectKeySchema,
  scenarioCreate,
  text,
  usageFields,
} from "@pano/core";
import { z } from "zod";
import { decodeActor } from "./routes/shared";

export async function handleMcp(request: Request, core: Core) {
  const server = new McpServer({ name: "pano", version: "0.1.0" });
  const headerActor = request.headers.get("X-Pano-Actor");
  const actor = (value?: string) =>
    (headerActor === null ? null : decodeActor(headerActor)) ??
    value ??
    "anonymous";
  const result = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  });
  const actorField = actorSchema.optional();
  server.registerTool(
    "list_projects",
    {
      description: "List active projects and their settings.",
      inputSchema: {},
    },
    () => result(core.projects.list()),
  );
  server.registerTool(
    "get_board",
    {
      description: "Get a project board and items awaiting human testing.",
      inputSchema: { project: projectKeySchema },
    },
    ({ project }) => result(core.items.board(project)),
  );
  server.registerTool(
    "get_item",
    {
      description:
        "Get an item and its last five records; set history to include all records.",
      inputSchema: { key: itemKeySchema, history: z.boolean().optional() },
    },
    ({ key, history }) => result(core.items.get(key, { history })),
  );
  server.registerTool(
    "create_item",
    {
      description: "Create an item in a project.",
      inputSchema: {
        project: projectKeySchema,
        ...itemCreate.shape,
        actor: actorField,
      },
    },
    ({ project, actor: who, ...data }) =>
      result(core.items.create(project, data, actor(who))),
  );
  const scenarioAction = z.discriminatedUnion("action", [
    scenarioCreate.extend({ action: z.literal("add") }),
    scenarioCreate.partial().extend({ action: z.literal("update"), id: text }),
    z.object({ action: z.literal("remove"), id: text }).strict(),
  ]);
  server.registerTool(
    "update_item",
    {
      description:
        "Update an item and optionally add, update or remove test scenarios.",
      inputSchema: {
        key: itemKeySchema,
        ...itemPatch.shape,
        scenarios: z.array(scenarioAction).optional(),
        actor: actorField,
      },
    },
    ({ key, actor: who, scenarios, ...data }) => {
      const identity = actor(who);
      core.items.update(key, data, identity);
      for (const scenario of scenarios ?? []) {
        if (scenario.action === "add") {
          const { action: _, ...fields } = scenario;
          core.scenarios.add(key, fields, identity);
        } else if (scenario.action === "update") {
          const { action: _, id, ...fields } = scenario;
          core.scenarios.update(key, id, fields, identity);
        } else core.scenarios.remove(key, scenario.id, identity);
      }
      return result(core.items.get(key));
    },
  );
  server.registerTool(
    "check_criterion",
    {
      description: "Check or uncheck an acceptance criterion.",
      inputSchema: {
        key: itemKeySchema,
        id: text,
        done: z.boolean(),
        actor: actorField,
      },
    },
    ({ key, id, done, actor: who }) =>
      result(core.criteria.check(key, id, done, actor(who))),
  );
  server.registerTool(
    "add_record",
    {
      description: "Add a note, check or decision to an item.",
      inputSchema: {
        key: itemKeySchema,
        kind: z.enum(["note", "check", "decision"]),
        message: text,
        actor: actorField,
      },
    },
    ({ key, actor: who, ...data }) =>
      result(core.records.add(key, data, actor(who))),
  );
  server.registerTool(
    "record_usage",
    {
      description:
        "When a run ends, report its model, effort, tokens and duration. At least one field is required; omit what you do not know.",
      inputSchema: {
        key: itemKeySchema,
        ...usageFields.shape,
        actor: actorField,
      },
    },
    ({ key, actor: who, ...data }) =>
      result(core.records.usage(key, data, actor(who))),
  );
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
