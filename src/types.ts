export type ResourceScreenshot = { url: string; caption: string };

export type ResourceItem = {
  id: string;
  title: string;
  english: string;
  genre: string;
  version: string;
  intro: string;
  downloadUrl: string;
  coverUrl: string;
  screenshots: ResourceScreenshot[];
  description: string;
  installation: string;
  changelog: string;
  credits: string;
};
