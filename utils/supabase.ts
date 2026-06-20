import { createClient } from '@supabase/supabase-js';

// .env.local 파일에 숨겨둔 열쇠를 가져와서 연결하는 코드입니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);