import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { url, headers, body } = await req.json();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
        // Override User-Agent to mimic a standard server request
        "User-Agent": "NexusStudioBackend/1.0",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Proxy request failed with status ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    // Handle streaming vs non-streaming response
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("event-stream")) {
      // Forward the stream
      return new NextResponse(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Chat proxy error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
