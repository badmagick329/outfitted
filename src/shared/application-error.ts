import { ZodError } from "zod";

export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const notFound = (message = "Not found") => new ApplicationError("NOT_FOUND", 404, message);
export const unauthorized = () => new ApplicationError("UNAUTHORIZED", 401, "Sign in required");
export const forbidden = (message = "You do not have permission to do that") =>
  new ApplicationError("FORBIDDEN", 403, message);
export const conflict = (message: string) => new ApplicationError("CONFLICT", 409, message);
export const infrastructureFailure = (message = "Something went wrong. Please try again.") =>
  new ApplicationError("INFRASTRUCTURE_FAILURE", 500, message);

export function validationError(error: ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return new ApplicationError(
    "VALIDATION_ERROR",
    400,
    "Please check the submitted details.",
    fieldErrors,
  );
}
