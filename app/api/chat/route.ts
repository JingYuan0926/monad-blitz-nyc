type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return Response.json(
      { error: "OPENAI_API_KEY not set in .env" },
      { status: 500 }
    );
  }

  let body: { messages?: ChatMessage[]; message?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Accept { messages: [...] } or a simple { message: string }
  let messages: ChatMessage[];
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    messages = body.messages;
  } else if (typeof body.message === "string" && body.message.trim() !== "") {
    messages = [{ role: "user", content: body.message }];
  } else {
    return Response.json(
      { error: "Expected { messages: [{role, content}, ...] } or { message: string }" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "gpt-4.1-nano", messages }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Forward the OpenAI error as JSON with the same status
      return Response.json(
        { error: data?.error?.message ?? "OpenAI API error", details: data },
        { status: res.status }
      );
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string") {
      return Response.json(
        { error: "Unexpected response shape from OpenAI", details: data },
        { status: 502 }
      );
    }

    return Response.json({ reply });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to reach OpenAI" },
      { status: 500 }
    );
  }
}
