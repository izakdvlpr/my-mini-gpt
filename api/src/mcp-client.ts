import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class MCPClient {
  private client: Client | null = null;
  
  async connect() {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["../mcp-server/dist/index.js"],
    });

    const client = new Client(
      {
        name: "mcp-client",
        version: "1.0.0"
      }
    );

    this.client = client;
    
    await this.client.connect(transport);
  }

  async chat(message: string) {
    if (!this.client) throw new Error("Client not connected");

    const result = await this.client.callTool({
      name: "chat",
      arguments: { message }
    });
    
    return result;
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
    }
  }
}