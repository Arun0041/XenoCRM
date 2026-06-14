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
          content: `You are an expert PostgreSQL Query Builder for a CRM.
You will be given a natural language request to filter customers.
Output ONLY a valid PostgreSQL WHERE clause condition. 
Do not include the word "WHERE". Do not output anything else. No markdown formatting. No explanation.

Table schema for "customers":
- id (UUID)
- name (VARCHAR)
- email (VARCHAR)
- phone (VARCHAR)
- city (VARCHAR)
- tags (TEXT[]) - Use PostgreSQL array syntax, e.g. 'loyalist' = ANY(tags)
- total_orders (INT)
- total_spent (DECIMAL)
- last_order_date (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)

Assume today is ${new Date().toISOString().split('T')[0]}.

Example input: "Customers in Bangalore whose name starts with A"
Example output: city ILIKE 'Bangalore' AND name ILIKE 'A%'`
        },
        { role: 'user', content: naturalLanguagePrompt }
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '';
    const cleanSql = text.replace(/```sql|```|```json/g, '').trim();
    
    // We wrap the raw SQL inside the filters object so the rest of the application still treats it as a filter payload
    return { sql_condition: cleanSql };
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
          content: `You are an elite marketing copywriter for BrewCo, a premium D2C coffee brand in India.
Your task is to write a highly customized, ${tone} campaign message for ${channel.toUpperCase()}.
CRITICAL RULES:
1. Length constraint: ${charLimit}.
2. Personalization: Always use {{name}} as a placeholder for the customer's first name.
3. Deep Customization: Analyze the provided "Targeting Logic" (SQL/JSON filters) to understand exactly WHO the audience is. Directly reference their specific traits in the message! For example, if they live in Bangalore, mention the city. If they haven't ordered in months, say we miss them. If they spend a lot, treat them like VIPs.
4. Do not include a subject line.
5. Output ONLY the final message text.`
        },
        { role: 'user', content: `Write a hyper-personalized message for this audience segment:\n\n${segmentDescription}` }
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
