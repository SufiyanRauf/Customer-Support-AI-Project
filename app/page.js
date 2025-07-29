'use client'

import { Box, Stack, TextField, Button } from "@mui/material";
import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi I\'m the Headstarter Agent, how can I assist you today?',
    }
  ]);

  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    const currentMessage = message;
    setMessage('');
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: currentMessage },
      { role: 'assistant', content: '' },
    ]);

    await fetch('/api/chat', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...messages, { role: 'user', content: currentMessage }]),
    }).then(async (res) => {
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      const processText = ({ done, value }) => {
        if (done) {
          return;
        }
        const text = decoder.decode(value || new Int8Array(), { stream: true });
        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          const otherMessages = prevMessages.slice(0, prevMessages.length - 1);
          const updatedLastMessage = {
            ...lastMessage,
            content: lastMessage.content + text,
          };
          return [...otherMessages, updatedLastMessage];
        });
        return reader.read().then(processText);
      };
      return reader.read().then(processText);
    });
  };

  return (
    <Box
      width="100%"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Stack
        direction="column"
        width="600px"
        height="700px"
        border="1px solid black"
        p={2}
        spacing={3}
      >
        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                bgcolor={
                  message.role === 'assistant'
                    ? 'primary.main'
                    : 'secondary.main'
                }
                color="white"
                borderRadius={4}
                p={2}
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label="message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button variant="contained" onClick={sendMessage}> Send</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
