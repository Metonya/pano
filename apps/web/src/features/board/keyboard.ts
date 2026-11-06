import type { KeyboardCoordinateGetter } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Status } from "./types";

const columns: Status[] = ["backlog", "in_progress", "test", "done"];
export const boardKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  args,
) => {
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight")
    return sortableKeyboardCoordinates(event, args);
  const { collisionRect, droppableRects } = args.context;
  if (!collisionRect) return;
  event.preventDefault();
  const center = collisionRect.left + collisionRect.width / 2;
  const candidates = columns
    .map((id) => droppableRects.get(id))
    .filter(
      (rect): rect is NonNullable<typeof rect> =>
        !!rect &&
        (event.code === "ArrowRight"
          ? rect.left + rect.width / 2 > center + 1
          : rect.left + rect.width / 2 < center - 1),
    );
  candidates.sort(
    (a, b) =>
      Math.abs(a.left + a.width / 2 - center) -
      Math.abs(b.left + b.width / 2 - center),
  );
  const target = candidates[0];
  if (!target) return;
  return {
    x: target.left + Math.max(0, (target.width - collisionRect.width) / 2),
    y: Math.max(
      target.top + 35,
      Math.min(collisionRect.top, target.bottom - collisionRect.height),
    ),
  };
};
