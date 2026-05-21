import { useState } from 'react';

export default function MessagesModal({ item, onClose, onSave }) {
  const [messages, setMessages] = useState(Array.isArray(item.messages) ? [...item.messages] : []);
  const [direction, setDirection] = useState(item.direction === 'rtl' ? 'rtl' : 'ltr');
  const [fontSize, setFontSize] = useState(item.fontSize || 24);
  const [speed, setSpeed] = useState(item.speed || 100);
  const [newMsg, setNewMsg] = useState('');

  const addMessage = () => {
    const text = newMsg.trim();
    if (!text) return;
    setMessages(prev => [...prev, text]);
    setNewMsg('');
  };

  const removeMessage = (index) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMessage();
    }
  };

  const handleSave = () => {
    onSave({ messages, direction, fontSize, speed });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#152238]">
          <div>
            <h2 className="text-lg font-bold text-white">Messages defilants</h2>
            <p className="text-[0.7rem] text-white/60 mt-0.5">
              Configurez les messages pour cette zone
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 text-xl leading-none cursor-pointer transition-colors">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Direction toggle */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Direction du defilement</label>
            <div className="flex gap-2">
              <button
                onClick={() => setDirection('ltr')}
                className={`px-4 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-colors ${
                  direction === 'ltr'
                    ? 'bg-[#152238] text-white border-[#152238]'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                &larr; Gauche
              </button>
              <button
                onClick={() => setDirection('rtl')}
                className={`px-4 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-colors ${
                  direction === 'rtl'
                    ? 'bg-[#152238] text-white border-[#152238]'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Droite &rarr;
              </button>
            </div>
          </div>

          {/* Font size slider */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Taille du texte : <span className="font-bold text-[#152238]">{fontSize}px</span>
            </label>
            <input
              type="range"
              min="12"
              max="120"
              step="2"
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-full accent-[#152238]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>12px</span>
              <span>120px</span>
            </div>
          </div>

          {/* Speed slider */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Vitesse de defilement : <span className="font-bold text-[#152238]">{speed}%</span>
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className="w-full accent-[#152238]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Lent (10%)</span>
              <span>Normal (100%)</span>
              <span>Rapide (500%)</span>
            </div>
          </div>

          {/* Add message */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Saisir un message..."
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
            />
            <button
              onClick={addMessage}
              disabled={!newMsg.trim()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#152238] text-white hover:bg-[#1e3a5f] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              +
            </button>
          </div>

          {/* Message list */}
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">Aucun message ajoute</p>
          ) : (
            <ul className="space-y-2">
              {messages.map((msg, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="flex-1 text-sm text-gray-800 truncate">{msg}</span>
                  <button
                    onClick={() => removeMessage(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 text-lg leading-none cursor-pointer transition-colors"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#152238] text-white hover:bg-[#1e3a5f] cursor-pointer transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
