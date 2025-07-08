import { GoogleGenAI } from '@google/genai';
import { getEnvVar } from '../utils/env';
import { GeminiAgent } from '../agents/geminiAgent';
import { ParallelizationPattern } from '../strategy/parallelization';
import MemoryClient from 'mem0ai';

async function main() {

  // Load API keys
  const Mem0ApiKey = getEnvVar('MEM0_API_KEY');
  const GeminiApiKey = getEnvVar('GEMINI_API_KEY');

  // Initialize clients
  const mem0 = new MemoryClient({ apiKey: Mem0ApiKey });
  const gemini = new GoogleGenAI({ apiKey: GeminiApiKey });

  // Sample chat history saved to mem0 (optional)
  const sampleHistory = [
    { role: 'user' as const, content: 'Hi, can you generate diverse story ideas?' },
    { role: 'assistant' as const, content: 'Sure, I can do that with parallel agents.' },
  ];
  await mem0.add(sampleHistory, { user_id: 'agent-pattern-parallelization-demo' });

  // Create multiple Gemini agents for parallel subtasks
  const adventurousAgent = new GeminiAgent({
    name: 'AdventurousAgent',
    modelId: 'gemini-2.0-flash',
    prompt: 'Write a short, adventurous story idea about a friendly robot exploring a jungle.',
    client: gemini,
    memoryClient: mem0,
    mem0UserId: 'agent-pattern-parallelization-demo',
    saveChat: true,
  });

  const funnyAgent = new GeminiAgent({
    name: 'FunnyAgent',
    modelId: 'gemini-2.0-flash',
    prompt: 'Write a short, funny story idea about a friendly robot exploring a jungle.',
    client: gemini,
    memoryClient: mem0,
    mem0UserId: 'agent-pattern-parallelization-demo',
    saveChat: true,
  });

  const mysteriousAgent = new GeminiAgent({
    name: 'MysteriousAgent',
    modelId: 'gemini-2.0-flash',
    prompt: 'Write a short, mysterious story idea about a friendly robot exploring a jungle.',
    client: gemini,
    memoryClient: mem0,
    mem0UserId: 'agent-pattern-parallelization-demo',
    saveChat: true,
  });

  // Aggregator Gemini agent to synthesize results
  const aggregatorAgent = new GeminiAgent({
    name: 'AggregatorAgent',
    modelId: 'gemini-2.5-flash-preview-04-17',
    prompt: 'Combine the following story ideas into a single, cohesive summary paragraph:',
    client: gemini,
    memoryClient: mem0,
    mem0UserId: 'agent-pattern-parallelization-demo',
    saveChat: true,
  });

  // Instantiate the ParallelizationPattern with agents and aggregator
  const parallelization = new ParallelizationPattern({
    agents: [adventurousAgent, funnyAgent, mysteriousAgent],
    aggregator: aggregatorAgent,
  });

  // Prompts are derived from each agent's base prompt
  const prompts = [
    adventurousAgent['prompt'],
    funnyAgent['prompt'],
    mysteriousAgent['prompt'],
  ];

  // Run parallel agents + aggregation
  const finalOutput = await parallelization.run(prompts);

  console.log('Parallelization Aggregated Output:\n', finalOutput);
}

main().catch(console.error);
