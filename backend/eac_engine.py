import os
import requests
import asyncio
from bs4 import BeautifulSoup
from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec
from factsheet import EAC_FACTS
import urllib3

# Suppress SSL warnings common with some govt websites
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class EACKnowledgeBase:
    def __init__(self):
        # Initialize OpenAI (Client v1.0+)
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Initialize Pinecone (SDK v3.0+)
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index_name = "eac-data"
        
        # Check/Create Index
        existing_indexes = [i.name for i in self.pc.list_indexes()]
        if self.index_name not in existing_indexes:
            try:
                self.pc.create_index(
                    name=self.index_name,
                    dimension=1536, # Matches text-embedding-3-small
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
            except Exception as e:
                print(f"Index creation note: {e}")

        self.index = self.pc.Index(self.index_name)

    def _get_embedding(self, text):
        text = text.replace("\n", " ")
        return self.openai_client.embeddings.create(
            input=[text], 
            model="text-embedding-3-small"
        ).data[0].embedding

    async def answer_question(self, query: str):
        clean_query = query.lower()

        # 1. FACTSHEET CHECK (Prioritized)
        for key, fact in EAC_FACTS.items():
            if key in clean_query:
                return {
                    "answer": fact["answer"],
                    "source": fact["source"],
                    "context_used": "Direct Look-up"
                }

        # 2. VECTOR SEARCH (Pinecone)
        try:
            query_embedding = self._get_embedding(query)
            search_results = self.index.query(
                vector=query_embedding,
                top_k=3,
                include_metadata=True
            )
            
            contexts = [
                f"{match['metadata']['text']} (Source: {match['metadata']['url']})" 
                for match in search_results['matches']
            ]
            context_str = "\n\n".join(contexts) if contexts else "No specific documents found."

            # 3. GENERATION (GPT-4o-mini)
            system_prompt = "You are an expert on the East African Community. Use the context to answer accurately."
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {query}"}
                ],
                temperature=0.3
            )
            
            return {
                "answer": response.choices[0].message.content,
                "source": "Dynamic Knowledge Base (eac.int)",
                "context_used": context_str[:100] + "..."
            }

        except Exception as e:
            print(f"Error: {e}")
            return {"answer": "I am unable to process that request right now.", "source": "System Error"}

    def build_knowledge_base(self):
        """Scrapes EAC website and upserts to Pinecone."""
        print("Starting Knowledge Base Refresh...")
        urls = ["https://www.eac.int/overview", "https://www.eac.int/institutions"]
        
        vectors = []
        for url in urls:
            try:
                # SSL verification disabled for robustness against older server certs
                response = requests.get(url, verify=False, timeout=15)
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Simple extraction: paragraphs with substantial text
                texts = [p.get_text().strip() for p in soup.find_all('p') if len(p.get_text()) > 60]
                
                for i, text in enumerate(texts):
                    embedding = self._get_embedding(text)
                    vectors.append({
                        "id": f"{url}-{i}",
                        "values": embedding,
                        "metadata": {"text": text, "url": url}
                    })
            except Exception as e:
                print(f"Failed to scrape {url}: {e}")

        # Batch Upsert
        if vectors:
            batch_size = 50
            for i in range(0, len(vectors), batch_size):
                self.index.upsert(vectors=vectors[i:i+batch_size])
        print("Refresh Complete.")