import { errorSchema } from "@dentalhq/contracts";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Cannot reach DentalHQ. Check your connection and try again.",
      0,
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = errorSchema.safeParse(data);
    throw new ApiError(
      error.success
        ? `${error.data.error} Reference: ${error.data.requestId}`
        : "Request failed. Check your details and try again.",
      response.status,
    );
  }
  return data;
}
