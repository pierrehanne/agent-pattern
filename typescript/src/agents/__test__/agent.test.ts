import { Agent, AgentOptions } from '../agent';
import { ToolDefinition } from '../../tools/toolTypes';
import { MemoryClient, Message } from 'mem0ai';
import Logger from '../../utils/logger';

// DummyAgent for testing the abstract Agent base class
class DummyAgent extends Agent {
  async process(input: string): Promise<string> {
    return `Processed: ${input}`;
  }

  async *processStream(input: string): AsyncGenerator<string> {
    yield `Streamed: ${input}`;
  }

  // Expose protected methods for testing
  public async testSaveChatHistory(messages: Message[], metadata?: Record<string, any>) {
    return this['saveChatHistory'](messages, metadata);
  }

  public async testFetchChatHistory(query: string): Promise<Message[]> {
    return this['fetchChatHistory'](query);
  }

  public async testGetChatMemories(limit?: number): Promise<Message[]> {
    return this['getChatMemories'](limit);
  }

  public async testDeleteMemory(memoryId: string): Promise<void> {
    return this['deleteMemory'](memoryId);
  }

  public async testGetToolByName(name: string): Promise<ToolDefinition | undefined> {
    return this['getToolByName'](name);
  }
}

describe('Agent base class', () => {
  const baseOptions: AgentOptions = {
    name: 'test-agent',
    modelId: 'test-model',
    prompt: 'Test prompt',
  };

  it('should throw if saveChat is true but mem0UserId is not provided', () => {
    expect(() => {
      new DummyAgent({
        ...baseOptions,
        saveChat: true,
        memoryClient: {} as MemoryClient,
      });
    }).toThrow(/requires mem0UserId/);
  });

  it('should throw if saveChat is true but memoryClient is not provided', () => {
    expect(() => {
      new DummyAgent({
        ...baseOptions,
        saveChat: true,
        mem0UserId: 'user-id',
      });
    }).toThrow(/requires memoryClient/);
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
    });

    const response = await agent.process('Hello');
    expect(response).toBe('Processed: Hello');

    const chunks: string[] = [];
    for await (const chunk of agent.processStream('Stream this')) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Streamed: Stream this']);
  });

  it('should call memoryClient.add when saveChat is enabled', async () => {
    const mockAdd = jest.fn();
    const memoryClient: MemoryClient = {
      add: mockAdd,
      search: jest.fn(),
      getAll: jest.fn(),
      delete: jest.fn(),
    } as unknown as MemoryClient;

    const agent = new DummyAgent({
      ...baseOptions,
      saveChat: true,
      mem0UserId: 'user123',
      memoryClient,
    });

    const messages: Message[] = [{ role: 'user', content: 'hello' }];

    await agent.testSaveChatHistory(messages, { topic: 'test' });

    expect(mockAdd).toHaveBeenCalledWith(messages, {
      user_id: 'user123',
      topic: 'test',
    });
  });

  it('fetchChatHistory returns [] if memoryClient or userId is not defined', async () => {
    const agent = new DummyAgent(baseOptions);
    const messages = await agent.testFetchChatHistory('query');
    expect(messages).toEqual([]);
  });

  it('fetchChatHistory returns matching memories', async () => {
    const mockSearch = jest.fn().mockResolvedValue([{ role: 'user', content: 'hi' }]);
    const memoryClient: MemoryClient = {
      add: jest.fn(),
      search: mockSearch,
      getAll: jest.fn(),
      delete: jest.fn(),
    } as unknown as MemoryClient;

    const agent = new DummyAgent({
      ...baseOptions,
      saveChat: true,
      mem0UserId: 'userX',
      memoryClient,
    });

    const result = await agent.testFetchChatHistory('hello');
    expect(mockSearch).toHaveBeenCalledWith('hello', { user_id: 'userX', limit: 10 });
    expect(result).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('getChatMemories returns [] if memoryClient or userId is not defined', async () => {
    const agent = new DummyAgent(baseOptions);
    const memories = await agent.testGetChatMemories();
    expect(memories).toEqual([]);
  });

  it('getChatMemories calls memoryClient.getAll with default limit', async () => {
    const mockGetAll = jest.fn().mockResolvedValue([{ role: 'assistant', content: 'test' }]);
    const memoryClient: MemoryClient = {
      add: jest.fn(),
      search: jest.fn(),
      getAll: mockGetAll,
      delete: jest.fn(),
    } as unknown as MemoryClient;

    const agent = new DummyAgent({
      ...baseOptions,
      saveChat: true,
      mem0UserId: 'userY',
      memoryClient,
    });

    const result = await agent.testGetChatMemories();
    expect(mockGetAll).toHaveBeenCalledWith({ user_id: 'userY', limit: 10 });
    expect(result).toEqual([{ role: 'assistant', content: 'test' }]);
  });

  it('getChatMemories uses provided limit', async () => {
    const mockGetAll = jest.fn().mockResolvedValue([{ role: 'assistant', content: 'limited' }]);
    const memoryClient: MemoryClient = {
      add: jest.fn(),
      search: jest.fn(),
      getAll: mockGetAll,
      delete: jest.fn(),
    } as unknown as MemoryClient;

    const agent = new DummyAgent({
      ...baseOptions,
      saveChat: true,
      mem0UserId: 'userZ',
      memoryClient,
    });

    const result = await agent.testGetChatMemories(3);
    expect(mockGetAll).toHaveBeenCalledWith({ user_id: 'userZ', limit: 3 });
    expect(result).toEqual([{ role: 'assistant', content: 'limited' }]);
  });

  it('deleteMemory calls memoryClient.delete with correct ID', async () => {
    const mockDelete = jest.fn();
    const memoryClient: MemoryClient = {
      add: jest.fn(),
      search: jest.fn(),
      getAll: jest.fn(),
      delete: mockDelete,
    } as unknown as MemoryClient;

    const agent = new DummyAgent({
      ...baseOptions,
      saveChat: true,
      mem0UserId: 'userA',
      memoryClient,
    });

    await agent.testDeleteMemory('mem123');
    expect(mockDelete).toHaveBeenCalledWith('mem123');
  });

  it('deleteMemory handles error and logs it', async () => {
    const mockDelete = jest.fn().mockRejectedValue(new Error('Deletion failed'));
    const logger = { error: jest.fn() } as unknown as Logger;

    const memoryClient: MemoryClient = {
      add: jest.fn(),
      search: jest.fn(),
      getAll: jest.fn(),
      delete: mockDelete,
    } as unknown as MemoryClient;

    const agent = new DummyAgent({
      ...baseOptions,
      saveChat: true,
      mem0UserId: 'userB',
      memoryClient,
      logger,
    });

    await agent.testDeleteMemory('bad-id');
    expect(logger.error).toHaveBeenCalledWith('Failed to delete memory:', expect.any(Error));
  });

  it('getChatMemories logs error if memoryClient.getAll fails', async () => {
    const mockGetAll = jest.fn().mockRejectedValue(new Error('getAll failed'));
    const logger = { error: jest.fn() } as unknown as Logger;

    const memoryClient: MemoryClient = {
      add: jest.fn(),
      search: jest.fn(),
      getAll: mockGetAll,
      delete: jest.fn(),
    } as unknown as MemoryClient;

    const agent = new DummyAgent({
      ...baseOptions,
      saveChat: true,
      mem0UserId: 'userC',
      memoryClient,
      logger,
    });

    const result = await agent.testGetChatMemories();
    expect(result).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith('Failed to get chat memories:', expect.any(Error));
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
