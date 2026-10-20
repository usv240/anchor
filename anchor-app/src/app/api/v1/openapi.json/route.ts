import { z } from "zod";
import { Plan, PlanRequest } from "@/lib/domain/types";

/** GET /api/v1/openapi.json: OpenAPI 3.1, generated from the same Zod schemas the API validates with. */
export function GET() {
  const schema = (s: z.ZodType) => z.toJSONSchema(s, { target: "openapi-3.0", io: "input", unrepresentable: "any" });
  const error = {
    type: "object",
    properties: { error: { type: "object", properties: { status: { type: "integer" }, message: { type: "string" } } } },
  };
  const json = (ref: string) => ({ "application/json": { schema: { $ref: `#/components/schemas/${ref}` } } });

  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Anchor API",
      version: "1.0.0",
      description:
        "Plan blood pressure outreach at trusted local venues in the neighbourhoods that need it most. Use the public demo key anc_demo to try it, or create your own key.",
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: "/" }],
    security: [{ bearer: [] }, {}],
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", description: "anc_demo or a key from POST /api/v1/keys" } },
      schemas: { PlanRequest: schema(PlanRequest), Plan: z.toJSONSchema(Plan, { target: "openapi-3.0", unrepresentable: "any" }), Error: error },
    },
    paths: {
      "/api/v1/plans": {
        post: {
          summary: "Create an outreach plan",
          description:
            "Streams newline-delimited JSON events (application/x-ndjson): step events, then a final { type: 'plan' } event. Add ?stream=false for one JSON response. Optional header X-Qloo-Key uses your own Qloo key for this request only.",
          parameters: [
            { name: "stream", in: "query", schema: { type: "boolean", default: true } },
            { name: "X-Qloo-Key", in: "header", required: false, schema: { type: "string" }, description: "Bring your own Qloo key. Never stored or logged." },
          ],
          requestBody: { required: false, content: json("PlanRequest") },
          responses: {
            "200": { description: "Event stream", content: { "application/x-ndjson": { schema: { type: "string" } } } },
            "201": { description: "Finished plan (stream=false)", content: json("Plan") },
            "400": { description: "Invalid request", content: json("Error") },
            "401": { description: "Unknown API key", content: json("Error") },
            "429": { description: "Rate limited", content: json("Error") },
          },
        },
      },
      "/api/v1/plans/{id}": {
        get: { summary: "Get a plan", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Plan", content: json("Plan") }, "404": { description: "Not found" } } },
      },
      "/api/v1/plans/{id}/export/{format}": {
        get: {
          summary: "Download a plan as CSV, GeoJSON, ICS (calendar) or JSON",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "format", in: "path", required: true, schema: { type: "string", enum: ["csv", "geojson", "ics", "json"] } },
          ],
          responses: { "200": { description: "File" } },
        },
      },
      "/api/v1/plans/{id}/trace": { get: { summary: "The recorded steps behind a plan", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Trace" } } } },
      "/api/v1/plans/{id}/verify": { get: { summary: "Check the plan's evidence chain", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Verification result" } } } },
      "/api/v1/need": { get: { summary: "High-need zones from CDC estimates", responses: { "200": { description: "Zones" } } } },
      "/api/v1/keys": { post: { summary: "Create an API key (shown once)", responses: { "201": { description: "Key" }, "429": { description: "Limit reached" } } } },
      "/api/v1/health": { get: { summary: "Service status and active modes", responses: { "200": { description: "Status" } } } },
    },
  });
}
