import express from 'express'
import cors from 'cors'
import { MCPClient } from './mcp-client'

const app = express()

app.use(cors())
app.use(express.json())

app.post('/chat', async (req, res) => {
  const mcpClient = new MCPClient();
  
  try {
    const { message } = req.body
    
    if (!message) {
      return res.status(400).send({ error: 'Message is required' })
    }
    
    await mcpClient.connect();
    
    const result = await mcpClient.chat(message);
    
    const parsedResult = JSON.parse((result.content as any)[0].text);
    
    res.json(parsedResult)
  } catch (error) {
    console.error("Error occurred:", error);
    
    res.status(500).send({ error: 'Internal Server Error' });
  } finally {
    await mcpClient.disconnect();
  }
})

app.listen(4001, () => {
  console.log('Server is running on http://localhost:4001')
})