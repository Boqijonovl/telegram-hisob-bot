import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/hp/Desktop/hisob/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function test() { 
  const defaultConfig = { 
    user_id: 'test_insert_999', 
    currency: 'UZS', 
    budget: null, 
    is_blocked: false, 
    linked_to: null, 
    my_linked_to: null, 
    first_name: 'Test', 
    username: 'test', 
    premium_until: null, 
    awaiting_receipt: false 
  }; 
  const { data, error } = await supabase.from('user_settings').insert([defaultConfig]).select().single(); 
  console.log('ERROR:', error); 
  console.log('DATA:', data); 
} 
test();
