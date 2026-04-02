import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // 1. Recibir el aviso del Webhook de Supabase
  const { type, record, old_record } = await req.json()

  // 2. Solo continuar si el estado acaba de cambiar a "RELEASED"
  if (type === 'UPDATE' && old_record?.status === 'WAITING' && record?.status === 'RELEASED') {
    
    // Conectar a la BD internamente con bypass de RLS para poder buscar el correo que es privado
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Buscar la info del Cliente y el Producto
    const { data: userData } = await supabaseClient.auth.admin.getUserById(record.user_id)
    const email = userData?.user?.email

    const { data: profile } = await supabaseClient.from('profiles').select('full_name').eq('id', record.user_id).single()
    const { data: product } = await supabaseClient.from('products').select('title, store_name').eq('id', record.product_id).single()

    if (email && profile && product) {
      const nombreC = profile.full_name.split(' ')[0]; // Solo el primer nombre

      // 4. Disparar Correo por RESEND
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "XLizmar Fácil Compra <onboarding@resend.dev>", // <- Usando modo de pruebas de Resend
          to: [email],
          subject: `✨ ¡Tu grupo completó la compra de ${product.title}!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
              <h1 style="color: #10b981;">¡Meta Grupal Alcanzada!</h1>
              <p>Hola <strong>${nombreC}</strong>,</p>
              <p>El grupo en el que invertiste se acaba de llenar. Eso quiere decir que el artículo ya es tuyo con descuento de fábrica.</p>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px dashed #cbd5e1; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 0.9rem; color: #64748b;">Tu PIN de Retiro para ${product.store_name} es:</p>
                <h2 style="font-size: 2rem; letter-spacing: 5px; color: #0f172a; margin: 10px 0;">${record.claim_pin}</h2>
              </div>
              
              <p>Preséntate en el almacén oficial aliado con tu <strong>cédula original</strong> y este PIN para que reclames tu producto hoy mismo.</p>
              <p>¡Gracias por comprar en equipo con XLizmar!</p>
            </div>
          `
        })
      });
      
      const resData = await res.json();
      return new Response(JSON.stringify({ success: true, res: resData }), { headers: { "Content-Type": "application/json" } })
    }
  }

  // Si no era el momento de mandar correo, retornar OK tranquilo
  return new Response("No email needed", { status: 200 })
})
