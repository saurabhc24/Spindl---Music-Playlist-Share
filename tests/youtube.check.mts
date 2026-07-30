import "dotenv/config";

// Verifies lib/providers/youtube.ts normalization + pageToken pagination
// against a stubbed YouTube Data API. No database or network needed.
//   npx tsx --conditions=react-server tests/youtube.check.mts
process.env.GOOGLE_CLIENT_ID ??= "test-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-client-secret";
process.env.YOUTUBE_REDIRECT_URI ??=
  "http://127.0.0.1:3000/api/connect/youtube/callback";

type FetchArgs = Parameters<typeof fetch>;

const pages: Record<string, unknown> = {
  // first request (no pageToken)
  "": {
    items: [
      {
        id: "PL_one",
        snippet: {
          title: "Chill mix",
          description: "desc",
          thumbnails: {
            default: { url: "https://i.ytimg.com/default.jpg" },
            high: { url: "https://i.ytimg.com/high.jpg" },
            maxres: { url: "https://i.ytimg.com/maxres.jpg" },
          },
        },
        contentDetails: { itemCount: 12 },
      },
      {
        id: "PL_two",
        snippet: {
          title: "Only low-res art",
          thumbnails: { default: { url: "https://i.ytimg.com/only-default.jpg" } },
        },
        contentDetails: { itemCount: 3 },
      },
    ],
    nextPageToken: "TOKEN2",
  },
  TOKEN2: {
    items: [
      {
        id: "PL_three",
        snippet: { title: "No thumbnails at all" },
      },
    ],
  },
};

let requests = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: FetchArgs[0], init?: FetchArgs[1]) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.startsWith("https://www.googleapis.com/youtube/v3/playlists")) {
    requests++;
    const token = new URL(url).searchParams.get("pageToken") ?? "";
    return new Response(JSON.stringify(pages[token]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return realFetch(input, init);
}) as typeof fetch;

const { youtube } = await import("../lib/providers/youtube");

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

const result = await youtube.fetchPlaylists("fake-token");

check("follows nextPageToken across pages", requests === 2, `(requests=${requests})`);
check("returns every playlist across pages", result.length === 3, `(got ${result.length})`);
check("prefers highest-res thumbnail", result[0].coverImageUrl === "https://i.ytimg.com/maxres.jpg", result[0].coverImageUrl ?? "null");
check("falls back to lower-res thumbnail", result[1].coverImageUrl === "https://i.ytimg.com/only-default.jpg", result[1].coverImageUrl ?? "null");
check("tolerates missing thumbnails", result[2].coverImageUrl === null);
check("builds a real YouTube playlist URL", result[0].externalUrl === "https://www.youtube.com/playlist?list=PL_one", result[0].externalUrl);
check("maps item count to trackCount", result[0].trackCount === 12 && result[1].trackCount === 3);
check("defaults missing itemCount to null", result[2].trackCount === null);
check("keeps titles", result[0].title === "Chill mix" && result[2].title === "No thumbnails at all");

console.log(failures === 0 ? "\nAll YouTube checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
