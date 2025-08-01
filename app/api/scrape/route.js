import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { promises as fs } from 'fs';
import path from 'path';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export async function POST() {
  try {
    const filePath = path.join(process.cwd(), 'knowledge-base.txt');
    const text = await fs.readFile(filePath, 'utf-8');

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    const chunks = await splitter.splitText(text);

    const embeddings = new OpenAIEmbeddings({
      modelName: "sentence-transformers/all-minilm-l6-v2", // Correct free embedding model
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

    for (const chunk of chunks) {
      const vector = await embeddings.embedQuery(chunk);
      await pineconeIndex.upsert([{
        id: Math.random().toString(36).substring(7),
        values: vector,
        metadata: { text: chunk },
      }]);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error scraping and embedding:", error);
    return NextResponse.json({ error: "Failed to scrape and embed." }, { status: 500 });
  }
}