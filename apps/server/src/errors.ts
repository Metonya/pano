import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
export const handleError: ErrorHandler = (error, c) => {
  if (error instanceof ZodError)
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "Invalid request",
          details: error.issues,
        },
      },
      400,
    );
  if (error instanceof SyntaxError)
    return c.json(
      { error: { code: "validation_error", message: "Invalid JSON" } },
      400,
    );
  if (error.message.includes("not found"))
    return c.json(
      { error: { code: "not_found", message: error.message } },
      404,
    );
  if (
    error.message.includes("UNIQUE constraint") ||
    error.message.includes("constraint failed") ||
    /requires|disabled|cannot|Pending|Only archived|does not belong/.test(
      error.message,
    )
  )
    return c.json({ error: { code: "conflict", message: error.message } }, 409);
  console.error(error);
  return c.json(
    { error: { code: "internal_error", message: "Internal server error" } },
    500,
  );
};
