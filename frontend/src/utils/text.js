// Strip HTML tags for plain-text previews (WordPress bodies are stored as HTML).
export function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
