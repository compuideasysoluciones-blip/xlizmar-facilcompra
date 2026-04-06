/**
 * @project: XLizmar Fácil Compra
 * @copyright: © 2026 Compuideas y Soluciones. Todos los derechos reservados.
 * @author: Compuideas y Soluciones
 */

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    
    // Verificar sesión (Es OBLIGATORIO tener sesión para ver esta página)
    if (!window.supabaseClient) return;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    if (!session) {
        alert("🔒 Debes iniciar sesión para ver tu billetera.");
        window.location.href = "index.html";
        return;
    }

    // Pintar Menú Superior
    const { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('full_name, document_id')
        .eq('id', session.user.id)
        .single();
        
    let name = profile ? profile.full_name.split(' ')[0] : 'Socio';
    let fullClientName = profile ? `${profile.full_name} (CC. ${profile.document_id})` : 'Cliente XLizmar';
    window.currentClientDetails = fullClientName; // Guardamos globalmente para los recibos
    
    document.getElementById('user-menu').innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <i data-lucide="user-circle" style="width: 20px; color: var(--brand-500);"></i>
                <span style="font-size: 0.95rem; font-weight: 700; color: white;">Hola, ${name}</span>
            </div>
            <button onclick="logoutProfile()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 0.4rem 1rem; border-radius: 99px; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: 0.2s;">
                Salir
            </button>
        </div>
    `;
    lucide.createIcons();

    // Empezamos a cargar los recibos
    await loadWalletStats(session.user.id);
});

async function logoutProfile() {
    await window.supabaseClient.auth.signOut();
    window.location.href = "index.html"; // Redirigir a tienda
}

async function loadWalletStats(userId) {
    try {
        // Pedir todo el historial de este usuario
        const { data: myQueues, error } = await window.supabaseClient
            .from('queues')
            .select(`
                id, 
                status, 
                amount_paid, 
                created_at,
                product_id,
                claim_pin,
                products ( title, target_quantity, image_url )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Clasificar listas
        const waiting = myQueues.filter(q => q.status === 'WAITING');
        const released = myQueues.filter(q => q.status === 'RELEASED');
        
        // Calcular Platas
        let totalInvested = waiting.reduce((sum, item) => sum + Number(item.amount_paid), 0);
        
        document.getElementById('total-invested').innerText = "$" + totalInvested.toLocaleString('es-CO') + " COP";
        document.getElementById('active-groups').innerText = waiting.length;
        document.getElementById('released-groups').innerText = released.length;

        // Renderizar Lista 'En Espera' (Waiting)
        let wHtml = '';
        if (waiting.length === 0) {
            wHtml = '<div style="text-align: center; color: var(--text-secondary); padding: 3rem; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">No tienes ningún dinero congelado actualmente.</div>';
        } else {
            // Requerimos saber cuántos van en cada fila de producto para pintar la barrita
            for (let q of waiting) {
                // Consultamos cuántos hay WAITING para ese mismo producto
                const { count } = await window.supabaseClient
                    .from('queues')
                    .select('*', { count: 'exact', head: true })
                    .eq('product_id', q.product_id)
                    .eq('status', 'WAITING');
                
                let pTitle = q.products?.title || 'Producto Sin Nombre';
                let pImage = q.products?.image_url || 'https://via.placeholder.com/150?text=No+Ref';
                let target = q.products?.target_quantity || 10;
                let current = count || 1;
                let percent = Math.min(100, Math.round((current / target) * 100));

                let dateFmt = new Date(q.created_at).toLocaleDateString('es-CO');

                wHtml += `
                    <div class="invoice-card">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <img src="${pImage}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
                            <div>
                                <h4 style="margin:0; font-size:1rem; font-weight:700;">${pTitle}</h4>
                                <span style="font-size:0.7rem; color:var(--text-secondary); font-family:monospace;">ID: ${q.id} • Pagado el ${dateFmt}</span>
                            </div>
                        </div>
                        
                        <div style="text-align:center;">
                            <span class="invoice-status-waiting">⏰ Dinero Congelado</span>
                            <div style="font-size:0.8rem; margin-top:5px; color:#cbd5e1;"><i data-lucide="users" style="width:12px; display:inline;"></i> Faltan ${target - current} socios</div>
                            <div class="mini-progress">
                                <div class="mini-progress-fill" style="width: ${percent}%;"></div>
                            </div>
                        </div>
                        
                        <div style="text-align:right;">
                            <div style="font-size:0.8rem; color:var(--text-secondary);">Aporte Realizado</div>
                            <div style="font-size:1.2rem; font-weight:900; color:var(--brand-500);">$${Number(q.amount_paid).toLocaleString('es-CO')}</div>
                            <button onclick="reprintReceipt('${q.id}', '${pTitle.replace(/'/g, "\\'")}', ${q.amount_paid}, '${q.created_at}')" style="margin-top:10px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white; padding:4px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer;"><i data-lucide="receipt" style="width:12px; display:inline; margin-right:3px;"></i> Ver Recibo</button>
                        </div>
                    </div>
                `;
            }
        }
        document.getElementById('waiting-list').innerHTML = wHtml;

        // Renderizar Lista 'Liberados' (Exitosos)
        let rHtml = '';
        if (released.length === 0) {
            rHtml = '<div style="text-align: center; color: var(--text-secondary); padding: 3rem; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">Aún no tienes productos que hayan cerrado su grupo exitosamente.</div>';
        } else {
            for (let q of released) {
                let pTitle = q.products?.title || 'Producto Sin Nombre';
                let pImage = q.products?.image_url || 'https://via.placeholder.com/150?text=No+Ref';
                let dateFmt = new Date(q.created_at).toLocaleDateString('es-CO');
                
                rHtml += `
                    <div class="invoice-card" style="border-left: 4px solid #10b981;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <img src="${pImage}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
                            <div>
                                <div style="font-size:0.75rem; color:#10b981; font-weight:900; text-transform:uppercase; margin-bottom: 3px; letter-spacing: 0.5px;">Producto Adjudicado</div>
                                <h4 style="margin:0; font-size:1.1rem; font-weight:700;">${pTitle}</h4>
                                <span style="font-size:0.75rem; color:var(--text-secondary); font-family:monospace;">ID: ${q.id} • Lote Liberado el ${dateFmt}</span>
                            </div>
                        </div>
                        
                        <div style="text-align:center;">
                            <span class="invoice-status-released">📦 GRUPO COMPLETADO</span>
                            <div style="margin-top: 10px; padding: 10px; border: 1px dashed #10b981; border-radius: 8px; background: rgba(16, 185, 129, 0.1);">
                                <div style="font-size: 0.65rem; color: #10b981; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">PIN de Retiro en Tienda:</div>
                                <div style="font-size: 1.5rem; letter-spacing: 4px; font-weight: 900; color: white; font-family: monospace;">${q.claim_pin}</div>
                            </div>
                        </div>
                        
                        <div style="text-align:right;">
                            <div style="font-size:0.8rem; color:var(--text-secondary);">Aporte Exitoso</div>
                            <div style="font-size:1.2rem; font-weight:900; color:#10b981;">$${Number(q.amount_paid).toLocaleString('es-CO')}</div>
                            <button onclick="reprintReceipt('${q.id}', '${pTitle.replace(/'/g, "\\'")}', ${q.amount_paid}, '${q.created_at}')" style="margin-top:10px; background:rgba(16, 185, 129, 0.1); border:1px solid #10b981; color:#10b981; padding:4px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer;"><i data-lucide="receipt" style="width:12px; display:inline; margin-right:3px;"></i> Ver Recibo</button>
                        </div>
                    </div>
                `;
            }
        }
        document.getElementById('released-list').innerHTML = rHtml;

        // Reimprimir Iconos
        lucide.createIcons();

    } catch (err) {
        console.error("Error cargando perfil:", err);
        document.getElementById('waiting-list').innerHTML = `<p style="color:red;">Error de conexión: ${err.message}</p>`;
    }
}

// ------ LÓGICA DE REIMPRESIÓN DEL TICKET ------
function reprintReceipt(queueId, productTitle, amount, dateString) {
    const dIso = new Date(dateString);
    
    document.getElementById('r-date').innerText = dIso.toLocaleString('es-CO');
    document.getElementById('r-tx').innerText = queueId;
    document.getElementById('r-client').innerText = window.currentClientDetails || 'Cliente XLizmar';
    document.getElementById('r-product').innerText = productTitle;
    document.getElementById('r-total').innerText = "$" + Number(amount).toLocaleString('es-CO') + " COP";
    
    // Muestra explícitamente el div que ocultarlo por flexbox
    document.getElementById('receipt-modal').style.display = 'flex';
    document.getElementById('receipt-modal').classList.remove('hidden');
    lucide.createIcons();
}

function closeReceiptModal() {
    document.getElementById('receipt-modal').style.display = 'none';
    document.getElementById('receipt-modal').classList.add('hidden');
}
