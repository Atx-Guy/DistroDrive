import type { DistributionWithLatestRelease } from "@shared/schema";
import { distroTagsMap, type ExperienceLevel, type UseCase, type Hardware } from "@/data/distro-tags";

export interface MatcherInputs {
  experience: ExperienceLevel;
  useCases: UseCase[];
  hardware: Hardware;
}

export interface ScoredDistribution {
  distribution: DistributionWithLatestRelease;
  score: number;
  matchedTags: string[];
}

const WEIGHTS = {
  experience: 3,
  useCase: 2,
  hardware: 1,
};

export function scoreDistributions(
  inputs: MatcherInputs,
  distributions: DistributionWithLatestRelease[]
): ScoredDistribution[] {
  const scored: ScoredDistribution[] = [];

  for (const distro of distributions) {
    const tags = distroTagsMap[distro.name];
    
    if (!tags) {
      continue;
    }

    let score = 0;
    const matchedTags: string[] = [];

    if (tags.experience.includes(inputs.experience)) {
      score += WEIGHTS.experience;
      matchedTags.push(`${inputs.experience} friendly`);
    }

    for (const useCase of inputs.useCases) {
      if (tags.useCases.includes(useCase)) {
        score += WEIGHTS.useCase;
        matchedTags.push(useCase);
      }
    }

    if (tags.hardware.includes(inputs.hardware)) {
      score += WEIGHTS.hardware;
      matchedTags.push(`${inputs.hardware} hardware`);
    }

    if (score > 0) {
      scored.push({
        distribution: distro,
        score,
        matchedTags,
      });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const dateA = a.distribution.latestVersion ? new Date(a.distribution.latestVersion).getTime() : 0;
    const dateB = b.distribution.latestVersion ? new Date(b.distribution.latestVersion).getTime() : 0;
    if (dateB !== dateA) {
      return dateB - dateA;
    }
    return a.distribution.name.localeCompare(b.distribution.name);
  });

  return scored;
}

export function getTopMatches(
  inputs: MatcherInputs,
  distributions: DistributionWithLatestRelease[],
  count: number = 3
): ScoredDistribution[] {
  return scoreDistributions(inputs, distributions).slice(0, count);
}
