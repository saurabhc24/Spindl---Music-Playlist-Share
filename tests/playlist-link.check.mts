import "dotenv/config";

// Parsing of pasted playlist links. No database and no network: every case here
// is about what we accept, what we reject, and what URL we rebuild.
//   npx tsx --conditions=react-server tests/playlist-link.check.mts

const { parsePlaylistLink } = await import("../lib/playlist-link");

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

const SPOTIFY_ID = "37i9dQZF1DXcBWIGoYBM5M";
const YT_ID = "PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI";

console.log("\nSpotify links");
for (const [label, input] of [
  ["plain URL", `https://open.spotify.com/playlist/${SPOTIFY_ID}`],
  ["with ?si= share token", `https://open.spotify.com/playlist/${SPOTIFY_ID}?si=abc123`],
  ["localized share link", `https://open.spotify.com/intl-de/playlist/${SPOTIFY_ID}`],
  ["www subdomain", `https://www.open.spotify.com/playlist/${SPOTIFY_ID}`],
  ["no scheme", `open.spotify.com/playlist/${SPOTIFY_ID}`],
  ["spotify: URI", `spotify:playlist:${SPOTIFY_ID}`],
  ["surrounding whitespace", `  https://open.spotify.com/playlist/${SPOTIFY_ID}  `],
] as const) {
  const parsed = parsePlaylistLink(input);
  check(
    label,
    parsed?.provider === "SPOTIFY" && parsed.externalId === SPOTIFY_ID,
    JSON.stringify(parsed)
  );
}

check(
  "rebuilds a canonical URL rather than echoing the paste",
  parsePlaylistLink(`https://open.spotify.com/intl-de/playlist/${SPOTIFY_ID}?si=xyz`)
    ?.externalUrl === `https://open.spotify.com/playlist/${SPOTIFY_ID}`
);

console.log("\nYouTube links");
for (const [label, input] of [
  ["playlist URL", `https://www.youtube.com/playlist?list=${YT_ID}`],
  ["without www", `https://youtube.com/playlist?list=${YT_ID}`],
  ["YouTube Music", `https://music.youtube.com/playlist?list=${YT_ID}`],
  ["mobile", `https://m.youtube.com/playlist?list=${YT_ID}`],
  ["watch URL carrying a list", `https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${YT_ID}`],
] as const) {
  const parsed = parsePlaylistLink(input);
  check(label, parsed?.provider === "YOUTUBE" && parsed.externalId === YT_ID, JSON.stringify(parsed));
}

check(
  "rebuilds a canonical YouTube URL from a watch link",
  parsePlaylistLink(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${YT_ID}`)
    ?.externalUrl === `https://www.youtube.com/playlist?list=${YT_ID}`
);

console.log("\nRejected");
for (const [label, input] of [
  ["empty string", ""],
  ["not a URL", "just some text"],
  ["a non-playlist Spotify link", `https://open.spotify.com/track/${SPOTIFY_ID}`],
  ["an album link", `https://open.spotify.com/album/${SPOTIFY_ID}`],
  ["a bare YouTube video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
  ["an unrelated host", "https://example.com/playlist/abc123def456ghi789"],
  // The host is checked exactly, so a lookalike domain cannot pass as Spotify.
  ["a lookalike host", `https://open.spotify.com.evil.test/playlist/${SPOTIFY_ID}`],
  ["a subdomain-prefixed lookalike", `https://evil.test/open.spotify.com/playlist/${SPOTIFY_ID}`],
  ["javascript: scheme", "javascript:alert(1)"],
  ["data: URL", "data:text/html,<script>alert(1)</script>"],
  ["file: scheme", "file:///etc/passwd"],
  ["an id with illegal characters", "https://open.spotify.com/playlist/abc$%^&*()12345678"],
  ["an id that is far too short", "https://open.spotify.com/playlist/abc"],
  ["a non-string input", 12345],
  ["null", null],
] as const) {
  check(label, parsePlaylistLink(input) === null, JSON.stringify(parsePlaylistLink(input)));
}

check(
  "rejects an absurdly long input without evaluating it",
  parsePlaylistLink(`https://open.spotify.com/playlist/${"a".repeat(5000)}`) === null
);

console.log(
  failures === 0 ? "\nAll playlist-link checks passed." : `\n${failures} check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
