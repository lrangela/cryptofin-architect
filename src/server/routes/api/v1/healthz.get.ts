import { defineEventHandler } from 'h3';

export default defineEventHandler(() => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));
