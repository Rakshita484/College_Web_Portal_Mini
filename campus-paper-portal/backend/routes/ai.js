const express = require('express');
const router = express.Router();

// POST /summary
// Rate Limiting Note: In a production app, use express-rate-limit here to prevent abuse.
router.post('/summary', async (req, res) => {
    try {
        const { abstract } = req.body;

        if (!abstract) {
            return res.status(400).json({ message: 'Abstract is required' });
        }

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'none') {
            // Fallback if no key provided
            console.log('No OpenAI API Key found, using fallback summary.');
            const sentences = abstract.split('.').filter(s => s.trim().length > 0);
            const summary = sentences.slice(0, 3).join('.') + (sentences.length > 3 ? '.' : '');
            return res.json({ summary: `(Auto-generated fallback) ${summary}` });
        }

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful assistant that summarizes academic paper abstracts into 3 concise sentences." },
                    { role: "user", content: abstract }
                ],
                max_tokens: 150
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('OpenAI API Error:', data);
            throw new Error(data.error?.message || 'Failed to fetch summary from OpenAI');
        }

        const summary = data.choices[0].message.content.trim();
        res.json({ summary });

    } catch (err) {
        console.error('AI Summary Error:', err.message);
        // Fallback on error as well
        const sentences = req.body.abstract ? req.body.abstract.split('.') : [];
        const fallback = sentences.slice(0, 3).join('.') + '.';
        res.json({ summary: `(Fallback after error) ${fallback}` });
    }
});

module.exports = router;

const Paper = require('../models/Paper');
const Event = require('../models/Event');
const Department = require('../models/Department');

// POST /chat
router.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ message: 'Question is required' });

        let intent = 'unknown';
        let params = {};

        // 1. Intent Parsing (OpenAI or Regex Fallback)
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'none') {
            // Use OpenAI to classify
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: "You are a helper. Classify user question into intents: 'papers_by_dept_year', 'total_approved_papers', 'events_last_year', or 'unknown'. Extract params: department (code like CSE), year (number). Return JSON: { \"intent\": \"...\", \"params\": { ... } }" },
                        { role: "user", content: question }
                    ],
                    max_tokens: 100
                })
            });
            const data = await response.json();
            try {
                const parsed = JSON.parse(data.choices[0].message.content);
                intent = parsed.intent;
                params = parsed.params || {};
            } catch (e) {
                console.error('Failed to parse OpenAI JSON', e);
            }
        } else {
            // Regex Fallback
            const lowerQ = question.toLowerCase();
            if (lowerQ.includes('papers') && (lowerQ.includes('cse') || lowerQ.includes('ece') || lowerQ.includes('me'))) {
                intent = 'papers_by_dept_year';
                if (lowerQ.includes('cse')) params.department = 'CSE';
                if (lowerQ.includes('ece')) params.department = 'ECE';
                if (lowerQ.includes('me')) params.department = 'ME';
                const yearMatch = lowerQ.match(/\d{4}/);
                if (yearMatch) params.year = parseInt(yearMatch[0]);
            } else if (lowerQ.includes('how many') && lowerQ.includes('approved')) {
                intent = 'total_approved_papers';
            } else if (lowerQ.includes('events') && (lowerQ.includes('last year') || lowerQ.includes('2024'))) {
                intent = 'events_last_year';
                params.year = 2024; // Simplified fallback
            }
        }

        // 2. Execute Safe Queries
        let answerText = "";
        let results = [];

        if (intent === 'papers_by_dept_year') {
            const dept = await Department.findOne({ code: params.department });
            if (dept) {
                const query = { departmentId: dept._id, status: 'approved' };
                if (params.year) query.year = params.year;

                results = await Paper.find(query).select('title year');
                answerText = `Found ${results.length} approved papers for ${params.department} ${params.year ? 'in ' + params.year : ''}.`;
            } else {
                answerText = `Could not find department ${params.department}.`;
            }
        } else if (intent === 'total_approved_papers') {
            const count = await Paper.countDocuments({ status: 'approved' });
            answerText = `There are ${count} total approved papers in the system.`;
            results = [{ count }];
        } else if (intent === 'events_last_year') {
            const year = params.year || new Date().getFullYear() - 1;
            const start = new Date(`${year}-01-01`);
            const end = new Date(`${year}-12-31`);
            results = await Event.find({ date: { $gte: start, $lte: end } }).select('title date');
            answerText = `Found ${results.length} events in ${year}.`;
        } else {
            // Fallback: Check for greetings or treat as search query
            const lowerQ = question.toLowerCase();
            const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon'];

            if (greetings.some(g => lowerQ.startsWith(g))) {
                answerText = "Hello! I am your Campus Paper Assistant. You can ask me about papers, departments, or events. For example: 'Papers from CSE in 2024' or 'How many approved papers?'";
            } else {
                // Treat as search query
                const searchResults = await Paper.find({
                    status: 'approved',
                    $or: [
                        { title: { $regex: question, $options: 'i' } },
                        { abstract: { $regex: question, $options: 'i' } }
                    ]
                }).limit(5).select('title year');

                if (searchResults.length > 0) {
                    answerText = `I found ${searchResults.length} papers matching your query:`;
                    results = searchResults;
                    // Append titles to answerText
                    searchResults.forEach(p => {
                        answerText += `\n- ${p.title} (${p.year})`;
                    });
                } else {
                    answerText = "I'm not sure how to answer that specific question, and I couldn't find any papers matching those keywords. Try asking about 'papers from [Department]' or 'total papers'.";
                }
            }
        }

        res.json({ answerText, results });

    } catch (err) {
        console.error('Chat Error:', err);
        res.status(500).json({ message: 'Server error processing chat' });
    }
});
