/*
  run_pipeline_test.js
  Lightweight integration script that:
  - connects to the backend API on localhost (PORT env or 5000)
  - creates a test user in MongoDB directly, or finds an existing one
  - generates a JWT using backend `generateToken` helper (requires JWT_SECRET set)
  - POSTs to /api/resumes/upload-text to trigger processing
  - polls /api/interviews and /api/analytics/dashboard until results appear

  Usage (PowerShell):
    $env:JWT_SECRET = 'devsecret';
    $env:MONGODB_URI = 'mongodb://localhost:27017/askacoach-test';
    $env:AUTOMATED_PIPELINE = 'true';
    node .\scripts\run_pipeline_test.js
*/

import fetch from 'node-fetch';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const API_PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${API_PORT}`;
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/askacoach-test';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('Connecting to MongoDB', MONGO);
  await mongoose.connect(MONGO, { autoIndex: true });

  // Create or find test user
  let user = await User.findOne({ email: 'integration-test@example.com' });
  if (!user) {
    user = new User({
      email: 'integration-test@example.com',
      password: 'testpass123',
      firstName: 'Integration',
      lastName: 'Tester',
      subscription: 'premium'
    });
    await user.save();
    console.log('Created test user', user._id.toString());
  } else {
    console.log('Found existing test user', user._id.toString());
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET must be set in environment for this script to run');
    process.exit(1);
  }

  // Generate token
  const token = generateToken(user._id.toString());
  console.log('Generated token. Triggering upload-text...');

  // Trigger resume text upload
  const resumeText = `John Doe\nExperienced software engineer with skills in Node.js, React, MongoDB, testing, cloud.\nBuilt high-scale APIs and automated pipelines.`;

  const uploadResp = await fetch(`${BASE}/api/resumes/upload-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ resumeText })
  });

  const uploadJson = await uploadResp.json();
  console.log('Upload response:', uploadJson);

  if (!uploadJson.success) {
    console.error('Upload failed, aborting');
    process.exit(1);
  }

  const resumeId = uploadJson.data.resumeId;

  // Poll for interviews (up to 30s)
  console.log('Polling for interviews...');
  let interviews = [];
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const r = await fetch(`${BASE}/api/interviews`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const j = await r.json();
    if (j.success && j.data && j.data.interviews && j.data.interviews.length > 0) {
      interviews = j.data.interviews;
      break;
    }
  }

  console.log('Interviews found:', interviews.length);
  interviews.forEach(it => console.log('-', it.interviewType, 'score:', it.overallScore));

  // Get analytics dashboard
  const dashResp = await fetch(`${BASE}/api/analytics/dashboard`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dash = await dashResp.json();
  console.log('Analytics dashboard:', JSON.stringify(dash.data.overview || dash.data, null, 2));

  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
