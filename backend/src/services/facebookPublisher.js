// Publishes a content item to a Facebook Page using the Graph API.
// Requires channel.config = { pageId, pageAccessToken }
// The pageAccessToken must be a long-lived Page Access Token with
// pages_manage_posts + pages_read_engagement permissions.
// See README.md "Facebook setup" for how to obtain one.

const GRAPH_VERSION = "v20.0";

export async function publishToFacebook(item, channel) {
  const { pageId, pageAccessToken } = channel.config || {};
  if (!pageId || !pageAccessToken) {
    throw new Error("Facebook channel is missing pageId or pageAccessToken");
  }

  const mediaUrls = Array.isArray(item.media_urls) ? item.media_urls : JSON.parse(item.media_urls || "[]");

  let url;
  let body;

  if (mediaUrls.length > 0) {
    // Single photo post. For multiple photos you'd need the multi-photo
    // upload flow (upload each as unpublished, then attach via attached_media).
    url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`;
    body = new URLSearchParams({
      url: mediaUrls[0],
      caption: item.body,
      access_token: pageAccessToken
    });
  } else {
    url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/feed`;
    body = new URLSearchParams({
      message: item.body,
      access_token: pageAccessToken
    });
  }

  const res = await fetch(url, { method: "POST", body });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Facebook publish failed");
  }

  return { externalPostId: data.post_id || data.id, raw: data };
}
