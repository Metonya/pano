import { createContext } from "./context";
import { openDatabase } from "./db";
import { createEvents } from "./events";
import { migrate as runMigrations } from "./migrate";
import { createActivity } from "./services/activity";
import { createAttachments } from "./services/attachments";
import { createCriteria } from "./services/criteria";
import { createItems } from "./services/items";
import { createProjects } from "./services/projects";
import { createScenarios } from "./services/scenarios";

export type { ChangeEvent } from "./events";
export { positionBetween } from "./position";
export {
  itemKeySchema,
  prioritySchema,
  projectKeySchema,
  statusSchema,
} from "./schemas";
export function createCore(path?: string) {
  const db = openDatabase(path);
  const migrate = () => runMigrations(db);
  try {
    migrate();
  } catch (error) {
    db.close();
    throw error;
  }
  const events = createEvents();
  const context = createContext(db, events);
  const { activity, records } = createActivity(context);
  return {
    db,
    migrate,
    events,
    projects: createProjects(context),
    items: createItems(context, activity),
    criteria: createCriteria(context),
    scenarios: createScenarios(context),
    attachments: createAttachments(context),
    activity,
    records,
    close: () => db.close(),
  };
}
export type Core = ReturnType<typeof createCore>;
