// packages/verifier/scripts/fixture.ts
const html = (body: string) =>
  new Response(`<!doctype html><title>Acme Studio</title>${body}`, {
    headers: { "content-type": "text/html" },
  });

Bun.serve({
  port: 4100,
  fetch(req) {
    const { pathname } = new URL(req.url);

    if (pathname === "/good") {
      return html(`
        <h1>Acme Studio</h1>
        <section id="pricing"><h2>Pricing</h2><p>Plans start at $10.</p></section>
        <form id="contact"><input name="email"><button>Send</button></form>`);
    }

    if (pathname === "/bad") {
      return html(`
        <h1>Acme Studio</h1>
        <script>throw new Error("boom")</script>`);
    }

    return new Response("not found", { status: 404 });
  },
});

console.log("fixture on http://localhost:4100");