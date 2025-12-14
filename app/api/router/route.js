import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_STUDIO_API_KEY);

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  const routerPrompt = `You are a router. Your purpose is to determine if a user's query is related to code or not. Respond with "code" if the query is code-related, and "conversation" otherwise.

  User query: "${lastMessage.content}"`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let response;
    let attempts = 0;
    const maxAttempts = 3;

    // Retry logic for API call
    while (attempts < maxAttempts) {
      try {
        const result = await model.generateContent(routerPrompt);
        response = await result.response;
        break; // Success, exit the loop
      } catch (error) {
        if (error.status === 503 && attempts < maxAttempts - 1) {
          console.log(`Model overloaded, retrying in ${attempts + 1} second(s)...`);
          await delay((attempts + 1) * 1000);
          attempts++;
        } else {
          throw error; // Re-throw other errors or on final attempt
        }
      }
    }

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