import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_STUDIO_API_KEY);

export async function POST(req) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  const routerPrompt = `You are a router. Your purpose is to determine if a user's query is related to code or not. Respond with "code" if the query is code-related, and "conversation" otherwise.

  User query: "${lastMessage.content}"`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(routerPrompt);
    const response = await result.response;
    const route = response.text().toLowerCase();

    let modelName = 'gemini-1.5-flash';
    if (route.includes('code')) {
      modelName = 'gemini-1.5-pro'; // Use a more powerful model for code
    }

    const chatResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, model: modelName }),
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