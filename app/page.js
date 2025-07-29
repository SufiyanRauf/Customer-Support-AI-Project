'use client'

import { Box, Stack, TextField, Button } from "@mui/material";
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m the HeadStarter Agent. How can I assist you today?',
    }
  ]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const currentMessage = message;
    const newMessages = [
      ...messages,
      { role: 'user', content: currentMessage },
    ];
    
    setMessages(newMessages);
    setMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newMessages),
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }
      
      setMessages(prev => [...prev, {role: 'assistant', content: ''}]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        
        setMessages(prevMessages => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          const updatedLastMessage = {
            ...lastMessage,
            content: lastMessage.content + chunk,
          };
          return [...prevMessages.slice(0, -1), updatedLastMessage];
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev.slice(0, -1), {role: 'assistant', content: 'Sorry, I ran into an error.'}]);
    }
  };

  return (
    <Box
      width="100%"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      sx={{ p: 2, boxSizing: 'border-box', bgcolor: '#f5f5f5' }}
    >
      <Stack
        width="100%"
        maxWidth="800px"
        height="100%"
        maxHeight="90vh"
        border="1px solid #e0e0e0"
        borderRadius={2}
        p={2}
        spacing={2}
        sx={{ boxSizing: 'border-box', bgcolor: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
      >
        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          overflow="auto"
          p={1}
        >
          {messages.map((msg, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                msg.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                bgcolor={
                  msg.role === 'assistant'
                    ? 'primary.main'
                    : 'secondary.main'
                }
                color="white"
                borderRadius={4}
                p={1.5}
                maxWidth="70%"
                sx={{ wordWrap: 'break-word' }}
              >
                {msg.content}
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Type your message"
            fullWidth
            variant="outlined"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button variant="contained" onClick={sendMessage} sx={{height: '56px'}}>
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
```

