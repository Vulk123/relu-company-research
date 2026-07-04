import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Sends the applicant details + research summary + generated PDF to a
 * Discord channel using the Discord Bot API (multipart file upload).
 * https://discord.com/developers/docs/resources/message#create-message
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      botToken = process.env.DISCORD_BOT_TOKEN,
      channelId = process.env.DISCORD_CHANNEL_ID,
      applicantName,
      applicantEmail,
      companyName,
      companyWebsite,
      pdfBase64, // data URI or raw base64 of the generated PDF
      fileName = "research-report.pdf",
    } = body;

    if (!botToken || !channelId) {
      return NextResponse.json({ error: "Missing Discord bot token or channel ID." }, { status: 400 });
    }
    if (!pdfBase64) {
      return NextResponse.json({ error: "Missing PDF attachment." }, { status: 400 });
    }

    const base64Data = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
    const pdfBuffer = Buffer.from(base64Data, "base64");

    const messageContent = [
      "**New Company Research Report Generated**",
      `**Applicant:** ${applicantName || "N/A"}`,
      `**Email:** ${applicantEmail || "N/A"}`,
      `**Company:** ${companyName || "N/A"}`,
      `**Website:** ${companyWebsite || "N/A"}`,
    ].join("\n");

    const form = new FormData();
    form.append(
      "payload_json",
      JSON.stringify({ content: messageContent })
    );
    form.append("files[0]", new Blob([pdfBuffer], { type: "application/pdf" }), fileName);

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Discord API error (${res.status}): ${text}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Discord integration error:", err);
    return NextResponse.json({ error: err.message || "Failed to send to Discord." }, { status: 500 });
  }
}
