import axios from "axios";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 20000,
});
export async function get<T>(url: string): Promise<T> {
  return (await api.get(url)).data.data;
}
export function message(error: unknown): string {
  return axios.isAxiosError(error)
    ? error.response?.data?.error?.message ||
        "Cannot reach the local API. Check that the backend is running."
    : error instanceof Error
      ? error.message
      : "The operation failed.";
}
export type Project = {
  _id: string;
  name: string;
  originalFileName: string;
  languages: string[];
  frameworks: string[];
  fileCount: number;
  skippedCount: number;
  createdAt: string;
  files?: { path: string; size: number; language: string }[];
  indexMs: number;
};
export type Finding = {
  title: string;
  severity: string;
  confidence: string;
  file: string;
  line?: number;
  description: string;
  recommendation: string;
};
export type Architecture = {
  components: { name: string; description: string; files: string[] }[];
  connections: { from: string; to: string; description: string }[];
  dataFlow: string[];
  technologies: string[];
  limitations?: string[];
};
export type Result = {
  summary: string;
  findings: Finding[];
  markdown: string;
  architecture?: Architecture;
  metadata: {
    inspectedFiles: string[];
    totalFiles: number;
    durationMs: number;
    modelMs: number;
    rssBytes: number;
    contextTruncated: boolean;
    toolErrors: { tool: string; message: string }[];
    note: string;
  };
};
export type Run = {
  _id: string;
  projectId: string;
  userRequest: string;
  type: string;
  status: string;
  error?: string;
  executionSteps: {
    stage: string;
    tool?: string;
    message: string;
    at: string;
  }[];
  toolsUsed: string[];
  result?: Result;
};
export type Analysis = {
  _id: string;
  projectId: string;
  runId: string;
  type: string;
  summary: string;
  createdAt: string;
};
export type Health = {
  status: string;
  database: boolean;
  model: string;
  activeRun: string | null;
  uptimeSeconds: number;
  rssBytes: number;
};
export type Ollama = {
  connected: boolean;
  model: string;
  modelReady: boolean;
  models: string[];
};
