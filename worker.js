export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/api/live") {
      return env.ASSETS.fetch(request);
    }
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    if (!["GET", "HEAD"].includes(request.method)) {
      return Response.json(
        { status: "error", error: "Method not allowed" },
        { status: 405, headers: { ...headers, Allow: "GET, HEAD" } },
      );
    }
    const asset = await env.ASSETS.fetch(
      new URL("/api/live.json", request.url),
    );
    if (
      !asset.ok ||
      !asset.headers.get("Content-Type")?.includes("application/json")
    ) {
      return new Response(
        request.method === "HEAD"
          ? null
          : JSON.stringify({
              status: "error",
              error: "Release metadata unavailable",
            }),
        { status: 503, headers },
      );
    }
    return new Response(request.method === "HEAD" ? null : asset.body, {
      headers,
    });
  },
};
