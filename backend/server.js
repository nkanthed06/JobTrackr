import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const db = new Database('job-matcher.db');
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    db.prepare('INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)')
      .run(userId, email, passwordHash, fullName || null);
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userId, email, full_name: fullName } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/user', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, full_name, created_at FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/applications', authenticate, (req, res) => {
  try {
    const applications = db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/applications', authenticate, (req, res) => {
  try {
    const { company, role, status, location, job_url, date_applied, next_interview_date, notes } = req.body;
    const id = randomUUID();
    db.prepare(`
      INSERT INTO applications (id, user_id, company, role, status, location, job_url, date_applied, next_interview_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.userId, company, role, status || 'saved', location || null, job_url || null, date_applied || null, next_interview_date || null, notes || null);
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    res.status(201).json(application);
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/applications/:id', authenticate, (req, res) => {
  try {
    const { company, role, status, location, job_url, date_applied, next_interview_date, notes } = req.body;
    const existing = db.prepare('SELECT id FROM applications WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!existing) {
      return res.status(404).json({ error: 'Application not found' });
    }
    db.prepare(`
      UPDATE applications SET company = ?, role = ?, status = ?, location = ?, job_url = ?,
      date_applied = ?, next_interview_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(company, role, status, location, job_url, date_applied, next_interview_date, notes, req.params.id);
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    res.json(application);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/applications/:id', authenticate, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM applications WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/dashboard/summary', authenticate, (req, res) => {
  try {
    const statusCounts = db.prepare('SELECT status, COUNT(*) as count FROM applications WHERE user_id = ? GROUP BY status').all(req.userId);
    const upcomingInterviews = db.prepare(`
      SELECT * FROM applications WHERE user_id = ? AND next_interview_date >= datetime('now') 
      AND next_interview_date <= datetime('now', '+14 days') ORDER BY next_interview_date ASC
    `).all(req.userId);
    const totalResult = db.prepare('SELECT COUNT(*) as total FROM applications WHERE user_id = ?').get(req.userId);
    const summary = {
      total: totalResult.total,
      by_status: statusCounts.reduce((acc, item) => { acc[item.status] = item.count; return acc; }, {}),
      upcoming_interviews: upcomingInterviews
    };
    res.json(summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/match', authenticate, (req, res) => {
  try {
    const { resume_text, job_text } = req.body;
    
    const getWords = (text) => text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const getFreq = (words) => {
      const freq = {};
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
      return freq;
    };
    
    const resumeWords = getWords(resume_text);
    const jobWords = getWords(job_text);
    const resumeFreq = getFreq(resumeWords);
    const jobFreq = getFreq(jobWords);
    
    const allWords = new Set([...Object.keys(resumeFreq), ...Object.keys(jobFreq)]);
    let dotProduct = 0, mag1 = 0, mag2 = 0;
    allWords.forEach(word => {
      const val1 = resumeFreq[word] || 0;
      const val2 = jobFreq[word] || 0;
      dotProduct += val1 * val2;
      mag1 += val1 * val1;
      mag2 += val2 * val2;
    });
    const similarity = (mag1 === 0 || mag2 === 0) ? 0 : dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
    const score = Math.round(similarity * 100);
    
    const resumeKeywords = Object.entries(resumeFreq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word]) => word);
    const jobKeywords = Object.entries(jobFreq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word]) => word);
    const overlapKeywords = jobKeywords.filter(k => resumeKeywords.includes(k)).slice(0, 8);
    const missingKeywords = jobKeywords.filter(k => !resumeKeywords.includes(k)).slice(0, 8);
    
    const tips = [];
    if (score < 40) tips.push('Consider restructuring your resume to better match the job requirements');
    else if (score < 60) tips.push('Good foundation! Add more keywords from the job description');
    else tips.push('Strong match! Fine-tune with specific terms from the job posting');
    if (missingKeywords.length > 0) tips.push(`Add these important skills: ${missingKeywords.slice(0, 3).join(', ')}`);
    if (!resume_text.match(/\d+%|increased|improved|reduced/i)) tips.push('Include quantifiable achievements (e.g., "Increased sales by 25%")');
    
    const matchId = randomUUID();
    db.prepare(`
      INSERT INTO match_requests (id, user_id, resume_text, job_text, score, overlap_keywords, missing_keywords, tips)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(matchId, req.userId, resume_text, job_text, score, JSON.stringify(overlapKeywords), JSON.stringify(missingKeywords), JSON.stringify(tips));
    
    res.json({ id: matchId, score, overlap_keywords: overlapKeywords, missing_keywords: missingKeywords, tips });
  } catch (error) {
    console.error('Match error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
