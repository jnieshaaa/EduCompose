
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load env from frontend
const envPath = path.resolve('c:/Users/j_ant/projects/EduCompose/frontend/.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log("--- ESSAY ACTIVITIES SAMPLE ---")
  const { data: activities } = await supabase.from('essay_activities').select('*').limit(3)
  console.log(JSON.stringify(activities, null, 2))

  console.log("\n--- BLOCKS SAMPLE ---")
  const { data: blocks } = await supabase.from('blocks').select('*').limit(3)
  console.log(JSON.stringify(blocks, null, 2))

  console.log("\n--- USERS (STUDENTS) SAMPLE ---")
  const { data: students } = await supabase.from('users').select('id, first_name, last_name, block_name, program_id').eq('role', 'student').limit(3)
  console.log(JSON.stringify(students, null, 2))
}

debug()
