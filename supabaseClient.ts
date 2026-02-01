
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqwdspoizoorvpgcutke.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxd2RzcG9pem9vcnZwZ2N1dGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODQ2MTUsImV4cCI6MjA4NTM2MDYxNX0.O3ksEHhNjLhAdh9H5bDP2zqtEQMrPEqczdw7PjPAU6g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
