'use client';

import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";

export default function Community() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('timestamp'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages: any[] = [];
      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      setMessages(messages);
    });

    return () => unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (newMessage.trim() === '') return;

    await addDoc(collection(db, "groups"), {
      text: newMessage,
      timestamp: new Date(),
    });

    setNewMessage('');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Community Chat</h1>

      <div className="chat-container h-96 overflow-y-auto border rounded-lg p-4 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className="chat chat-start">
            <div className="chat-bubble">{msg.text}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Type your message..."
          className="input input-bordered w-full"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button className="btn btn-primary" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}