const CREW_JOB_LABELS: Record<string, string> = {
  Director: 'Direção',
  Screenplay: 'Roteiro',
  Writer: 'Roteiro',
  Story: 'Argumento',
  Novel: 'Obra original',
  Characters: 'Personagens',
  'Original Music Composer': 'Trilha sonora',
  'Director of Photography': 'Fotografia',
  Producer: 'Produção',
  'Executive Producer': 'Produção executiva',
};

// Traduz as funções do TMDB sem repetir (Screenplay e Writer viram "Roteiro")
export function formatCrewJobs(jobs: string[]): string {
  const labels = jobs.map((job) => CREW_JOB_LABELS[job] ?? job);
  return [...new Set(labels)].join(', ');
}
