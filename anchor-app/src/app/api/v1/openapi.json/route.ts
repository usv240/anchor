import { z } from "zod";
import { Plan, PlanRequest } from "@/lib/domain/types";

/** GET /api/v1/openapi.json: OpenAPI 3.1, generated from the same Zod schemas the API validates with. */
export function GET() {
  const schema = (s: z.ZodType) => z.toJSONSchema(s, { target: "openapi-3.0", io: "input", unrepresentable: "any" });
  const error = {
    type: "object",
    properties: { error: { type: "object", properties: { status: { type: "integer" }, message: { type: "string" } } } },
  };
  const placeId = { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Qloo place entity id" };
  const qlooKey = { name: "X-Qloo-Key", in: "header", required: false, schema: { type: "string" }, description: "Bring your own Qloo key. Never stored or logged." };
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
      "/api/v1/places/{id}/audience": {
        get: { summary: "Who loves this Qloo place: affinity by age group and gender (official harness as backup)", parameters: [placeId, qlooKey], responses: { "200": { description: "Audience profile" }, "404": { description: "No profile" }, "503": { description: "Qloo not connected" } } },
      },
      "/api/v1/places/{id}/fans": {
        get: { summary: "Where this Qloo place's fans are, and how many of its 20 strongest fan areas are high-need neighbourhoods (official harness as backup)", parameters: [placeId, qlooKey], responses: { "200": { description: "Fan areas" }, "404": { description: "No fan map" }, "503": { description: "Qloo not connected" } } },
      },
      "/api/v1/heatmap": {
        get: {
          summary: "Where an age group's and gender's tastes concentrate in Los Angeles (Qloo heatmap cells)",
          parameters: [
            { name: "ages", in: "query", schema: { type: "string", default: "35_to_54" }, description: "Comma-separated: 18_to_34, 35_to_54, 55_plus" },
            { name: "gender", in: "query", schema: { type: "string", enum: ["any", "male", "female"], default: "any" } },
            qlooKey,
          ],
          responses: { "200": { description: "Cells" } },
        },
      },
      "/api/v1/books": {
        post: {
          summary: "Children's books for a reading corner, from up to 4 interests (games, shows, films, stars)",
          parameters: [qlooKey],
          requestBody: { content: { "application/json": { schema: { type: "object", properties: { interests: { type: "array", items: { type: "string" }, maxItems: 4 }, take: { type: "integer", default: 6 } }, required: ["interests"] } } } },
          responses: { "200": { description: "Books, removed titles with reasons, and interests that shaped no books" } },
        },
      },
      "/api/v1/need": { get: { summary: "High-need zones from CDC estimates", responses: { "200": { description: "Zones" } } } },
      "/api/v1/keys": { post: { summary: "Create an API key (shown once)", responses: { "201": { description: "Key" }, "429": { description: "Limit reached" } } } },
      "/api/v1/health": { get: { summary: "Service status and active modes", responses: { "200": { description: "Status" } } } },
    },
  });
}
