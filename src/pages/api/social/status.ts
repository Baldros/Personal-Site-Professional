import type { APIRoute } from "astro";
import { getProviderRuntimeStatus } from "../../../lib/social/registry";

export const prerender = false;

export const GET: APIRoute = () => {
  return Response.json({
    providers: getProviderRuntimeStatus(import.meta.env)
  });
};
