import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
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

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_STUDIO_API_KEY,
      modelName: "embedding-001",
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