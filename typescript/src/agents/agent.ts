import Logger from '../utils/logger';
import { ToolDefinition } from '../tools/toolTypes';
import { MemoryClient, Message } from 'mem0ai';

/**
 * Generic AI client interface for different AI providers
 */
export type AIClient = unknown;

/**
 * Configuration options for creating an Agent instance
 * @template Tool - The type of tools this agent can use
 */
export interface AgentOptions<Tool = ToolDefinition> {
  name: string;
  client?: AIClient;
  modelId: string;
  prompt: string;
  tools?: Tool[];
  memoryClient?: MemoryClient;
  mem0UserId?: string;
  saveChat?: boolean;
  streaming?: boolean;
  logger?: Logger;
}

/**
 * Abstract base class for AI agents with mem0 memory integration
 * 
 * This class provides a foundation for building AI agents that can:
 * - Process user inputs and generate responses
 * - Use tools to perform specific tasks
 * - Save and retrieve chat history using mem0
 * - Stream responses for real-time interaction
 * 
 * @template Tool - The type of tools this agent can use
 */
export abstract class Agent<Tool = ToolDefinition> {
  protected readonly name: string;  
  protected readonly client?: AIClient;
  protected readonly modelId: string;
  protected readonly prompt: string;
  protected readonly tools: Tool[];
  protected readonly saveChat: boolean;
  protected readonly streaming: boolean;
  protected readonly logger: Logger;
  protected readonly mem0UserId?: string;
  protected readonly memoryClient?: MemoryClient;

  /**
   * Creates a new Agent instance
   * 
   * @param options - Configuration options for the agent
   * @throws {Error} When saveChat is true but mem0UserId is not provided
   * @throws {Error} When saveChat is true but memoryClient is not provided
   */
  constructor(options: AgentOptions<Tool>) {
    this.name = options.name;
    this.client = options.client;
    this.modelId = options.modelId;
    this.prompt = options.prompt;
    this.tools = options.tools ?? [];
    this.memoryClient = options.memoryClient;
    this.mem0UserId = options.mem0UserId;
    this.saveChat = options.saveChat ?? false;
    this.streaming = options.streaming ?? false;
    this.logger = options.logger ?? new Logger();

    // Validate memory configuration
    if (this.saveChat && !this.mem0UserId) {
      throw new Error(
        `Agent "${this.name}" requires mem0UserId when saveChat=true.`
      );
    }

    if (this.saveChat && !this.memoryClient) {
      throw new Error(
        `Agent "${this.name}" requires memoryClient when saveChat=true.`
      );
    }
  }

  /**
   * Saves a message to the chat history using mem0
   * 
   * @param message - The message content to save
   * @param metadata - Optional metadata to associate with the message
   * @returns Promise that resolves when the message is saved
   */
  protected async saveChatHistory(message: Message[], metadata?: Record<string, any>): Promise<void> {
    if (!this.saveChat || !this.memoryClient || !this.mem0UserId) return;
    
    try {
      await this.memoryClient.add(message, { 
        user_id: this.mem0UserId,
        ...metadata 
      });
    } catch (error) {
      this.logger.error('Failed to save chat history:', error);
    }
  }

  /**
   * Searches for relevant memories based on a query
   * 
   * @param query - The search query to find relevant memories
   * @param limit - Maximum number of results to return (default: 10)
   * @returns Promise that resolves to an array of matching memories
   */
  protected async fetchChatHistory(query: string, limit?: number): Promise<any[]> {
    if (!this.memoryClient || !this.mem0UserId) return [];
    
    try {
      const result = await this.memoryClient.search(query, { 
        user_id: this.mem0UserId,
        limit: limit ?? 10
      });
      return result || [];
    } catch (error) {
      this.logger.error('Failed to fetch chat history:', error);
      return [];
    }
  }

  /**
   * Retrieves all memories for the current user
   * 
   * @param limit - Maximum number of memories to return (default: 10)
   * @returns Promise that resolves to an array of all user memories
   */
  protected async getChatMemories(limit?: number): Promise<any[]> {
    if (!this.memoryClient || !this.mem0UserId) return [];
    
    try {
      const result = await this.memoryClient.getAll({ 
        user_id: this.mem0UserId,
        limit: limit ?? 10
      });
      return result || [];
    } catch (error) {
      this.logger.error('Failed to get chat memories:', error);
      return [];
    }
  }

  /**
   * Deletes a specific memory by its ID
   * 
   * @param memoryId - The unique identifier of the memory to delete
   * @returns Promise that resolves when the memory is deleted
   */
  protected async deleteMemory(memoryId: string): Promise<void> {
    if (!this.memoryClient) return;
    
    try {
      await this.memoryClient.delete(memoryId);
    } catch (error) {
      this.logger.error('Failed to delete memory:', error);
    }
  }

  /**
   * Finds a tool by its name from the available tools
   * 
   * @param name - The name of the tool to find
   * @returns Promise that resolves to the tool if found, undefined otherwise
   */
  protected async getToolByName(name: string): Promise<Tool | undefined> {
    return this.tools.find((tool: any) => tool.name === name);
  }

  /**
   * Processes a user input and returns a response
   * 
   * @param input - The user input to process
   * @returns Promise that resolves to the agent's response
   * 
   * @abstract This method must be implemented by subclasses
   */
  abstract process(input: string): Promise<string>;

  /**
   * Processes a user input and returns a streaming response
   * 
   * @param input - The user input to process
   * @returns AsyncGenerator that yields response chunks
   * 
   * @abstract This method must be implemented by subclasses
   */
  abstract processStream(input: string): AsyncGenerator<string>;

}