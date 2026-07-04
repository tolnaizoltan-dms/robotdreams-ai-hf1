export type SqlResult = {
  rows: Record<string, unknown>[];
  rowCount: number;
};

export type AgentResponse = {
  answer: string;
  sqlQueries: string[];
  inputTokens: number;
  outputTokens: number;
};

export type LogEntry = {
  timestamp: string;
  question: string;
  sqlQueries: string[];
  sqlResults: SqlResult[];
  answer: string;
  inputTokens: number;
  outputTokens: number;
};
