// netlify/functions/adminModeration.js
exports.handler = async (event) => {
  const API_BASE = process.env.API_BASE || "https://gogoworld-api.onrender.com";
  const INTERNAL_KEY = process.env.INTERNAL_API_KEY;
  if (!INTERNAL_KEY) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:"missing_INTERNAL_API_KEY" }) };
  }

  try {
    const { path, httpMethod, headers, body } = event;
    // Path in ingresso: /.netlify/functions/adminModeration/api/admin/...
    const upstreamPath = path.replace(/^\/\.netlify\/functions\/adminModeration/, "");
    const url = API_BASE + upstreamPath;

    const outHeaders = {
      "x-internal-key": INTERNAL_KEY,
      "Content-Type": headers["content-type"] || "application/json",
    };
    if (headers.authorization) outHeaders["Authorization"] = headers.authorization;

    const res = await fetch(url, {
      method: httpMethod,
      headers: outHeaders,
      body: ["GET","HEAD"].includes(httpMethod) ? undefined : body
    });

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
      body: text
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:"proxy_error", message: e.message }) };
  }
};
