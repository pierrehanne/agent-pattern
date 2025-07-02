import Logger from '../utils/logger';
import { ChatMemory } from '../memories/chatMemory';
import { ChatMessage } from '../memories/types';
import { ToolDefinition } from '../tools/toolTypes';

/** Placeholder for any LLM client (Google, OpenAI, Anthropic, etc.) */
export type AIClient = unknown;

/**
 * Options for creating an Agent.
 *
 * @template Tool – signature of any tool functions
 */
export interface AgentOptions<Tool = ToolDefinition> {
  name: string;
  client?: AIClient;
  modelId: string;
  prompt: string;
  memory?: ChatMemory;
  tools?: Tool[];
  saveChat?: boolean;
  streaming?: boolean;
  logger?: Logger;
}

/**
 * Base class for an AI-driven “agent.”  
 * Subclasses must implement `process` / `processStream`.
 */
export abstract class Agent<Tool = ToolDefinition> {
  protected readonly name: string;
  protected readonly client?: AIClient;
  protected readonly modelId: string;
  protected readonly prompt: string;
  protected readonly memory?: ChatMemory;
  protected readonly tools: Tool[];
  protected readonly saveChat: boolean;
  protected readonly streaming: boolean;
  protected readonly logger: Logger;

  constructor(options: AgentOptions<Tool>) {
    this.name = options.name;
    this.client = options.client;
    this.modelId = options.modelId;
    this.prompt = options.prompt;
    this.memory = options.memory;
    this.tools = options.tools ?? [];
    this.saveChat = options.saveChat ?? false;
    this.streaming = options.streaming ?? false;
    this.logger = options.logger ?? new Logger();
    this.validateOptions();
  }

  /** Ensure runtime invariants */
  private validateOptions(): void {
    if (this.saveChat && !this.memory) {
      throw new Error(
        `Agent "${this.name}" was configured with saveChat=true but no memory provided.`
      );
    }
  }

  /** Save a message to memory, if enabled */
  protected async saveChatHistory(sessionId: string, message: ChatMessage): Promise<void> {
    if (this.saveChat && this.memory) {
      await this.memory.saveMessage(sessionId, message);
    }
  }

  /** Fetch previous messages in a session to build conversation context */
  protected async fetchChatHistory(sessionId: string): Promise<ChatMessage[]> {
    if (!this.memory) return [];
    return this.memory.getMessages(sessionId);
  }

  /** Get Tool by name */
  protected async getToolByName(name: string): Promise<Tool | undefined> {
    return this.tools.find((tool: any) => tool.name === name);
  }

  /**
   * Handle a single-turn input → output.
   * @param input  user message
   * @returns      full response
   */
  abstract process(input: string): Promise<string>;

  /**
   * Handle streaming output.
   * @param input  user message
   * @returns      chunks of response
   */
  abstract processStream(input: string): AsyncGenerator<string>;
}
