import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  const routerPrompt = `You are a router. Your purpose is to determine if a user's query is related to code or not. Respond with "code" if the query is code-related, and "conversation" otherwise.

  User query: "${lastMessage.content}"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: routerPrompt }],
    });

    const route = response.choices[0].message.content.toLowerCase();
    let model = 'meta-llama/llama-3.1-8b-instruct';
    if (route.includes('code')) {
      model = 'meta-llama/llama-3.1-405b-instruct'; // Use a more powerful model for code
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