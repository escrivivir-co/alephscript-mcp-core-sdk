/**
 * TypedPrompts Types - Shared types for TypedPromptsEditor ecosystem
 * 
 * These types are shared between:
 * - MCPGallery/mcp-mesh-sdk/src/MCPTypedPromptServer.ts (MCP Server) [PLANNED]
 * - TypedPromptsEditor/backend (REST API Gateway)
 * - TypedPromptsEditor/frontend (React UI)
 * 
 * @module @alephscript/mcp-core-sdk/types/typed-prompts
 * @épica TYPED-MCP-1.0.0
 */

import { z } from "zod";

// ============================================
// Schema Types
// ============================================

/**
 * Schema entity - TypeScript + JSON Schema pair
 */
export interface Schema {
  id: number;
  name: string;
  typeScript: string;
  jsonSchema: string;
  category: string;
  labels: string[];
  description: string | null;
  createdAt: string;
  libraryId?: number | null;
}

/**
 * Zod schema for inserting a new Schema
 */
export const insertSchemaSchema = z.object({
  name: z.string(),
  typeScript: z.string(),
  jsonSchema: z.string(),
  category: z.string().optional(),
  labels: z.array(z.string()).optional(),
  description: z.string().optional(),
  libraryId: z.number().nullable().optional(),
});

export type InsertSchema = z.infer<typeof insertSchemaSchema>;

// ============================================
// Library Types
// ============================================

/**
 * Library entity - collection of schemas
 */
export interface Library {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

/**
 * Zod schema for inserting a new Library
 */
export const insertLibrarySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

export type InsertLibrary = z.infer<typeof insertLibrarySchema>;

// ============================================
// Validation Types
// ============================================

/**
 * Single validation error
 */
export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validation report - result of validating a message against a schema
 */
export interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Zod schema for ValidationReport
 */
export const validationReportSchema = z.object({
  valid: z.boolean(),
  errors: z.array(
    z.object({
      path: z.string(),
      message: z.string(),
    })
  ),
});

/**
 * Validation history entry
 */
export interface ValidationHistory {
  id: number;
  schemaId: number;
  prompt: string;
  response: string;
  validationReport: ValidationReport;
  createdAt: string;
  isValid: boolean;
}

/**
 * Zod schema for inserting validation history
 */
export const insertValidationHistorySchema = z.object({
  schemaId: z.number(),
  prompt: z.string(),
  response: z.string(),
  validationReport: validationReportSchema,
  isValid: z.boolean(),
});

export type InsertValidationHistory = z.infer<typeof insertValidationHistorySchema>;

// ============================================
// AI Configuration Types
// ============================================

/**
 * Supported AI providers
 */
export const aiProviders = ["openai", "deepseek", "ollama", "anthropic"] as const;
export type AIProvider = (typeof aiProviders)[number];

/**
 * AI configuration entity
 */
export interface AIConfig {
  id: number;
  name: string;
  provider: AIProvider;
  apiKey: string | null;
  baseUrl: string | null;
  models: string[];
  isActive: boolean;
  settings?: string;
  createdAt: string;
}

/**
 * Zod schema for inserting AI config
 */
export const insertAIConfigSchema = z.object({
  name: z.string(),
  provider: z.enum(aiProviders),
  apiKey: z.string().nullable().optional(),
  baseUrl: z.string().nullable().optional(),
  models: z.array(z.string()).optional(),
  settings: z.string().optional(),
});

export type InsertAIConfig = z.infer<typeof insertAIConfigSchema>;

// ============================================
// Stored Prompt Types
// ============================================

/**
 * Prompt types
 */
export const promptTypes = ["typing", "conversation"] as const;
export type PromptType = (typeof promptTypes)[number];

/**
 * Stored prompt entity
 */
export interface StoredPrompt {
  id: number;
  name: string;
  content: string;
  modelId: number;
  modelName: string;
  schemaId: number;
  modelParams: string;
  createdAt: string;
  type: PromptType;
  libraryId: number | null;
  libraryName: string | null;
  selectedSchemas: Array<{ id: number; name: string }>;
  rawOutgoingPrompt: string;
  rawIncomingResponse: string;
}

/**
 * Zod schema for inserting stored prompt
 */
export const insertStoredPromptSchema = z.object({
  name: z.string(),
  content: z.string(),
  modelId: z.number(),
  modelName: z.string(),
  schemaId: z.number(),
  type: z.enum(promptTypes),
  modelParams: z.string(),
  libraryId: z.number().nullable(),
  libraryName: z.string().nullable(),
  selectedSchemas: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    })
  ),
  rawOutgoingPrompt: z.string(),
  rawIncomingResponse: z.string(),
});

export type InsertStoredPrompt = z.infer<typeof insertStoredPromptSchema>;

// ============================================
// API Request/Response Types (for MCP Server)
// ============================================

/**
 * Request to validate a message against a schema
 */
export interface ValidateMessageRequest {
  schemaId: number;
  message: string;
}

/**
 * Response from message validation
 */
export interface ValidateMessageResponse {
  success: boolean;
  valid: boolean;
  report: ValidationReport;
  error?: string;
}

/**
 * Request to convert TypeScript interface to JSON Schema
 */
export interface ConvertInterfaceRequest {
  typescript: string;
  name?: string;
}

/**
 * Response from interface conversion
 */
export interface ConvertInterfaceResponse {
  success: boolean;
  jsonSchema: string;
  error?: string;
}

/**
 * Request to suggest ontology based on use case
 */
export interface SuggestOntologyRequest {
  useCase: string;
  domain?: string;
  constraints?: string[];
}

/**
 * Response from ontology suggestion
 */
export interface SuggestOntologyResponse {
  success: boolean;
  suggestions: Array<{
    schemaId: number;
    name: string;
    relevance: number;
    reason: string;
  }>;
  error?: string;
}

/**
 * List schemas request
 */
export interface ListSchemasRequest {
  libraryId?: number;
  category?: string;
  labels?: string[];
}

/**
 * List schemas response
 */
export interface ListSchemasResponse {
  success: boolean;
  count: number;
  schemas: Schema[];
  error?: string;
}

/**
 * Get schema response
 */
export interface GetSchemaResponse {
  success: boolean;
  schema?: Schema;
  error?: string;
}

/**
 * Create schema response
 */
export interface CreateSchemaResponse {
  success: boolean;
  schema?: Schema;
  error?: string;
}

/**
 * List libraries response
 */
export interface ListLibrariesResponse {
  success: boolean;
  count: number;
  libraries: Library[];
  error?: string;
}

// ============================================
// MCP Tool Input Schemas (for pack.json)
// ============================================

/**
 * Input for typed_validate_message tool
 */
export const typedValidateMessageInput = z.object({
  schemaId: z.number().describe("ID of the schema to validate against"),
  message: z.string().describe("JSON message to validate"),
});

/**
 * Input for typed_convert_interface tool
 */
export const typedConvertInterfaceInput = z.object({
  typescript: z.string().describe("TypeScript interface definition"),
  name: z.string().optional().describe("Name for the generated schema"),
});

/**
 * Input for typed_list_schemas tool
 */
export const typedListSchemasInput = z.object({
  libraryId: z.number().optional().describe("Filter by library ID"),
  category: z.string().optional().describe("Filter by category"),
});

/**
 * Input for typed_create_schema tool
 */
export const typedCreateSchemaInput = z.object({
  name: z.string().describe("Name of the schema"),
  typescript: z.string().describe("TypeScript interface definition"),
  jsonSchema: z.string().describe("JSON Schema definition"),
  category: z.string().optional().describe("Category for organization"),
  libraryId: z.number().optional().describe("Library to add schema to"),
});

/**
 * Input for typed_get_schema tool
 */
export const typedGetSchemaInput = z.object({
  schemaId: z.number().describe("ID of the schema to retrieve"),
});

/**
 * Input for typed_suggest_ontology tool
 */
export const typedSuggestOntologyInput = z.object({
  useCase: z.string().describe("Description of the use case"),
  domain: z.string().optional().describe("Domain context"),
  constraints: z.array(z.string()).optional().describe("Constraints to consider"),
});
