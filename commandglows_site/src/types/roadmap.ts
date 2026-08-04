export type FeatureStatus =
  | "in-development"
  | "planned"
  | "considering"
  | "completed"
  | "rejected";

export type Feature = {
  id: string;
  key: string;
  title: string;
  description: string;
  status: FeatureStatus;
  votes: number;
  projectId: string;
  projectName?: string;
};

export interface Project {
  id: string;
  name: string;
  description: string;
  features: Feature[];
}

export const projects: Project[] = [
  {
    id: 'replayglowz',
    name: 'ReplayGlowz',
    description: 'YouTube automation tool',
    features: []
  },
  {
    id: 'mediaflowz',
    name: 'Mediaflowz',
    description: 'Social media automation',
    features: []
  },
  {
    id: 'commandglows',
    name: 'CommandGlows',
    description: 'Windows automation',
    features: []
  }
]; 
