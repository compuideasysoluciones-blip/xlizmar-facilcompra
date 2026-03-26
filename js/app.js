document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar iconos de Lucide
    lucide.createIcons();
    console.log("XLizmar Fácil Compra inicializado correctamente.");
    
    // Verificar si el usuario ya tiene sesión al cargar la página
    await refreshUserState();
    
    // Cargar Catálogo desde la Base de Datos Viva
    await loadCatalog();
});

// Renderizador Dinámico de Catálogo
async function loadCatalog() {
    if(!window.supabaseClient) return;

    const grid = document.getElementById('catalog-grid');
    if(!grid) return;

    try {
        // Pedimos todos los artículos activos
        const { data: products, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .eq('active', true);
            
        if(error) throw error;
        
        // Pedimos estado de filas para saber la barra de progreso
        const { data: queues, error: qError } = await window.supabaseClient
            .from('queues')
            .select('product_id')
            .eq('status', 'WAITING');

        if(qError) throw qError;

        let html = '';
        
        products.forEach(p => {
            // Lógica de llenado
            const waitingCount = queues.filter(q => q.product_id === p.id).length;
            const target = p.target_quantity || 10;
            const percentage = Math.min(100, Math.round((waitingCount / target) * 100));
            // Usamos el descuento exclusivo variable de este producto (Ej: 35 -> divide por 100)
            const productDiscount = p.discount_percentage || 35;
            const groupPrice = p.retail_price * (1 - (productDiscount / 100));
            
            const image = p.image_url || 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800';
            const storeName = p.store_name || 'XLizmar Central';
            const storePhone = p.store_phone || 'Soporte XLizmar';
            
            // Creamos un cajón premium blanco donde meter siempre el logo de la tienda para que resalte
            const storeLogoHtml = p.store_logo_url 
                ? `<img src="${p.store_logo_url}" alt="${storeName}" style="max-width:100%; max-height:100%; object-fit:contain;">`
                : `<i data-lucide="store" style="width:24px; color:#1e293b;"></i>`;
            
            html += `
                <div class="card product-card">
                    <img src="${image}" alt="${p.title}" class="product-img">
                    <div class="card-content">
                        <!-- BANNER ALIANZA PREMIUM -->
                        <div style="display:flex; align-items:center; justify-content: space-between; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.08);">
                            <div style="display:flex; flex-direction:column; gap:3px;">
                                <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; color:var(--brand-500); font-weight:900;"><i data-lucide="award" style="width:12px; display:inline;"></i> ALIANZA OFICIAL</span>
                                <span style="font-size:1rem; font-weight:700; color:white;">XLizmar & ${storeName}</span>
                                <a href="tel:${storePhone}" style="font-size:0.75rem; color:#10b981; text-decoration:none; margin-top:2px;">
                                    <i data-lucide="phone" style="width:12px; display:inline; vertical-align:middle;"></i> Llama a su Oficina: ${storePhone}
                                </a>
                            </div>
                            <div style="background: white; padding: 6px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; width: 45px; height: 45px; flex-shrink:0;">
                                ${storeLogoHtml}
                            </div>
                        </div>
                        <!-- FIN BANNER -->

                        <h3>${p.title}</h3>
                        <div class="pricing">
                            <span class="retail-price">Precio Regular: $${Number(p.retail_price).toLocaleString('es-CO')}</span>
                            <span class="group-price">Precio de Grupo: $${groupPrice.toLocaleString('es-CO')}</span>
                        </div>
                        
                        <div class="progress-section">
                            <div class="progress-header">
                                <span class="group-status"><i data-lucide="users" style="width:14px; margin-right:4px;"></i> ${waitingCount} / ${target} Personas</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
                            </div>
                        </div>

                        <button class="btn-primary w-full mt-4" onclick="joinGroup(event, '${p.id}', ${groupPrice})">Separar Cupo con $${groupPrice.toLocaleString('es-CO')}</button>
                        <p class="terms-text"><i data-lucide="shield-check" style="width:12px;"></i> Tu dinero congelado. Reembolso si no se llena en 15 días.</p>
                        
                        ${superClaveActiva ? `
                        <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                            <button onclick="pauseAdminProduct('${p.id}')" style="width:100%; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 0.8rem; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;">
                                <i data-lucide="power-off" style="width:16px; margin-right:4px;"></i> Bajar Publicación (Modo Dios)
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        if (products.length === 0) {
            html = '<p style="text-align:center; grid-column:1/-1;">No hay alianzas disponibles hoy.</p>';
        }
        
        grid.innerHTML = html;
        lucide.createIcons(); // Recargar Iconos
        
    } catch(err) {
        console.error("Error al cargar:", err);
        grid.innerHTML = '<p style="text-align:center; color:red; grid-column:1/-1;">Error temporal al conectar comercio.</p>';
    }
}

// Función de Compra Grupal
async function joinGroup(event, productId, groupPrice) {
    if (!window.supabaseClient) {
        alert("⚠️ Falta conectar la base de datos.");
        return;
    }
    
    // Validamos si tiene sesión
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        openAuthModal();
    } else {
        // Simulador de Mercado Pago
        const confirmacion = confirm(`💳 SIMULACIÓN DE MERCADO PAGO:\n\n¿Deseas pagar realmente $${groupPrice.toLocaleString('es-CO')} COP para apartar tu cupo en la fila de este producto?`);
        if (confirmacion) {
            // Buscamos el nombre del producto para el recibo
            const productTitleEle = event.target.closest('.product-card').querySelector('h3');
            const pTitle = productTitleEle ? productTitleEle.innerText : 'Producto de Grupo';
            simulatePayment(event.target, productId, groupPrice, pTitle);
        }
    }
}

async function simulatePayment(btnElement, productId, amount, pTitle) {
    let oldText = btnElement.innerText;
    btnElement.innerText = "Procesando pago y fila...";
    btnElement.disabled = true;
    
    try {
        const { data, error } = await window.supabaseClient.rpc('procesar_compra_grupal', {
            p_product_id: productId,
            p_amount_paid: amount
        });
        
        if (error) throw error;
        
        console.log("Resultado del Motor Transaccional:", data);
        
        if (data.success) {
            // Ya no mostramos alert, mostramos el RECIBO OFICIAL PREMIUM
            showReceiptModal(data, amount, pTitle);
            await loadCatalog(); // Refrescamos el grid porque las posiciones cambiaron
        } else {
            alert("❌ El motor arrojó un error: " + data.error);
        }
        
    } catch(err) {
        alert("❌ Transacción bloqueada: " + err.message);
    } finally {
        btnElement.innerText = oldText;
        btnElement.disabled = false;
    }
}

// ------ MODAL LÓGICA (UI) ------
function openAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function switchAuthTab(tab) {
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.remove('active');
    
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    
    if (tab === 'login') {
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('modal-title').innerText = "Bienvenido a XLizmar";
        document.getElementById('modal-subtitle').innerText = "Inicia sesión para congelar tus precios";
    } else {
        document.getElementById('tab-register').classList.add('active');
        document.getElementById('register-form').classList.remove('hidden');
        document.getElementById('modal-title').innerText = "Crea tu cuenta segura";
        document.getElementById('modal-subtitle').innerText = "Únete a las compras en equipo";
    }
}

// ------ LÓGICA DE RECIBOS ------
async function showReceiptModal(transData, amount, pTitle) {
    if(!window.supabaseClient) return;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    let clientName = 'Usuario Seguro';
    if(session) {
        const { data: p } = await window.supabaseClient.from('profiles').select('full_name, document_id').eq('id', session.user.id).single();
        if(p) clientName = p.full_name + ' (CC. ' + p.document_id + ')';
    }

    const today = new Date();
    document.getElementById('r-date').innerText = today.toLocaleString('es-CO');
    document.getElementById('r-tx').innerText = transData.queue_id || 'ID-Generando-X';
    document.getElementById('r-client').innerText = clientName;
    document.getElementById('r-product').innerText = pTitle;
    document.getElementById('r-total').innerText = "$" + amount.toLocaleString('es-CO') + " COP";
    
    document.getElementById('r-message').innerText = "📢 " + transData.message;

    document.getElementById('receipt-modal').classList.remove('hidden');
    lucide.createIcons();
}

function closeReceiptModal() {
    document.getElementById('receipt-modal').classList.add('hidden');
}

// ------ AUTENTICACIÓN LOGICA (SUPABASE) ------

async function handleLogin(e) {
    e.preventDefault();
    if (!window.supabaseClient) return alert('Supabase no conectado. Pega tu API Key en config.js');
    
    let btn = document.getElementById('btn-login-submit');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    btn.innerText = "Ingresando...";
    btn.disabled = true;

    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        closeAuthModal();
        await refreshUserState();
    } catch (err) {
        alert("❌ Error: " + err.message);
    } finally {
        btn.innerText = "Entrar a mi cuenta";
        btn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    if (!window.supabaseClient) return alert('Supabase no conectado. Pega tu API Key en config.js');
    
    let btn = document.getElementById('btn-reg-submit');
    btn.innerText = "Creando cuenta en servidor...";
    btn.disabled = true;

    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const fullName = document.getElementById('reg-name').value;
    const documentId = document.getElementById('reg-document').value;
    const phone = document.getElementById('reg-phone').value;

    try {
        // 1. Crear usuario en el servicio seguro de Autenticación con Metadata
        const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    document_id: documentId,
                    phone: phone
                }
            }
        });
        
        if (authError) throw authError;

        if (authData?.user) {
            // 2. Insertar en public.profiles SERÁ MANEJADO POR UN TRIGGER DIRECTAMENTE EN LA BASE DE DATOS
            // Esto asegura que nunca ocurran errores de fila de seguridad RLS
            alert("✅ ¡Cuenta segura procesada! Ve y compra en equipo. Si no se refleja tu nombre, recarga la página.");
            closeAuthModal();
            await refreshUserState();
        }
    } catch (err) {
        alert("❌ Error de registro: " + err.message);
    } finally {
        btn.innerText = "Crear cuenta segura";
        btn.disabled = false;
    }
}

async function refreshUserState() {
    if (!window.supabaseClient) return;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    const userMenu = document.getElementById('user-menu');
    
    if (session) {
        // Traer nombre desde Profile
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('full_name')
            .eq('id', session.user.id)
            .single();
            
        let name = profile ? profile.full_name.split(' ')[0] : 'Socio';
        
        userMenu.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="user-circle" style="width: 20px; color: var(--brand-500);"></i>
                    <span style="font-size: 0.95rem; font-weight: 700; color: white;">Hola, ${name}</span>
                </div>
                <!-- NUEVO BOTON A MI BILLETERA -->
                <button onclick="window.location.href='perfil.html'" class="btn-primary" style="padding: 0.4rem 1rem; border-radius: 99px; font-size: 0.8rem; height: auto;">
                    <i data-lucide="wallet" style="width:14px; display:inline; margin-right:4px;"></i> Mi Billetera
                </button>
                <button onclick="logout()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 0.4rem 1rem; border-radius: 99px; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: 0.2s;">
                    Cerrar sesión <i data-lucide="log-out" style="width:14px; display:inline; margin-left:4px;"></i>
                </button>
            </div>
        `;
    } else {
        userMenu.innerHTML = `<button class="btn-primary" style="padding: 0.5rem 1.5rem; font-size: 0.9rem;" onclick="openAuthModal()">Iniciar Sesión</button>`;
    }
    
    // Reimprimir iconos recién inyectados
    setTimeout(() => { lucide.createIcons(); }, 100);
}

async function logout() {
    if (!window.supabaseClient) return;
    await window.supabaseClient.auth.signOut();
    await refreshUserState();
}

// ------ LÓGICA DE MODO DIOS (ADMIN) ------
let adminClicks = 0;
let clickTimer = null;
let superClaveActiva = "";

function triggerAdminMode() {
    adminClicks++;
    
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { adminClicks = 0; }, 1000); // 1 segundo para dar los 3 clics

    if (adminClicks >= 3) {
        adminClicks = 0;
        let clave = prompt("🛡️ MODO DIOS DETECTADO\n\nPor favor, digite la Super Clave del CEO:");
        if (clave === "XLIZMAR-CEO-2026") {
            superClaveActiva = clave;
            document.getElementById('admin-panel').classList.remove('hidden');
            window.scrollTo({ top: document.getElementById('admin-panel').offsetTop, behavior: 'smooth' });
            alert("✅ ¡Hola Jefe! El Panel Creador ha sido habilitado de forma segura.");
            loadCatalog(); // Forzamos recarga para que salgan los botones de Bajar Publicación
        } else {
            alert("❌ Acceso Denegado.");
        }
    }
}

function closeAdminMode() {
    superClaveActiva = "";
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('admin-form').reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadCatalog(); // Quitamos los botones de pausa
}

async function submitAdminProduct(e) {
    e.preventDefault();
    if(!window.supabaseClient) return;
    
    let btn = document.getElementById('btn-admin-submit');
    btn.innerText = "Publicando Producto Mundial...";
    btn.disabled = true;

    try {
        const title = document.getElementById('admin-title').value;
        const retailPrice = Number(document.getElementById('admin-price').value);
        const discountP = Number(document.getElementById('admin-discount').value || 35);
        const feeP = Number(document.getElementById('admin-fee').value || 30);
        const targetQ = Number(document.getElementById('admin-target').value);
        const inventoryStock = Number(document.getElementById('admin-stock').value || targetQ);
        
        // Archivos
        const fileInput = document.getElementById('admin-image-file');
        const file = fileInput.files[0];
        
        const storeName = document.getElementById('admin-store-name').value;
        const storePhone = document.getElementById('admin-store-phone').value;
        const storeLogoInput = document.getElementById('admin-store-logo');
        const storeLogoFile = storeLogoInput.files[0];
        
        let imageUrl = '';
        let storeLogoUrl = '';

        if (file) {
            btn.innerText = "Subiendo foto 1/2 📸...";
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_img.${fileExt}`;
            const { error: uploadError } = await window.supabaseClient.storage.from('productos').upload(`public/${fileName}`, file);
            if (uploadError) throw new Error("Error foto: " + uploadError.message);
            imageUrl = window.supabaseClient.storage.from('productos').getPublicUrl(`public/${fileName}`).data.publicUrl;
        }
        
        if (storeLogoFile) {
            btn.innerText = "Subiendo logo 2/2 🏢...";
            const fileExt = storeLogoFile.name.split('.').pop();
            const fileName = `${Date.now()}_logo.${fileExt}`;
            const { error: uploadError } = await window.supabaseClient.storage.from('productos').upload(`public/${fileName}`, storeLogoFile);
            if (uploadError) throw new Error("Error logo aliado: " + uploadError.message);
            storeLogoUrl = window.supabaseClient.storage.from('productos').getPublicUrl(`public/${fileName}`).data.publicUrl;
        }

        btn.innerText = "Publicando Producto Mundial...";

        // Llamamos a la bóveda secreta con SECURITY DEFINER
        const { data, error } = await window.supabaseClient.rpc('agregar_producto_admin', {
            p_clave: superClaveActiva,
            p_title: title,
            p_retail_price: retailPrice,
            p_target_quantity: targetQ,
            p_image_url: imageUrl,
            p_store_name: storeName,
            p_store_logo_url: storeLogoUrl,
            p_inventory_stock: inventoryStock,
            p_store_phone: storePhone,
            p_discount_percentage: discountP,
            p_platform_fee_percentage: feeP
        });

        if (error) throw error;

        if (data.success) {
            alert("⚡ ¡ALIANZA PÚBLICA EXITOSA! Tus clientes ya pueden ver este producto.");
            document.getElementById('admin-form').reset();
            // Refrescar el catálogo en vivo
            await loadCatalog();
            window.scrollTo({ top: document.getElementById('catalog-container').offsetTop, behavior: 'smooth' });
        } else {
            alert("❌ Error: " + data.error);
        }
    } catch (err) {
        alert("❌ Error bloqueado en el servidor: " + err.message);
    } finally {
        btn.innerText = "Publicar Alianza Mundial 🔥";
        btn.disabled = false;
    }
}

// ------ LÓGICA DE BAJAR PUBLICACIÓN ------
async function pauseAdminProduct(productId) {
    if (!window.supabaseClient) return;
    
    let confirmacion = confirm("⚠️ MODO DIOS: ¿Estás completamente seguro de que quieres ocultar / vaciar esta publicación? Ya no recibirá más filas.");
    if(!confirmacion) return;

    try {
        const { data, error } = await window.supabaseClient.rpc('bajar_producto_admin', {
            p_clave: superClaveActiva,
            p_product_id: productId
        });

        if (error) throw error;

        if (data.success) {
            alert("🗑️ ¡Publicación dada de baja exitosamente del sistema de clientes!");
            await loadCatalog();
        } else {
            alert("❌ Falló: " + data.error);
        }
    } catch (err) {
        alert("❌ Error crítico en el servidor: " + err.message);
    }
}
