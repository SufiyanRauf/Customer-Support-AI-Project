import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  const routerPrompt = `You are a router. Your purpose is to determine if a user's query is related to code or not. Respond with "code" if the query is code-related, and "conversation" otherwise.

  User query: "${lastMessage.content}"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: routerPrompt }],
    });

    const route = response.choices[0].message.content.toLowerCase();
    let model = 'gpt-4o-mini';
    if (route.includes('code')) {
      model = 'gpt-4'; // Use a more powerful model for code
    }

    const chatResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, model }),
    });

    return new NextResponse(chatResponse.body, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error("Error in router:", error);
    return NextResponse.json({ error: "Failed to route request." }, { status: 500 });
  }
}
