import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const systemPrompt = `You are an AI-powered customer support assistant for HeadStarterAI, a platform that provides AI-driven interviews for software engineering positions.
1. HeadStarterAI offers AI-powered interviews for software engineering positions.
2. Our platform helps candidates practice and prepare for real job interviews.
3. We cover a wide range of topics including algorithms, data structures, system design, and behavioral questions.
4. Users can access our services through our website or mobile app.
5. If asked about technical issues, guide users to our troubleshooting page or suggest contacting our technical support team.
6. Always maintain user privacy and do not share personal information.
7. If you're unsure about any information, it's okay to say you don't know and offer to connect the user with a human representative.

Your goal is to provide accurate information, assist with common inquiries, and ensure a positive experience for all HeadStarterAI users.`;

export async function POST(req) {
  const { messages, model = 'meta-llama/llama-3.1-8b-instruct' } = await req.json();
  const lastMessage = messages[messages.length - 1];

  try {
    const embeddings = new OpenAIEmbeddings({
      modelName: "jinaai/jina-embeddings-v2-base-en", // Correct free embedding model
      openAIApiKey: process.env.OPENROUTER_API_KEY,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
            "X-Title": "HeadStarter AI Assistant",
        }
      }
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

    const completion = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [
        {
          role: 'system',
          content: newSystemPrompt,
        },
        ...messages,
      ],
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(stream);

  } catch (error) {
    console.error("Error creating OpenAI completion:", error);
    return NextResponse.json({ error: "Failed to process chat completion." }, { status: 500 });
  }
}