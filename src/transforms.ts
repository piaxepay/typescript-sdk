import type { JsonObject, TermInput, UserLocation } from "./types";

type RawObject = Record<string, unknown>;

export function asObject(value: unknown): RawObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as RawObject;
  }
  return {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function stringValue(value: unknown): string {
  return value == null ? "" : String(value);
}

export function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return String(value);
}

export function booleanValue(value: unknown): boolean {
  return Boolean(value);
}

export function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function jsonObject(value: unknown): JsonObject {
  return asObject(value);
}

export function jsonObjectOrNull(value: unknown): JsonObject | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
}

export function jsonObjectArray(value: unknown): JsonObject[] {
  return asArray(value)
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => entry as JsonObject);
}

export function stringRecordOrNull(
  value: unknown
): Record<string, number> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const output: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value as RawObject)) {
    if (typeof entry === "number") {
      output[key] = entry;
      continue;
    }
    if (typeof entry === "string") {
      const parsed = Number(entry);
      if (Number.isFinite(parsed)) {
        output[key] = parsed;
      }
    }
  }
  return output;
}

export function serializeTerm(term: TermInput) {
  return {
    type: term.type,
    data: term.data,
    expiry_date: term.expiryDate ?? undefined,
  };
}

export function serializeUserLocation(userLocation?: UserLocation | null) {
  if (!userLocation) {
    return undefined;
  }

  return {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
  };
}
