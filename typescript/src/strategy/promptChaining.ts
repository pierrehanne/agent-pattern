import type { Agent } from '../agents/agent';
import Logger from '../utils/logger';


/**
 * Executes a sequence of agents in a pipeline.
 * Accepts any Agent implementation (Gemini, OpenAI, etc.).
 */
export class PromptChainPattern<A extends Agent = Agent> {
  private agents: A[];
  private logger: Logger;

  /**
   * Create a PromptChain with a list of agents.
   * @param agents - Array of Agent instances to chain.
   * @param logger - Optional logger instance.
   */
  constructor(agents: A[], logger: Logger = new Logger()) {
    if (!agents.length) {
      throw new Error('PromptChain requires at least one Agent');
    }
    this.agents = agents;
    this.logger = logger;
    this.logger.info(`PromptChainPattern initialized with ${agents.length} agent(s)`);
  }

  /**
   * Run input through each agent sequentially.
   * The final agent streams its output.
   * @param promptInput - The initial user input.
   */
  async *runStream(promptInput: string): AsyncGenerator<string> {
    this.logger.info(`Starting runStream with input: "${promptInput}"`);
    let currentInput = promptInput;

    // All except last agent use non-stream processing
    for (let i = 0; i < this.agents.length - 1; i++) {
      const agent = this.agents[i];
      this.logger.debug(`Running process on agent "${agent['name']}"`);
      currentInput = await agent.process(currentInput);
      this.logger.debug(`Agent "${agent['name']}" output: "${currentInput.substring(0, 100)}${currentInput.length > 100 ? '...' : ''}"`);
    }

    // Final agent yields streaming output
    const lastAgent = this.agents[this.agents.length - 1];
    this.logger.debug(`Starting streaming on final agent "${lastAgent['name']}"`);
    for await (const chunk of lastAgent.processStream(currentInput)) {
      this.logger.debug(`Streaming chunk: "${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}"`);
      yield chunk;
    }

    this.logger.info('runStream completed');
  }

  /**
   * Run input through each agent in the chain and return the final result.
   * @param promptInput - The initial user input.
   */
  async run(promptInput: string): Promise<string> {
    this.logger.info(`Starting run with input: "${promptInput}"`);
    let currentInput = promptInput;

    for (const agent of this.agents) {
      this.logger.debug(`Running process on agent "${agent['name']}"`);
      currentInput = await agent.process(currentInput);
      this.logger.debug(`Agent "${agent['name']}" output: "${currentInput.substring(0, 100)}${currentInput.length > 100 ? '...' : ''}"`);
    }

    this.logger.info('run completed');
    return currentInput;
  }
  
}
