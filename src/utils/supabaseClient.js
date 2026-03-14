import { createClient } from '@supabase/supabase-js';

// 1. Link Project (Tớ đã lấy chuẩn từ URL ảnh của cậu)
const supabaseUrl = 'https://raepbhugqomsytxnwiqa.supabase.co';

// 2. Publishable Key (Cậu dán mã vào giữa 2 dấu nháy đơn bên dưới nhé)
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZXBiaHVncW9tc3l0eG53aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyOTc0MTMsImV4cCI6MjA4ODg3MzQxM30.HwydhbqFXzr-qi45mY-VN1XTBTexodRtawO76amy1_s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);