import {
  GoogleGenAI,
  Modality,
  Content,
  FunctionDeclaration,
} from '@google/genai';

import { Agent, AgentOptions } from './agent';
import { ToolDefinition } from '../tools/toolTypes';
import { toGeminiFunction } from '../tools/toolConverter';
import { Message } from 'mem0ai';

/**
 * GeminiAgentOptions defines config specific to GeminiAgent
 */
export interface GeminiAgentOptions extends Omit<AgentOptions<ToolDefinition>, 'client'> {
  client: GoogleGenAI;
}

/**
 * GeminiAgent integrates Google Gemini AI with mem0 memory and tool support.
 */
export class GeminiAgent extends Agent<ToolDefinition> {
  private readonly models: GoogleGenAI['models'];

  constructor(options: GeminiAgentOptions) {
    super(options);

    if (!(options.client instanceof GoogleGenAI)) {
      throw new Error('GeminiAgent requires a GoogleGenAI client');
    }

    this.models = options.client.models;
  }

  private toFunctionDeclarations(): FunctionDeclaration[] {
    return this.tools.map(toGeminiFunction);
  }

  private buildConfig():
    | {
        tools: [{ functionDeclarations: FunctionDeclaration[] }];
      }
    | undefined {
    return this.tools.length > 0
      ? { tools: [{ functionDeclarations: this.toFunctionDeclarations() }] }
      : undefined;
  }

  private formatHistory(messages: Message[]): Content[] {
    return messages
      .filter((msg) => typeof msg.content === 'string')
      .map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content as string }],
      }));
  }

  /**
   * Execute a tool call by name with given arguments
   */
  protected async executeToolCall(name: string, args: any): Promise<string> {
    const tool = await this.getToolByName(name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    if (typeof tool.raw !== 'function') throw new Error(`Tool "${name}" has no executable "raw"`);

    try {
      const result = await tool.raw(args);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (err: any) {
      this.logger.error(`Tool execution failed for "${name}": ${err.message}`);
      throw new Error(`Tool execution failed for "${name}": ${err.message}`);
    }
  }

  /**
   * Save a message in mem0 Message format
   */
  private async saveMessage(role: 'user' | 'assistant', text: string, extraMetadata?: Record<string, any>): Promise<void> {
    if (!this.saveChat) return;
    const message: Message = { role, content: text };
    await this.saveChatHistory([message], {
      role,
      agentName: this.name,
      modelId: this.modelId,
      timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
      ...extraMetadata,
    });
  }

  /**
   * Process a single input and return full response text
   */
  async process(input: string): Promise<string> {
    try {
      const memories = await this.fetchChatHistory(input, 10);
      const history = this.formatHistory(memories);

      const contents: Content[] = [
        { role: 'user', parts: [{ text: this.prompt }] },
        ...history,
        { role: 'user', parts: [{ text: input }] },
      ];

      const response = await this.models.generateContent({
        model: this.modelId,
        contents,
        config: this.buildConfig(),
      });

      let content = response.text ?? '';

      const toolCall = response.functionCalls?.[0];
      if (toolCall) {
        content = await this.executeToolCall(toolCall.name!, toolCall.args);
      }

      await this.saveMessage('user', input);
      await this.saveMessage('assistant', content, toolCall ? { toolCall } : {});

      return content;
    } catch (error) {
      this.logger.error('Failed to process input:', error);
      throw error;
    }
  }

  /**
   * Process input and return streaming output chunks
   */
  async *processStream(input: string): AsyncGenerator<string> {
    try {
      const memories = await this.fetchChatHistory(input, 10);
      const history = this.formatHistory(memories);

      const contents: Content[] = [
        { role: 'user', parts: [{ text: this.prompt }] },
        ...history,
        { role: 'user', parts: [{ text: input }] },
      ];

      const stream = await this.models.generateContentStream({
        model: this.modelId,
        contents,
        config: {
          responseModalities: [Modality.TEXT],
          ...this.buildConfig(),
        },
      });

      let content = '';

      for await (const chunk of stream) {
        const text = chunk.text?.trim();
        if (text) {
          content += text;
          yield text;
        }
      }

      if (this.tools.length > 0) {
        const finalResponse = await this.models.generateContent({
          model: this.modelId,
          contents,
          config: this.buildConfig(),
        });

        if (finalResponse.functionCalls?.length) {
          const [call] = finalResponse.functionCalls;
          const toolResult = await this.executeToolCall(call.name!, call.args);

          yield `\n\n🔧 Function Call: ${call.name}\n${toolResult}`;

          await this.saveMessage('user', input);
          await this.saveMessage('assistant', toolResult, { toolCall: call });
          return;
        }
      }

      await this.saveMessage('user', input);
      await this.saveMessage('assistant', content);

    } catch (error) {
      this.logger.error('Failed to process streaming input:', error);
      throw error;
    }
  }
}
