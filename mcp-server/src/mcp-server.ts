import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Client } from "pg";
import { Ollama } from 'ollama'

const dbConfig = {
  host: 'localhost',
  port: 5433,
  user: 'docker',
  password: 'docker',
  database: 'docker',
};

const ollama = new Ollama({ host: 'http://localhost:11434' })
const model = "llama3.2:3b"

const mcpServer = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
});

mcpServer.registerTool("chat",
  {
    inputSchema: { 
      message: z.string().min(1).max(1000)
    }
  },
  async ({ message }) => {
    const db = new Client(dbConfig);
    
    try {
      await db.connect();
      
      const tablesResult = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public';");
      
      const columnsResult = await db.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema='public' 
        ORDER BY table_name, ordinal_position;
      `);
      
      const sqlPrompt = `
        Você é um assistente que APENAS gera queries SQL válidas para PostgreSQL.
        Pergunta: "${message}"
        Tabelas disponíveis: ${JSON.stringify(tablesResult.rows)}
        Colunas disponíveis: ${JSON.stringify(columnsResult.rows)}

        INSTRUÇÕES CRÍTICAS:
        - Gere APENAS uma query SQL válida
        - Se não conseguir gerar SQL para esta pergunta, responda exatamente: "NO_QUERY"
        - Não adicione explicações, comentários ou texto adicional
        - Use apenas as tabelas e colunas fornecidas acima
      `;

      const sqlQuery = await ollama.chat({
        model,
        messages: [{ role: 'user', content: sqlPrompt }],
      });
      
      const cleanQuery = sqlQuery.message.content.trim().replace(/```sql|```/g, '').trim().replace(/;$/, '');
      
      if (!cleanQuery || cleanQuery === 'NO_QUERY' || cleanQuery.length < 10) {
        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              error: 'Não foi possível gerar uma consulta SQL para esta pergunta.' 
            }, null, 2) 
          }] 
        };
      }
      
      const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
      const upperQuery = cleanQuery.toUpperCase();
      
      if (dangerousKeywords.some(keyword => upperQuery.includes(keyword))) {
        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              error: 'Apenas consultas SELECT são permitidas.' 
            }, null, 2) 
          }] 
        };
      }
      
      const result = await db.query(cleanQuery);
      
      if (!result.rows || result.rows.length === 0) {
        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              message: 'Nenhum resultado encontrado para sua consulta.' 
            }, null, 2) 
          }] 
        };
      }
      
      const responsePrompt = `
        Responda à pergunta: "${message}"
        Baseando-se EXCLUSIVAMENTE nestes dados: ${JSON.stringify(result.rows)}

        REGRAS OBRIGATÓRIAS:
        - Responda APENAS com base nos dados fornecidos
        - Máximo 2 frases
        - Se os dados não respondem à pergunta, diga "Os dados disponíveis não permitem responder essa pergunta"
        - Não invente informações que não estão nos dados
        - Seja direto e objetivo
      `;

      const finalResponse = await ollama.chat({
        model,
        messages: [{ role: 'user', content: responsePrompt }],
      });
      
      const finalMessage = finalResponse.message.content.trim();
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ message: finalMessage }, null, 2) 
        }] 
      };

    } catch (error) {
      console.error('Database error:', error);
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            error: 'Erro ao consultar o banco de dados.' 
          }, null, 2) 
        }] 
      };
    } finally {
      await db.end();
    }
  }
);

const transport = new StdioServerTransport();

mcpServer.connect(transport).then(() => {
  console.log("Server connected");
}).catch(err => {
  console.error("Error connecting server:", err);
});