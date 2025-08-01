'use client'

import { Box, Stack, TextField, Button, Paper, Typography, Avatar, CircularProgress, createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { useState, useRef, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { keyframes } from '@emotion/react';

// Define a fun, colorful theme
const colorfulTheme = createTheme({
  palette: {
    primary: {
      main: '#6200ea', // A vibrant purple
    },
    secondary: {
      main: '#03dac6', // A bright teal
    },
    background: {
      default: '#f4f7f6',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Poppins', sans-serif",
    h5: {
      fontWeight: 700,
    },
  },
});

// Keyframe animation for message fade-in
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Component for rendering a single message
const Message = ({ msg }) => {
  const isAssistant = msg.role === 'assistant';

  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
    };

    return !inline && match ? (
      <Box sx={{ position: 'relative', my: 1, borderRadius: 2, overflow: 'hidden' }}>
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {code}
        </SyntaxHighlighter>
        <Button
          size="small"
          onClick={handleCopy}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          <ContentCopyIcon fontSize="small" />
        </Button>
      </Box>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };
  
  const renderContent = (content) => {
    return content.split(/(```[\s\S]*?```)/g).map((part, index) => {
      if (part.startsWith('```')) {
        const language = part.match(/```(\w+)/)?.[1] || '';
        const code = part.replace(/```\w+\n|```/g, '');
        return <CodeBlock key={index} className={`language-${language}`}>{code}</CodeBlock>
      }
      return part;
    });
  };

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="flex-end"
      justifyContent={isAssistant ? 'flex-start' : 'flex-end'}
      sx={{ animation: `${fadeIn} 0.5s ease-in-out` }}
    >
      {isAssistant && (
        <Avatar sx={{ bgcolor: 'secondary.main', width: 40, height: 40, color: 'white' }}>
          🤖
        </Avatar>
      )}
      <Paper
        elevation={3}
        sx={{
          p: 1.5,
          borderRadius: isAssistant ? '20px 20px 20px 5px' : '20px 20px 5px 20px',
          bgcolor: isAssistant ? 'background.paper' : 'primary.main',
          color: isAssistant ? 'black' : 'white',
          maxWidth: '80%',
          wordWrap: 'break-word',
        }}
      >
        {renderContent(msg.content)}
      </Paper>
      {!isAssistant && (
        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
          😊
        </Avatar>
      )}
    </Stack>
  );
};


export default function HomeWrapper() {
  // Add this to your layout.js or _app.js head section
  // <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap" rel="stylesheet">
  return (
    <ThemeProvider theme={colorfulTheme}>
      <CssBaseline />
      <Home />
    </ThemeProvider>
  )
}

function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi there! I\'m your AI Interview Prep Assistant. How can I help you today?',
    }
  ]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    setIsTyping(true);
    const currentMessage = message;
    const newMessages = [
      ...messages,
      { role: 'user', content: currentMessage },
    ];
    
    setMessages(newMessages);
    setMessage('');

    try {
      const response = await fetch('/api/router', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
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
      setMessages(prev => [...prev.slice(0, -1), {role: 'assistant', content: 'Oops! Something went a bit sideways. Please try again.'}]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100vh"
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Paper elevation={4} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
        <Typography variant="h5" component="h1" align="center" color="primary.main">
          AI Interview Prep Assistant
        </Typography>
      </Paper>
      <Stack
        spacing={2.5}
        flexGrow={1}
        overflow="auto"
        p={{ xs: 1, sm: 2, md: 3 }}
      >
        {messages.map((msg, index) => (
          <Message key={index} msg={msg} />
        ))}
        {isTyping && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pl: 1 }}>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 40, height: 40, color: 'white' }}>
              🤖
            </Avatar>
            <CircularProgress size={24} color="secondary" />
          </Stack>
        )}
        <div ref={messagesEndRef} />
      </Stack>
      <Paper elevation={4} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Ask me anything..."
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
            disabled={isTyping}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '28px',
                bgcolor: 'white',
              },
            }}
          />
          <Button 
            variant="contained" 
            onClick={sendMessage} 
            disabled={isTyping} 
            sx={{
              borderRadius: '50%',
              width: 56,
              height: 56,
              minWidth: 56,
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
            }}
          >
            <SendRoundedIcon />
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}