export type Race = {
  id: string;
  label: string;
  createdAt: number;
};

export type Source = {
  url: string;
  title?: string;
};

export type Summary = {
  raceId: string;
  updatedAt: number;
  content: string;
  sources: Source[];
  error?: string;
};
