import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gyuzdgnkgrijwtodojyz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5dXpkZ25rZ3Jpand0b2Rvanl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDAzMTUsImV4cCI6MjA5NTc3NjMxNX0.X-gqHdzRgaM92tCpGo53k7uz428YVUkvR_dk0kwixWY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)