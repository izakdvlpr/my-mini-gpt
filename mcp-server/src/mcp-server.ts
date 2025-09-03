import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Client } from "pg";

const dbConfig = {
  host: 'localhost',
  port: 5433,
  user: 'docker',
  password: 'docker',
  database: 'docker',
};

const server = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
});

server.registerResource(
  "tables",
  "tables://list",
  {
    mimeType: "application/json"
  },
  async (uri) => {
    const db = new Client(dbConfig);
    
    try {
      await db.connect();
      
      const result = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public';");
            
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(result.rows, null, 2)
        }]
      };
    } catch (error: any) {
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error?.message }, null, 2)
        }]
      };
    } finally {
      await db.end();
    }
  }
);

server.registerTool("query",
  {
    inputSchema: { sql: z.string().min(1).max(1000) }
  },
  async ({ sql }) => {
    const db = new Client(dbConfig);
    
    try {
      await db.connect();

      const result = await db.query(sql);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.rows)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error?.message }, null, 2)
          }
        ]
      };
    } finally {
      await db.end();
    }
  }
);


const transport = new StdioServerTransport();

server.connect(transport).then(() => {
  console.log("Server connected");
}).catch(err => {
  console.error("Error connecting server:", err);
});
