import { Type } from '@google/genai';

export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: {
    type: Type;             // use the enum Type instead of string
    properties: Record<string, any>;
    required?: string[];
  };
  raw: (args: any) => Promise<any> | any;
}
