export function getArchitectureGroup(type: unknown, config: unknown): 'app' | 'replicas' | undefined {
  if (type === 'app_server') return 'app';
  if (type === 'database' && (config as { role?: string } | undefined)?.role === 'replica') return 'replicas';
}
