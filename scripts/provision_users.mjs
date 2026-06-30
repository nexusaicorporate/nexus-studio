import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function provision() {
  console.log("Provisioning admin...");
  let adminRes = await supabase.auth.admin.createUser({
    email: "cscannell@nexusaigear.com",
    password: "ZMCw486!75276",
    email_confirm: true
  });
  let adminId = adminRes.data?.user?.id;
  if (adminRes.error) {
    if (adminRes.error.message.includes("already registered") || adminRes.error.message.includes("already exists")) {
      console.log("Admin already exists, fetching ID...");
      const { data } = await supabase.auth.admin.listUsers();
      adminId = data.users.find(u => u.email === "cscannell@nexusaigear.com")?.id;
    } else {
      console.error(adminRes.error);
    }
  }

  if (adminId) {
    console.log("Updating admin profile...");
    await supabase.from('profiles').update({ groups: ['admin', 'dev'] }).eq('id', adminId);
  }

  console.log("Provisioning test user...");
  let testRes = await supabase.auth.admin.createUser({
    email: "test-studio@nexusaigear.com",
    password: "TestUser123!",
    email_confirm: true
  });
  let testId = testRes.data?.user?.id;
  if (testRes.error) {
    if (testRes.error.message.includes("already registered") || testRes.error.message.includes("already exists")) {
      console.log("Test user already exists, fetching ID...");
      const { data } = await supabase.auth.admin.listUsers();
      testId = data.users.find(u => u.email === "test-studio@nexusaigear.com")?.id;
    } else {
      console.error(testRes.error);
    }
  }

  if (testId) {
    console.log("Updating test profile...");
    await supabase.from('profiles').update({ 
      plan: 'studio', 
      addons: ['nsfw'], 
      groups: ['dev'] 
    }).eq('id', testId);
  }

  console.log("Provisioning complete!");
}

provision().catch(console.error);
