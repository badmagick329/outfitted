import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApplicationError, validationError } from "@/shared/application-error";

export function routeError(error: unknown) {
  const resolved = error instanceof ZodError ? validationError(error) : error;
  if (resolved instanceof ApplicationError) {
    return NextResponse.json(
      {
        error: {
          code: resolved.code,
          message: resolved.message,
          fieldErrors: resolved.fieldErrors,
        },
      },
      { status: resolved.status },
    );
  }
  console.error(resolved);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
