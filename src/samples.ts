/**
 * The fictional sample profiles in `samples/`, bundled into the page so a visitor to the hosted site can try the
 * tool without any files of their own. They go through the same upload path as a file the user chooses.
 */
const raw = import.meta.glob('../samples/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const SAMPLE_FILES: { name: string; text: string }[] = Object.entries(raw)
  .map(([path, text]) => ({ name: path.split('/').pop()!, text }))
  .sort((a, b) => a.name.localeCompare(b.name))
