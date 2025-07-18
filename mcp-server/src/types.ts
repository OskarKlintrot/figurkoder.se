// Data types for the figurkoder system
export interface FigurkodItem {
  key: string;
  value: string;
  category: string;
}

export interface GameData {
  title: string;
  description: string;
  data: [string, string][];
  dropdown?: boolean;
}

export interface TrainingSession {
  id: string;
  gameType: string;
  startTime: Date;
  endTime?: Date;
  results: SessionResult[];
  settings: SessionSettings;
}

export interface SessionResult {
  figurkod: string;
  answer: string;
  timeSpent: number;
  showedAnswer: boolean;
}

export interface SessionSettings {
  timeLimit: number;
  fromIndex: number;
  toIndex: number;
  learningMode: boolean;
}

export interface SearchResult {
  item: FigurkodItem;
  score: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
}