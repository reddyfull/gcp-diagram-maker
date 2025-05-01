export async function generateMermaidDiagram(answers: Record<string, any>) {
  const response = await fetch('/api/ai/diagrams/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  if (!response.ok) {
    throw new Error('Failed to generate diagram');
  }
  return response.json();
} 