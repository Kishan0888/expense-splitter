import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, description TEXT DEFAULT '',
      created_by INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY, group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, joined_at TIMESTAMP DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY, group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      paid_by INTEGER REFERENCES users(id), title VARCHAR(200) NOT NULL,
      amount NUMERIC(10,2) NOT NULL, split_type VARCHAR(20) DEFAULT 'equal',
      created_at TIMESTAMP DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS expense_splits (
      id SERIAL PRIMARY KEY, expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id), amount NUMERIC(10,2) NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS settlements (
      id SERIAL PRIMARY KEY, group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      paid_by INTEGER REFERENCES users(id), paid_to INTEGER REFERENCES users(id),
      amount NUMERIC(10,2) NOT NULL, settled_at TIMESTAMP DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL, subscription TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint))`;
    return NextResponse.json({ success: true, message: 'All tables ready including push_subscriptions' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
