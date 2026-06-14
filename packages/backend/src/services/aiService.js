const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Non-streaming: segment filter resolution
async function promptToFilters(naturalLanguagePrompt) {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a CRM query builder for a coffee brand. Convert the user's natural language description into a JSON filter object.
Available filter fields:
- city: string (exact city name)
- min_spent: number (minimum total spent in INR)
- max_spent: number (maximum total spent in INR)
- min_orders: number (minimum number of orders placed)
- days_since_last_order: number (inactive for more than N days)
- days_active_within: number (ordered within last N days)
- tags: array of strings from ["loyalist","churned","new","high-value","weekend-buyer","app-user","price-sensitive"]
Respond ONLY with valid JSON. No explanation. No markdown fences.`
        },
        { role: 'user', content: naturalLanguagePrompt }
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('AI filter error:', err.message);
    return {}; // fallback: return all customers
  }
}

// Streaming: message drafting — pipes chunks to Express res object
async function streamDraftMessage(segmentDescription, channel, tone, res) {
  const charLimit = channel === 'sms' ? '160 characters max' : channel === 'whatsapp' ? '500 characters, you may use 1-2 relevant emojis' : '300 characters';

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a marketing copywriter for BrewCo, a premium D2C coffee brand in India. Write a ${tone} campaign message for ${channel.toUpperCase()}. ${charLimit}. Use {{name}} as a placeholder for the customer's first name. Do not include a subject line. Output ONLY the message text.`
        },
        { role: 'user', content: `Write a message for this audience segment: ${segmentDescription}` }
      ],
      max_tokens: 300,
      temperature: 0.8,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('AI draft error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'AI unavailable', done: true })}\n\n`);
    res.end();
  }
}

// Streaming: campaign insights — pipes chunks to Express res object
async function streamCampaignInsight(stats, segmentName, channel, res) {
  const { sent, delivered, failed, opened, read, clicked } = stats;
  const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : 0;
  const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : 0;
  const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0;

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a marketing analytics expert for a D2C coffee brand. Give a concise 2-3 sentence analysis of the campaign performance and one specific, actionable recommendation. Be direct and specific — no generic advice.`
        },
        {
          role: 'user',
          content: `Campaign stats for segment "${segmentName}" via ${channel}:
- Sent: ${sent}, Delivered: ${delivered} (${deliveryRate}%), Failed: ${failed}
- Opened: ${opened} (${openRate}% of delivered), Read: ${read}, Clicked: ${clicked} (${clickRate}% of opened)

What does this tell us and what should we do next?`
        }
      ],
      max_tokens: 250,
      temperature: 0.5,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('AI insight error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'AI unavailable', done: true })}\n\n`);
    res.end();
  }
}

module.exports = { promptToFilters, streamDraftMessage, streamCampaignInsight };
