/** Only embed known video providers; never execute arbitrary API URLs. */
export function youtubeVideoId(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return;
    const host = url.hostname.toLowerCase();
    const id = host === "youtu.be" ? url.pathname.split("/")[1]
      : ["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(host)
        ? url.searchParams.get("v") ?? (/^\/(embed|shorts)\//.test(url.pathname) ? url.pathname.split("/")[2] : undefined)
        : undefined;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : undefined;
  } catch { return; }
}

export function videoEmbedUrl(value: string): string | undefined {
  const id = youtubeVideoId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : undefined;
}