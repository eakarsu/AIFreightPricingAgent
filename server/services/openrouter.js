require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
const BASE_URL = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');

if (!process.env.OPENROUTER_API_KEY) {
  console.warn('[openrouter] WARNING: OPENROUTER_API_KEY not set; AI calls will throw.');
}

// 3-strategy AI JSON parser
function parseAIJson(text) {
  if (!text || typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch (e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (e) {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
  }
  return null;
}

async function askAI(systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured.');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
      'X-Title': 'AI Freight Pricing Agent'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt) }
      ],
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.5,
      ...(options.tools ? { tools: options.tools, tool_choice: options.tool_choice || 'auto' } : {})
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter (${res.status}): ${text}`);
  }
  const data = await res.json();
  if (!data.choices || data.choices.length === 0) throw new Error('Empty AI response');
  return data.choices[0].message.content;
}

// Tool-calling: returns whole assistant message so caller can dispatch tool_calls
async function askAIWithTools(systemPrompt, conversation, tools) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured.');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
      'X-Title': 'AI Freight Pricing Agent'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...conversation],
      tools,
      tool_choice: 'auto',
      max_tokens: 4096
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter (${res.status}): ${text}`);
  }
  const data = await res.json();
  if (!data.choices || data.choices.length === 0) throw new Error('Empty AI response');
  return data.choices[0].message;
}

module.exports = { askAI, askAIWithTools, parseAIJson, MODEL };
