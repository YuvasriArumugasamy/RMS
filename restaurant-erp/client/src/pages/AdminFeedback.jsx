import React, { useEffect, useState } from 'react';

const AdminFeedback = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('feedbacks');
      const arr = raw ? JSON.parse(raw) : [];
      setItems(arr);
    } catch (e) {
      console.error('load feedbacks failed', e);
      setItems([]);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-extrabold mb-4">Customer Feedback</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No feedback submitted yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((f, i) => (
            <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Order: {f.id || '—'}</p>
                <p className="text-xs text-slate-500">{new Date(f.timestamp).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl">{f.emoji}</div>
                <p className="text-sm font-black mt-1">Score: {f.score}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
