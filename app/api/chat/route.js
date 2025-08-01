import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_STUDIO_API_KEY);
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const systemPrompt = `You are an AI-powered assistant for a platform that provides AI-driven interviews for software engineering positions.
1. The platform offers AI-powered interviews for software engineering positions.
2. The platform helps candidates practice and prepare for real job interviews.
3. The platform covers a wide range of topics including algorithms, data structures, system design, and behavioral questions.
4. Users can access the services through our website or mobile app.
5. If asked about technical issues, guide users to our troubleshooting page or suggest contacting our technical support team.
6. Always maintain user privacy and do not share personal information.
7. If you're unsure about any information, it's okay to say you don't know and offer to connect the user with a human representative.

Your goal is to provide accurate information, assist with common inquiries, and ensure a positive experience for all users.`;

export async function POST(req) {
  const { messages, model = 'gemini-1.5-flash' } = await req.json();
  const lastMessage = messages[messages.length - 1];

  try {
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_STUDIO_API_KEY,
      modelName: "embedding-001",
    });

    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
    const vector = await embeddings.embedQuery(lastMessage.content);

    const results = await pineconeIndex.query({
      vector,
      topK: 3,
      includeMetadata: true,
    });

    const context = results.matches.map(match => match.metadata.text).join('\n\n');
    const newSystemPrompt = `${systemPrompt}\n\nHere is some additional context that might be useful:\n\n${context}`;
    
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      systemInstruction: newSystemPrompt,
    });
    
    // ** FIX: Filter out the correct initial assistant welcome message **
    const chatHistory = messages.slice(0, -1).filter(msg => msg.role === 'user' || (msg.role === 'assistant' && msg.content !== "Hi there! I'm your AI Interview Prep Assistant. How can I help you today?"));

    const chat = geminiModel.startChat({
      history: chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user', // Use 'model' for assistant messages
        parts: [{ text: msg.content }],
      })),
    });
    
    const result = await chat.sendMessageStream(lastMessage.content);
    
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(stream);

  } catch (error) {
    console.error("Error creating Google completion:", error);
    return NextResponse.json({ error: "Failed to process chat completion." }, { status: 500 });
  }
}