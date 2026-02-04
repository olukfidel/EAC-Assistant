'use client';
import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'bot';
  content: string;
  source?: string;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Habari! I am the EAC Assistant. Ask me about Member States, protocols, or facts.' }
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Auto-scroll
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  // Auto-refresh knowledge base on visit
  useEffect(() => {
    fetch(`${API_URL}/refresh`, { method: 'POST' }).catch(console.error);
  }, [API_URL]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const q = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.answer, source: data.source }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', content: "Connection error." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 bg-gray-50 font-sans">
      <header className="py-4 border-b mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">EAC Assistant</h1>
        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Online</span>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 rounded-lg max-w-[80%] shadow-sm ${
              m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-800'
            }`}>
              <p className="leading-relaxed">{m.content}</p>
              {m.source && (
                <div className="mt-2 text-xs opacity-75 border-t pt-2 border-slate-200">
                  Source: {m.source}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-slate-400 animate-pulse">Thinking...</div>}
        <div ref={endRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input 
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 ring-blue-500 text-black"
          placeholder="Ask a question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button 
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}