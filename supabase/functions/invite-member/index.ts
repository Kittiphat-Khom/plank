import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, project_id, role } = await req.json();
    if (!email || !project_id) {
      return new Response(JSON.stringify({ error: "Missing email or project_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );


    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    const existingUser = !listError ? users.find((u) => u.email === email) : null;

    if (existingUser) {

      const memberId = `u_${existingUser.id.replace(/-/g, "").slice(0, 12)}`;
      const { error: insertError } = await adminClient
        .from("project_members")
        .upsert(
          { project_id, member_id: memberId, role: role ?? "member" },
          { onConflict: "project_id,member_id" }
        );
      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, added: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { project_id, role: role ?? "member" },
      redirectTo: `${Deno.env.get("SITE_URL") ?? "http://localhost:5173"}/`,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, invited: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
