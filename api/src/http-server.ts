import express from 'express'
import cors from 'cors'
import { MCPClient } from './mcp-client'
import { OllamaClient } from './ollama-client'

const app = express()

app.use(cors())
app.use(express.json())

app.post('/chat', async (req, res) => {
  try {
    const { message, model } = req.body
    
    if (!message) {
      return res.status(400).send({ error: 'Message is required' })
    }
    
    const mcpClient = new MCPClient();
    
    await mcpClient.connect();
    
    const tables = await mcpClient.getTables();
    
    const context = JSON.stringify(tables, null, 2);
    
    const ollama = new OllamaClient();
    
    const response = await ollama.generate(
      model ?? 'llama3.2:3b', 
      message, 
      context
    );
  
    await mcpClient.disconnect();
    
    res.json({
      response,
      context: {
        tables
      }
    })
  } catch (error) {
    console.error("Error occurred:", error);
    
    res.status(500).send({ error: 'Internal Server Error' });
  }
})

app.get('/models', async (_req, res) => {
  try {
    const ollama = new OllamaClient();
    
    const models = await ollama.listModels();
    
    return res.json({ models });
  } catch (error: any) {
    console.error("Error occurred:", error);
    
    res.status(500).send({ error: 'Internal Server Error' });
  }
})

app.listen(4001, () => {
  console.log('Server is running on http://localhost:4001')
})