import { query } from "../db.js";
import { publishToFacebook } from "./facebookPublisher.js";
import { publishToWordPress } from "./wordpressPublisher.js";

// Publishes a single content_items row, updates its status, and writes a
// publish_logs entry either way. Returns the updated row.
export async function publishContentItem(item) {
  const { rows: channelRows } = await query("SELECT * FROM channels WHERE id = $1", [item.channel_id]);
  const channel = channelRows[0];

  try {
    let result;
    if (channel.type === "facebook") {
      result = await publishToFacebook(item, channel);
    } else if (channel.type === "wordpress") {
      result = await publishToWordPress(item, channel);
    } else {
      throw new Error(`Unsupported channel type: ${channel.type}`);
    }

    await query(
      `UPDATE content_items SET status = 'published', published_at = now(),
         external_post_id = $1, updated_at = now() WHERE id = $2`,
      [result.externalPostId, item.id]
    );
    await query(
      "INSERT INTO publish_logs (content_item_id, status, response) VALUES ($1, 'success', $2)",
      [item.id, JSON.stringify(result.raw)]
    );

    const { rows } = await query("SELECT * FROM content_items WHERE id = $1", [item.id]);
    return rows[0];
  } catch (err) {
    await query(
      `UPDATE content_items SET status = 'failed', updated_at = now() WHERE id = $1`,
      [item.id]
    );
    await query(
      "INSERT INTO publish_logs (content_item_id, status, response) VALUES ($1, 'error', $2)",
      [item.id, JSON.stringify({ message: err.message })]
    );
    const { rows } = await query("SELECT * FROM content_items WHERE id = $1", [item.id]);
    return rows[0];
  }
}
