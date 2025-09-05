#!/usr/bin/env node

console.log('Environment Configuration Test');
console.log('==============================');
console.log('REACT_APP_ENV:', process.env.REACT_APP_ENV || 'not set');
console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL || 'not set');

// Identify which environment based on URL
if (process.env.REACT_APP_SUPABASE_URL) {
  if (process.env.REACT_APP_SUPABASE_URL.includes('127.0.0.1') || process.env.REACT_APP_SUPABASE_URL.includes('localhost')) {
    console.log('→ Using LOCAL Supabase');
  } else if (process.env.REACT_APP_SUPABASE_URL.includes('bqmmeaguzwtkcovjtbip')) {
    console.log('→ Using DEVELOPMENT Supabase (lorcana-dev)');
  } else if (process.env.REACT_APP_SUPABASE_URL.includes('sqrkhwauozrwxqmqvyoi')) {
    console.log('→ Using PRODUCTION Supabase');
  } else {
    console.log('→ Using UNKNOWN Supabase instance');
  }
}