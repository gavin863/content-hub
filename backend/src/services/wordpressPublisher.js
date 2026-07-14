// Publishes a content item to a WordPress site using the built-in REST API.
// Requires channel.config = { siteUrl, username, appPassword }
// appPassword is a WordPress "Application Password" (Users > Profile >
// Application Passwords), NOT the account login password.
// See README.md "WordPress setup" for details.

export async function publishToWordPress(item, channel) {
  const { siteUrl, username, appPassword } = channel.config || {};
  if (!siteUrl || !username || !appPassword) {
    throw new Error("WordPress channel is missing siteUrl, username or appPassword");
  }

  const mediaUrls = Array.isArray(item.media_urls) ? item.media_urls : JSON.parse(item.media_urls || "[]");
  const bodyHtml = mediaUrls.length
    ? `${mediaUrls.map((u) => `<img src="${u}" />`).join("\n")}\n${item.body}`
    : item.body;

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");
  const url = `${siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`
    },
    body: JSON.stringify({
      title: item.title || "(untitled)",
      content: bodyHtml,
      status: "publish"
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "WordPress publish failed");
  }

  return { externalPostId: String(data.id), raw: { id: data.id, link: data.link } };
}
