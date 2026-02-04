'use client';

import { useState, useEffect, useRef } from 'react';

// Define Message Interface
interface Message {
  role: 'user' | 'bot';
  content: string;
  source?: string;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'bot', 
      content: 'Jambo! I am the EAC Digital Assistant. How can I help you with information regarding the Community today?' 
    }
  ]);
  const [loading, setLoading] = useState(false);
  
  // Use a ref for auto-scrolling
  const endRef = useRef<HTMLDivElement>(null);
  
  // Safely get API URL (fallback to localhost if undefined to prevent crash)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Scroll to bottom when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial Knowledge Base Refresh (Silent)
  useEffect(() => {
    const refreshData = async () => {
        try {
            await fetch(`${API_URL}/refresh`, { method: 'POST' });
        } catch (error) {
            console.error("Background refresh failed:", error);
        }
    };
    refreshData();
  }, [API_URL]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userQuery = input;
    setInput(''); // Clear input immediately
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      });

      if (!res.ok) throw new Error('Network response was not ok');
      
      const data = await res.json();
      
      setMessages(prev => [
        ...prev, 
        { role: 'bot', content: data.answer, source: data.source }
      ]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev, 
        { role: 'bot', content: "I am having trouble connecting to the EAC servers. Please try again later." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-[calc(100vh-8px)] max-w-4xl mx-auto bg-white shadow-xl border-x border-gray-200">
      
      {/* Official Header */}
      <header className="bg-[#008C00] text-white p-6 shadow-md flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-wide">East African Community</h1>
            <p className="text-xs opacity-90 uppercase tracking-wider font-semibold">One People, One Destiny</p>
        </div>
        {/* Placeholder for Logo if you have one, or just a stylized text */}
        <div className="hidden md:block text-right">
            <div className="text-sm font-semibold">Digital Secretariat</div>
            <div className="text-xs text-yellow-300">Arusha, Tanzania</div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
                className={`max-w-[85%] md:max-w-[75%] rounded-lg p-5 shadow-sm border ${
                    m.role === 'user' 
                    ? 'bg-[#0066CC] text-white border-blue-700'  // User: EAC Blue
                    : 'bg-white text-gray-800 border-gray-200'   // Bot: Clean White/Gray
                }`}
            >
              <p className="leading-relaxed text-sm md:text-base whitespace-pre-wrap">{m.content}</p>
              
              {/* Citation Footer */}
              {m.source && (
                <div className={`mt-3 pt-2 text-xs border-t ${m.role === 'user' ? 'border-blue-500/50 text-blue-100' : 'border-gray-100 text-gray-500'}`}>
                  <span className="font-semibold uppercase mr-1">Source:</span> {m.source}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
            <div className="flex justify-start">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-[#008C00] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#FFD700] rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-[#D21034] rounded-full animate-bounce delay-150"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-4">
            <input 
              className="flex-1 p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008C00] focus:border-transparent text-gray-900 placeholder-gray-500"
              placeholder="Type your inquiry here..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              disabled={loading}
              className="bg-[#008C00] hover:bg-green-700 text-white font-bold px-8 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm tracking-wide"
            >
              Send
            </button>
        </div>
        <div className="text-center mt-2">
            <p className="text-[10px] text-gray-400">Official EAC Digital Tool. Information is retrieved from the EAC Factsheet and Official Website.</p>
        </div>
      </div>
    </main>
  );
}