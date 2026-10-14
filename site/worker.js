// Static assets don't answer byte-range requests, and Safari won't play video without them.
// This runs only for .mp4 files (see run_worker_first) and serves the requested range.
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const range = request.headers.get("Range");
    const match = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (response.status !== 200 || !match) return withAcceptRanges(response);

    const body = await response.arrayBuffer();
    const size = body.byteLength;
    let start = match[1] === "" ? size - Number(match[2]) : Number(match[1]);
    let end = match[1] === "" || match[2] === "" ? size - 1 : Number(match[2]);
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }

    const headers = new Headers(response.headers);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(body.slice(start, end + 1), { status: 206, headers });
  },
};

function withAcceptRanges(response) {
  const headers = new Headers(response.headers);
  headers.set("Accept-Ranges", "bytes");
  return new Response(response.body, { status: response.status, headers });
}
