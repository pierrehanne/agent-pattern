import { GoogleGenAI } from '@google/genai';
import { getEnvVar } from '../utils/env';
import { GeminiAgent } from '../agents/geminiAgent';
import { PromptChainPattern } from '../strategy/promptChaining';
import MemoryClient from 'mem0ai';

async function main() {

  // Load API keys
  const Mem0ApiKey = getEnvVar('MEM0_API_KEY');
  const GeminiApiKey = getEnvVar('GEMINI_API_KEY');

  // Initialize clients
  const mem0 = new MemoryClient({ apiKey: Mem0ApiKey });
  const gemini = new GoogleGenAI({ apiKey: GeminiApiKey });

  const sampleHistory = [
    {
      role: 'user' as const,
      content: 'Hi, how can you help me?',
    },
    {
      role: 'assistant' as const,
      content: "I'm agent-pattern. I help leverage agentic patterns.",
    },
  ];

  // Save history to mem0
  await mem0.add(sampleHistory, { user_id: 'agent-pattern-prompt-chaining-demo' });

  // Create two Gemini agents
  const summarizer = new GeminiAgent({
    name: 'Summarizer',
    modelId: 'gemini-2.0-flash',
    prompt: 'Summarize the following in 3 sentences:',
    client: gemini
  });

  const translator = new GeminiAgent({
    name: 'Translator',
    modelId: 'gemini-2.0-flash',
    prompt: 'Translate the following to French:',
    client: gemini,
    memoryClient: mem0,
    mem0UserId: 'agent-pattern-prompt-chaining-demo',
    saveChat: true,
  });

  // Chain them using PromptChainPattern
  const chain = new PromptChainPattern([summarizer, translator]);

  // Example input text
  const inputText =
    "Workflow: Prompt Chaining The output of one LLM call sequentially feeds into the input of the next LLM call. This pattern decomposes a task into a fixed sequence of steps. Each step is handled by an LLM call that processes the output from the preceding one. It's suitable for tasks that can be cleanly broken down into predictable, sequential subtasks.";


  // Run the chain with the input text
  const finalOutput = await chain.run(inputText);
  console.log('PromptChaining Output:', finalOutput);

}

main().catch(console.error);
