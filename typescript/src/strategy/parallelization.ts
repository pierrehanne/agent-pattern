import type { Agent } from '../agents/agent';
import Logger from '../utils/logger';

interface ParallelizationOptions<A extends Agent = Agent> {
  agents: A[];            // Agents to run subtasks in parallel
  aggregator: A;          // Agent to aggregate final results
  logger?: Logger;
}

/**
 * Executes multiple agents in parallel, then aggregates their results with a final agent.
 */
export class ParallelizationPattern<A extends Agent = Agent> {
  private agents: A[];
  private aggregator: A;
  private logger: Logger;

  constructor(options: ParallelizationOptions<A>) {
    if (!options.agents.length) {
      throw new Error('ParallelizationPattern requires at least one parallel agent');
    }
    this.agents = options.agents;
    this.aggregator = options.aggregator;
    this.logger = options.logger ?? new Logger();

    this.logger.info(`ParallelizationPattern initialized with ${this.agents.length} parallel agents and 1 aggregator agent`);
  }

  /**
   * Run parallel agents with their individual prompts, then aggregate results.
   * @param prompts - Array of prompts, one for each parallel agent.
   * @returns Aggregated final result.
   */
  async run(prompts: string[]): Promise<string> {
    if (prompts.length !== this.agents.length) {
      throw new Error('Number of prompts must match number of parallel agents');
    }

    this.logger.info('Starting parallel execution of agents');

    // Launch all parallel tasks simultaneously
    const taskPromises = this.agents.map((agent, idx) => {
      this.logger.debug(`Running agent ${agent['name']} with prompt: ${prompts[idx].slice(0, 80)}...`);
      return agent.process(prompts[idx]);
    });

    // Await all results concurrently
    const results = await Promise.all(taskPromises);

    this.logger.info('Parallel agents completed. Aggregating results.');

    // Combine results into one aggregation prompt
    const aggregatedPrompt = this.buildAggregationPrompt(results);

    this.logger.debug(`Aggregation prompt:\n${aggregatedPrompt}`);

    // Run aggregator agent on combined results
    const aggregatedResult = await this.aggregator.process(aggregatedPrompt);

    this.logger.info('Aggregation completed');

    return aggregatedResult;
  }

  /**
   * Helper to format aggregation prompt from parallel results.
   * Customize this to your needs (e.g., add instructions).
   * @param results - Results from parallel agents.
   */
  protected buildAggregationPrompt(results: string[]): string {
    return [
      `Combine the following outputs into a single cohesive summary:\n`,
      ...results.map((res, i) => `Result ${i + 1}:\n${res}\n`),
    ].join('\n');
  }
}
