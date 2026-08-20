import { createClient } from "@supabase/supabase-js"

// Mesmas credenciais do index.html original — projeto Supabase
// xozrxppvroqiverzonmy. A anon key é segura para uso client-side: o acesso
// real é controlado pelas políticas de RLS habilitadas em cada tabela.
const SUPABASE_URL = "https://xozrxppvroqiverzonmy.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvenJ4cHB2cm9xaXZlcnpvbm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMDg2NDUsImV4cCI6MjA5MzY4NDY0NX0.5gE3khHOusWrADdQI6I89hGJnG-qc4JeXiYURgXDGrk"

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
