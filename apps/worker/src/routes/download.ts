const GITHUB_REPO = "BNAENTK/tikke";

export async function handleDownload(): Promise<Response> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { "User-Agent": "tikke-worker" } }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const data = await res.json<{ tag_name: string; assets: { name: string; browser_download_url: string }[] }>();
    const version = data.tag_name.replace(/^v/, "");
    const exe = data.assets.find((a) => a.name.endsWith(".exe") && !a.name.endsWith(".blockmap"));

    const downloadUrl = exe?.browser_download_url
      ?? `https://github.com/${GITHUB_REPO}/releases/download/${data.tag_name}/Tikke-Setup-${version}.exe`;

    return Response.redirect(downloadUrl, 302);
  } catch {
    // fallback to releases page
    return Response.redirect(`https://github.com/${GITHUB_REPO}/releases/latest`, 302);
  }
}
