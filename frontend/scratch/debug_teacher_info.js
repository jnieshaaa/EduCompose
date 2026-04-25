
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugQuery() {
  const userId = '662a4d3c-d492-41c2-ad1a-a38e1cedee0f'
  
  console.log('--- Testing Simple Select ---')
  const { data: d1, error: e1 } = await supabase
    .from('users')
    .select('id, email, school_id')
    .eq('id', userId)
    .single()
  
  if (e1) console.error('Simple Select Error:', e1)
  else console.log('Simple Select Success:', d1)

  console.log('\n--- Testing Nested Schools Select ---')
  const { data: d2, error: e2 } = await supabase
    .from('users')
    .select('id, schools(name, code)')
    .eq('id', userId)
    .single()
  
  if (e2) console.error('Nested Schools Error:', e2)
  else console.log('Nested Schools Success:', d2)
}

debugQuery()
