import { Agent, AgentOptions } from '../agent';
import { ChatMemory } from '../../memories/chatMemory';
import { ChatMessage } from '../../memories/types';

// DummyAgent for testing the abstract Agent base class
class DummyAgent extends Agent {
  async process(input: string): Promise<string> {
    return `Processed: ${input}`;
  }

  async *processStream(input: string): AsyncGenerator<string> {
    yield `Streamed: ${input}`;
  }

  // Expose protected method for testing
  public async testSaveChatHistory(sessionId: string, message: ChatMessage) {
    return this.saveChatHistory(sessionId, message);
  }

  // Expose protected fetchChatHistory for testing
  public async testFetchChatHistory(sessionId: string): Promise<ChatMessage[]> {
    return this.fetchChatHistory(sessionId);
  }

  // Expose protected getToolByName for testing
  public async testGetToolByName(name: string) {
    return this.getToolByName(name);
  }
}

describe('Agent base class', () => {
  const baseOptions: AgentOptions = {
    name: 'test-agent',
    modelId: 'test-model',
    prompt: 'Test prompt',
  };

  it('should throw if saveChat is true but memory is undefined', () => {
    expect(() => {
      new DummyAgent({
        ...baseOptions,
        saveChat: true,
      });
    }).toThrow(
      /Agent "test-agent" was configured with saveChat=true but no memory provided/
    );
  });

  it('should not throw if saveChat is false and memory is undefined', () => {
    expect(() => {
      new DummyAgent({
        ...baseOptions,
        saveChat: false,
      });
    }).not.toThrow();
  });

  it('should instantiate and respond to process and processStream', async () => {
    const agent = new DummyAgent({
      ...baseOptions,
      saveChat: false,
    });

    const response = await agent.process('Hello');
    expect(response).toBe('Processed: Hello');

    const chunks: string[] = [];
    for await (const chunk of agent.processStream('Stream this')) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Streamed: Stream this']);
  });

  it('should call saveMessage when saveChat is true and memory is provided', async () => {
    const mockMemory: ChatMemory = {
      init: jest.fn(),
      saveMessage: jest.fn(),
      getMessages: jest.fn().mockResolvedValue([]),
      deleteSession: jest.fn(),
      listSessions: jest.fn(),
    };

    const agent = new DummyAgent({
      ...baseOptions,
      saveChat: true,
      memory: mockMemory,
    });

    const message: ChatMessage = {
      role: 'user',
      content: 'Memory test',
    };

    await agent.testSaveChatHistory('session-123', message);

    expect(mockMemory.saveMessage).toHaveBeenCalledWith('session-123', message);
  });

 it('fetchChatHistory returns [] if no memory provided', async () => {
    const agent = new DummyAgent({
      name: 'test-agent',
      modelId: 'model',
      prompt: 'prompt',
      // no memory
    });

    const messages = await agent.testFetchChatHistory('session-123');
    expect(messages).toEqual([]);
  });

  it('fetchChatHistory returns messages from memory.getMessages', async () => {
    const mockMemory: ChatMemory = {
      init: jest.fn(),
      saveMessage: jest.fn(),
      getMessages: jest.fn().mockResolvedValue([{ role: 'user', content: 'hi' }]),
      deleteSession: jest.fn(),
      listSessions: jest.fn(),
    };

    const agent = new DummyAgent({
      name: 'test-agent',
      modelId: 'model',
      prompt: 'prompt',
      memory: mockMemory,
    });

    const messages = await agent.testFetchChatHistory('session-123');
    expect(mockMemory.getMessages).toHaveBeenCalledWith('session-123');
    expect(messages).toEqual([{ role: 'user', content: 'hi' }]);
  });
});

describe('Agent tools handling', () => {
  const tool1 = { name: 'tool1', description: 'First tool', parameters: { type: 'object' as const, properties: {} } };
  const tool2 = { name: 'tool2', description: 'Second tool', parameters: { type: 'object' as const, properties: {} } };

  it('should initialize tools from options', () => {
    const agent = new DummyAgent({
      name: 'test-agent',
      modelId: 'model',
      prompt: 'prompt',
      tools: [tool1, tool2],
    });

    expect(agent['tools']).toEqual([tool1, tool2]);
  });

  it('should return tool by name if exists', async () => {
    const agent = new DummyAgent({
      name: 'test-agent',
      modelId: 'model',
      prompt: 'prompt',
      tools: [tool1, tool2],
    });

    const found = await agent.testGetToolByName('tool2');
    expect(found).toEqual(tool2);
  });

  it('should return undefined if tool name does not exist', async () => {
    const agent = new DummyAgent({
      name: 'test-agent',
      modelId: 'model',
      prompt: 'prompt',
      tools: [tool1],
    });

    const found = await agent.testGetToolByName('nonexistent');
    expect(found).toBeUndefined();
  });
});