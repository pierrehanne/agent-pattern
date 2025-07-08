import { FunctionDeclaration, Type } from '@google/genai';
import { ToolDefinition } from './toolTypes';

export function toGeminiFunction(tool: ToolDefinition): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description ?? '',
    parameters: tool.parameters ?? {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  };
}

export function toGeminiFunctionDeclarations(tools: ToolDefinition[]): FunctionDeclaration[] {
  return tools.map(toGeminiFunction);
}