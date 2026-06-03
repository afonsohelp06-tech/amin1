/**
 * AZAVISION - Panneau d'administration (logique métier)
 * Dépend de : demo-store.js, api.js (API_URL dans index.html)
 */
// ============================================================
// CONFIGURATION
// ============================================================
const ADMIN_CONFIG = {
    password: 'azavision_admin',
    apiUrl: ''
};

// ============================================================
// DATA STORE
// ============================================================
let STORE = { products: [], orders: [], promoCodes: [], accounts: [] };

function persistDemoProducts() {
    if (!AzavisionAPI.isLive()) DemoStore.saveProducts(STORE.products);
}
function persistDemoOrders() {
    if (!AzavisionAPI.isLive()) DemoStore.saveOrders(STORE.orders);
}
function persistDemoPromos() {
    if (!AzavisionAPI.isLive()) DemoStore.savePromos(STORE.promoCodes);
}

function orderStatusBadge(statut) {
    const s = String(statut || '').toLowerCase();
    if (s.includes('exp')) return 'badge-shipped';
    if (s.includes('livr')) return 'badge-delivered';
    if (s.includes('annul')) return 'badge-cancelled';
    if (s.includes('pay')) return 'badge-paid';
    return 'badge-pending';
}

function loadConfigFormFromStore() {
    const cfg = DemoStore.getConfig();
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('cfg-name', cfg["Nom de l'enseigne"] || 'Azavision');
    set('cfg-email', cfg["E-mail de contact client"] || 'contact@azavision.pt');
    const tva = String(cfg["TVA applicable (%)"] || '23').replace('%', '').trim();
    set('cfg-tva', parseFloat(tva) || 23);
    const ship = String(cfg["Seuil livraison gratuite (€)"] || '150').replace(/\s*€\s*/g, '').trim();
    set('cfg-shipping', parseFloat(ship) || 150);
    set('cfg-nif', cfg["NIF Entreprise (Portugal)"] || '999999999');
}

// ============================================================
// AUTH
// ============================================================
function togglePassVis() {
    const input = document.getElementById('login-pass');
    const icon = document.getElementById('eye-icon');
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.className = input.type === 'password' ? 'fa-regular fa-eye text-sm' : 'fa-regular fa-eye-slash text-sm';
}

function doLogin() {
    const pass = (document.getElementById('login-pass').value || '').trim();
    if (pass === ADMIN_CONFIG.password) {
        document.getElementById('login-screen').style.opacity = '0';
        document.getElementById('login-screen').style.pointerEvents = 'none';
        setTimeout(() => document.getElementById('login-screen').classList.add('hidden'), 400);
        document.getElementById('admin-app').classList.remove('hidden');
        initAdminApp();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
        document.getElementById('login-pass').classList.add('border-red-500');
    }
}

function doLogout() {
    location.reload();
}

// ============================================================
// NAVIGATION
// ============================================================
const TABS = ['dashboard','produits','commandes','clients','stocks','promotions','analytics','config'];
const TITLES = {
    dashboard: ['Tableau de bord', 'Vue d\'ensemble de la boutique'],
    produits: ['Gestion des produits', 'Ajouter, modifier ou supprimer des articles'],
    commandes: ['Commandes', 'Suivi et gestion des exp�ditions'],
    clients: ['Clients', 'Base de donn�es client�le'],
    stocks: ['Gestion des stocks', 'Suivi des inventaires en temps r�el'],
    promotions: ['Promotions & Codes', 'Codes promo, banni�res et ventes priv�es'],
    analytics: ['Analytiques', 'Performances et statistiques de la boutique'],
    config: ['Configuration', 'Param�tres de l\'entreprise et s�curit�']
};

function showTab(name) {
    TABS.forEach(t => {
        document.getElementById(`tab-${t}`).classList.remove('active');
        const nav = document.getElementById(`nav-${t}`);
        if (nav) {
            nav.classList.remove('active');
            nav.classList.add('text-neutral-400');
        }
    });
    const activeTab = document.getElementById(`tab-${name}`);
    if (activeTab) activeTab.classList.add('active');
    
    const activeNav = document.getElementById(`nav-${name}`);
    if (activeNav) {
        activeNav.classList.add('active');
        activeNav.classList.remove('text-neutral-400');
    }
    document.getElementById('page-title').textContent = TITLES[name][0];
    document.getElementById('page-subtitle').textContent = TITLES[name][1];

    if (name === 'produits') renderProductsTable();
    if (name === 'commandes') renderOrdersTable();
    if (name === 'clients') renderClientsTable();
    if (name === 'stocks') renderStocksTable();
    if (name === 'promotions') renderPromoCodes();
    if (name === 'analytics') renderAnalytics();
}

function toggleSidebarMobile() {
    const nav = document.getElementById('nav-links');
    nav.classList.toggle('hidden');
}

// ============================================================
// INIT
// ============================================================
function updateApiStatusDisplay() {
    ADMIN_CONFIG.apiUrl = AzavisionAPI.getUrl();
    const status = document.getElementById('api-status');
    if (!status) return;
    if (AzavisionAPI.isLive()) {
        status.innerHTML = '<div class="w-1.5 h-1.5 rounded-full bg-green-400"></div> API connectee';
    } else {
        status.innerHTML = '<div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Mode local';
    }
}

function refreshActiveTab() {
    const active = TABS.find(t => {
        const el = document.getElementById('tab-' + t);
        return el && el.classList.contains('active');
    });
    if (active) showTab(active);
}

function loadDemoStore() {
    STORE.products = DemoStore.getProducts();
    STORE.orders = DemoStore.getOrders();
    STORE.accounts = DemoStore.getAccounts();
    STORE.promoCodes = DemoStore.getPromos();
    if (!STORE.promoCodes.length) {
        STORE.promoCodes = [
            { code: 'AZA10', type: 'percent', value: 10, uses: 0, maxUses: 0, active: true },
            { code: 'LISBOA20', type: 'percent', value: 20, uses: 0, maxUses: 50, active: true }
        ];
        persistDemoPromos();
    }
}

function initAdminApp() {
    DemoStore.init();
    updateApiStatusDisplay();
    loadConfigFormFromStore();
    renderPromoCodes();
    if (AzavisionAPI.isLive()) {
        syncData();
    } else {
        loadDemoStore();
        renderDashboard();
        refreshActiveTab();
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !AzavisionAPI.isLive()) {
            STORE.orders = DemoStore.getOrders();
            STORE.products = DemoStore.getProducts();
            renderDashboard();
            if (document.getElementById('tab-commandes').classList.contains('active')) renderOrdersTable();
        }
    });
}

async function syncData() {
    try {
        const [prodRes, ordRes, accRes] = await Promise.all([
            AzavisionAPI.getProducts(),
            AzavisionAPI.getOrders(),
            AzavisionAPI.getAccounts()
        ]);
        if (prodRes.status === 'success' && prodRes.data) STORE.products = prodRes.data;
        if (ordRes.status === 'success' && ordRes.orders) STORE.orders = ordRes.orders;
        if (accRes.status === 'success' && accRes.accounts) STORE.accounts = accRes.accounts;
        renderDashboard();
        refreshActiveTab();
        showAdminToast('Donnees synchronisees.');
    } catch (e) {
        console.error('syncData', e);
        loadDemoStore();
        renderDashboard();
        refreshActiveTab();
        showAdminToast('Synchronisation API impossible — affichage local.', true);
    }
}


// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
    const totalStock = STORE.products.reduce((s, p) => s + parseInt(p.stock || 0), 0);
    const totalRevenue = STORE.orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const pending = STORE.orders.filter(o => o.statut === 'En attente').length;

    document.getElementById('stat-revenue').textContent = totalRevenue.toLocaleString('fr-FR') + ' EUR';
    document.getElementById('stat-orders').textContent = STORE.orders.length;
    document.getElementById('stat-products').textContent = totalStock;
    document.getElementById('stat-products-badge').textContent = STORE.products.length + ' refs';
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-pending-badge').textContent = pending;

    if (pending > 0) {
        document.getElementById('badge-pending-orders').textContent = pending;
        document.getElementById('badge-pending-orders').classList.remove('hidden');
    }

    // Recent orders
    const tbody = document.getElementById('recent-orders-table');
    tbody.innerHTML = '';
    STORE.orders.slice(0, 5).forEach(o => {
        const badgeClass = orderStatusBadge(o.statut);
        const tr = document.createElement('tr');
        tr.className = 'table-row';
        tr.innerHTML = `
            <td class="px-6 py-3.5 text-xs font-semibold text-gold">${o.id_commande}</td>
            <td class="px-4 py-3.5 text-xs text-neutral-300">${o.prenom} ${o.nom}</td>
            <td class="px-4 py-3.5 text-xs font-bold text-white">${parseFloat(o.total).toFixed(2)} €</td>
            <td class="px-4 py-3.5"><span class="text-[9px] px-2 py-1 rounded-full font-bold uppercase ${badgeClass}">${o.statut}</span></td>
        `;
        tbody.appendChild(tr);
    });

    // Stock alerts
    const alertsDiv = document.getElementById('stock-alerts');
    alertsDiv.innerHTML = '';
    const lowStock = STORE.products.filter(p => parseInt(p.stock) <= 5).sort((a,b) => a.stock - b.stock);
    if (lowStock.length === 0) {
        alertsDiv.innerHTML = '<div class="px-6 py-8 text-center text-[10px] text-neutral-600 uppercase tracking-wider">Aucune alerte stock</div>';
    } else {
        lowStock.forEach(p => {
            const stockInt = parseInt(p.stock);
            const color = stockInt === 0 ? 'text-red-400' : stockInt <= 3 ? 'text-amber-400' : 'text-yellow-400';
            const icon = stockInt === 0 ? 'fa-ban' : 'fa-triangle-exclamation';
            alertsDiv.innerHTML += `
                <div class="px-6 py-3.5 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-neutral-200 line-clamp-1">${p.nom}</p>
                        <p class="text-[10px] text-neutral-500">${p.categorie}</p>
                    </div>
                    <span class="${color} text-xs font-bold flex items-center gap-1.5">
                        <i class="fa-solid ${icon} text-[10px]"></i> ${stockInt === 0 ? 'Rupture' : stockInt}
                    </span>
                </div>
            `;
        });
    }
}

// ============================================================
// PRODUCTS TABLE
// ============================================================
function renderProductsTable(list) {
    const products = list || STORE.products;
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '';
    products.forEach(p => {
        const stockInt = parseInt(p.stock);
        const stockColor = stockInt === 0 ? 'text-red-400' : stockInt <= 3 ? 'text-amber-400' : 'text-green-400';
        const tr = document.createElement('tr');
        tr.className = 'table-row';
        tr.innerHTML = `
            <td class="px-6 py-3.5">
                <img src="${p.image}" alt="${p.nom}" class="w-10 h-12 object-cover rounded-lg bg-admin-border" onerror="this.src='https://placehold.co/40x48/1c1c1c/C5A880?text=N'">
            </td>
            <td class="px-4 py-3.5">
                <p class="text-xs font-semibold text-neutral-200 line-clamp-1">${p.nom}</p>
                <p class="text-[10px] text-neutral-500">${p.id}</p>
            </td>
            <td class="px-4 py-3.5 text-[10px] uppercase tracking-wider">
                <span class="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-400">${p.categorie}</span>
            </td>
            <td class="px-4 py-3.5 text-xs font-bold text-white">${parseFloat(p.prix).toFixed(2)} €</td>
            <td class="px-4 py-3.5 text-xs font-bold ${stockColor}">${stockInt}</td>
            <td class="px-4 py-3.5 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="editProduct('${p.id}')" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition flex items-center justify-center" title="Modifier">
                        <i class="fa-solid fa-pen text-xs"></i>
                    </button>
                    <button onclick="duplicateProduct('${p.id}')" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition flex items-center justify-center" title="Dupliquer">
                        <i class="fa-solid fa-copy text-xs"></i>
                    </button>
                    <button onclick="deleteProduct('${p.id}')" class="w-8 h-8 rounded-lg bg-red-500/5 hover:bg-red-500/20 text-red-500/50 hover:text-red-400 transition flex items-center justify-center" title="Supprimer">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterProducts() {
    const query = document.getElementById('prod-search').value.toLowerCase();
    const cat = document.getElementById('prod-cat-filter').value;
    const filtered = STORE.products.filter(p => {
        const matchQ = p.nom.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
        const matchC = !cat || p.categorie === cat;
        return matchQ && matchC;
    });
    renderProductsTable(filtered);
}

function openProductModal(id) {
    document.getElementById('pm-editing-id').value = '';
    document.getElementById('pm-id').value = '';
    document.getElementById('pm-name').value = '';
    document.getElementById('pm-price').value = '';
    document.getElementById('pm-stock').value = '';
    document.getElementById('pm-image').value = '';
    document.getElementById('pm-desc').value = '';
    document.getElementById('product-modal-title').textContent = 'Nouveau produit';
    document.getElementById('pm-id').disabled = false;
    document.getElementById('product-modal').classList.remove('hidden');
}

function editProduct(id) {
    const p = STORE.products.find(p => p.id === id);
    if (!p) return;
    document.getElementById('pm-editing-id').value = id;
    document.getElementById('pm-id').value = p.id;
    document.getElementById('pm-id').disabled = true;
    document.getElementById('pm-cat').value = p.categorie;
    document.getElementById('pm-name').value = p.nom;
    document.getElementById('pm-price').value = p.prix;
    document.getElementById('pm-stock').value = p.stock;
    document.getElementById('pm-image').value = p.image;
    document.getElementById('pm-desc').value = p.description || '';
    document.getElementById('product-modal-title').textContent = 'Modifier le produit';
    document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

function saveProduct() {
    const editingId = document.getElementById('pm-editing-id').value;
    const id = document.getElementById('pm-id').value.trim();
    const nom = document.getElementById('pm-name').value.trim();
    const prix = parseFloat(document.getElementById('pm-price').value);
    const stock = parseInt(document.getElementById('pm-stock').value);
    const image = document.getElementById('pm-image').value.trim();
    const categorie = document.getElementById('pm-cat').value;
    const description = document.getElementById('pm-desc').value.trim();

    if (!id || !nom || isNaN(prix) || isNaN(stock)) {
        showAdminToast('Veuillez remplir tous les champs obligatoires.', true);
        return;
    }

    const productData = { id: editingId || id, nom, categorie, prix, stock, image, description };
    if (editingId) {
        const idx = STORE.products.findIndex(p => p.id === editingId);
        if (idx > -1) STORE.products[idx] = productData;
        AzavisionAPI.updateProduct(productData).catch(() => {});
        persistDemoProducts();
    } else {
        if (STORE.products.find(p => p.id === id)) { showAdminToast('Cet ID existe d�j�.', true); return; }
        STORE.products.push(productData);
        AzavisionAPI.addProduct(productData).catch(() => {});
        persistDemoProducts();
    }

    closeProductModal();
    renderProductsTable();
    renderDashboard();
    showAdminToast(editingId ? 'Produit mis � jour !' : 'Produit ajouté� au catalogue !');
}

function duplicateProduct(id) {
    const p = STORE.products.find(p => p.id === id);
    if (!p) return;
    const newId = id + '_copy_' + Date.now().toString().slice(-4);
    const copy = { ...p, id: newId, nom: p.nom + ' (Copie)' };
    STORE.products.push(copy);
    AzavisionAPI.addProduct(copy).catch(() => {});
    persistDemoProducts();
    renderProductsTable();
    renderDashboard();
    showAdminToast('Produit duplique : ' + newId);
}

function deleteProduct(id) {
    if (!confirm('Supprimer definitivement ce produit ?')) return;
    const idx = STORE.products.findIndex(p => p.id === id);
    if (idx > -1) {
        STORE.products.splice(idx, 1);
        AzavisionAPI.deleteProduct(id).catch(() => {});
        persistDemoProducts();
        renderProductsTable();
        renderDashboard();
        showAdminToast('Produit supprim�.');
    }
}

// ============================================================
// ORDERS TABLE
// ============================================================
function renderOrdersTable(list) {
    const orders = list || STORE.orders;
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '';
    orders.forEach(o => {
        const badgeClass = orderStatusBadge(o.statut);
        const tr = document.createElement('tr');
        tr.className = 'table-row';
        tr.innerHTML = `
            <td class="px-6 py-4">
                <p class="text-xs font-bold text-gold">${o.id_commande}</p>
                <p class="text-[10px] text-neutral-500">${o.date}</p>
            </td>
            <td class="px-4 py-4">
                <p class="text-xs font-semibold text-neutral-200">${o.prenom} ${o.nom}</p>
                <p class="text-[10px] text-neutral-500">${o.email}</p>
            </td>
            <td class="px-4 py-4 text-xs text-neutral-400 max-w-[160px]">
                <span class="block truncate" title="${o.articles}">${o.articles}</span>
            </td>
            <td class="px-4 py-4 text-xs font-bold text-white">${parseFloat(o.total).toFixed(2)} €</td>
            <td class="px-4 py-4">
                <span class="text-[9px] px-2 py-1 rounded-full font-bold uppercase ${badgeClass}">${o.statut}</span>
            </td>
            <td class="px-4 py-4 text-right">
                <select onchange="updateOrderStatus('${o.id_commande}', this.value)" class="px-2 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-admin-bg border-admin-border">
                    <option value="En attente" ${o.statut==='En attente' ? 'selected' : ''}>En attente</option>
                    <option value="Pay\u00e9" ${o.statut==='Pay\u00e9' ? 'selected' : ''}>Pay\u00e9</option>
                    <option value="Exp\u00e9di\u00e9" ${o.statut==='Exp\u00e9di\u00e9' ? 'selected' : ''}>Exp\u00e9di\u00e9</option>
                    <option value="Livr\u00e9" ${o.statut==='Livr\u00e9' ? 'selected' : ''}>Livr\u00e9</option>
                    <option value="Annul\u00e9" ${o.statut==='Annul\u00e9' ? 'selected' : ''}>Annul\u00e9</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterOrders() {
    const q = document.getElementById('order-search').value.toLowerCase();
    const st = document.getElementById('order-status-filter').value;
    const filtered = STORE.orders.filter(o => {
        const matchQ = o.id_commande.toLowerCase().includes(q) || (o.prenom + ' ' + o.nom).toLowerCase().includes(q) || o.email.toLowerCase().includes(q);
        const matchS = !st || o.statut === st;
        return matchQ && matchS;
    });
    renderOrdersTable(filtered);
}

function updateOrderStatus(id, newStatus) {
    const o = STORE.orders.find(o => o.id_commande === id);
    if (o) {
        o.statut = newStatus;
        renderDashboard();
        showAdminToast(`Commande ${id} -> ${newStatus}`);
        AzavisionAPI.updateOrderStatus(id, newStatus).catch(() => {});
        persistDemoOrders();
        renderOrdersTable();
    }
}

function exportOrders() {
    const headers = ['ID_Commande','Date','Prenom','Nom','Email','Adresse','Articles','Total','Statut'];
    const rows = STORE.orders.map(o => [o.id_commande, o.date, o.prenom, o.nom, o.email, o.adresse||'', o.articles, o.total, o.statut]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `commandes_azavision_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    showAdminToast('Export CSV t�l�charg� !');
}

// ============================================================
// CLIENTS TABLE
// ============================================================
function renderClientsTable() {
    const clientMap = {};
    (STORE.accounts || []).forEach(a => {
        const key = String(a.email || '').toLowerCase();
        if (!key) return;
        clientMap[key] = {
            prenom: a.prenom, nom: a.nom, email: a.email, nif: a.nif || '-',
            registered: true, orders: 0, total: 0
        };
    });
    STORE.orders.forEach(o => {
        const key = String(o.email || '').toLowerCase();
        if (!key) return;
        if (!clientMap[key]) {
            clientMap[key] = {
                prenom: o.prenom, nom: o.nom, email: o.email, nif: o.nif || '-',
                registered: false, orders: 0, total: 0
            };
        }
        clientMap[key].orders++;
        clientMap[key].total += parseFloat(o.total || 0);
    });
    const clients = Object.values(clientMap);
    const regCount = clients.filter(c => c.registered).length;
    const el = document.getElementById('clients-count');
    if (el) el.textContent = clients.length + ' clients (' + regCount + ' com conta)';
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!clients.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-[10px] text-neutral-500">Aucun client</td></tr>';
        return;
    }
    clients.forEach(c => {
        const ini = (c.prenom && c.prenom[0] || '?') + (c.nom && c.nom[0] || '');
        const badge = c.registered
            ? '<span class="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Compte</span>'
            : '<span class="text-[9px] px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-500">Invite</span>';
        const tr = document.createElement('tr');
        tr.className = 'table-row';
        tr.innerHTML = '<td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-[10px] font-bold">' + ini + '</div><span class="text-xs font-semibold text-neutral-200">' + c.prenom + ' ' + c.nom + '</span></div></td><td class="px-4 py-4 text-xs text-neutral-400">' + c.email + '</td><td class="px-4 py-4 text-xs text-neutral-500">' + c.nif + '</td><td class="px-4 py-4">' + badge + '</td><td class="px-4 py-4 text-xs font-bold text-white">' + c.orders + '</td><td class="px-4 py-4 text-xs font-bold text-gold">' + c.total.toFixed(2) + ' EUR</td>';
        tbody.appendChild(tr);
    });
}

// ============================================================
// STOCKS TABLE
// ============================================================
function renderStocksTable() {
    const total = STORE.products.reduce((s, p) => s + parseInt(p.stock||0), 0);
    const critical = STORE.products.filter(p => parseInt(p.stock) > 0 && parseInt(p.stock) <= 3).length;
    const outOf = STORE.products.filter(p => parseInt(p.stock) <= 0).length;
    document.getElementById('total-stock-count').textContent = total;
    document.getElementById('critical-stock-count').textContent = critical;
    document.getElementById('out-of-stock-count').textContent = outOf;

    const maxStock = Math.max(...STORE.products.map(p => parseInt(p.stock)||0), 1);
    const tbody = document.getElementById('stocks-table-body');
    tbody.innerHTML = '';
    STORE.products.forEach(p => {
        const stockInt = parseInt(p.stock);
        const pct = Math.min((stockInt / maxStock) * 100, 100);
        const barColor = stockInt === 0 ? 'bg-red-500' : stockInt <= 3 ? 'bg-amber-500' : 'bg-green-500';
        const tr = document.createElement('tr');
        tr.className = 'table-row';
        tr.innerHTML = `
            <td class="px-6 py-4">
                <p class="text-xs font-semibold text-neutral-200">${p.nom}</p>
                <p class="text-[10px] text-neutral-500">${p.id}</p>
            </td>
            <td class="px-4 py-4 text-[10px] text-neutral-400 uppercase tracking-wider">${p.categorie}</td>
            <td class="px-4 py-4 text-xs font-bold ${stockInt===0 ? 'text-red-400' : stockInt<=3 ? 'text-amber-400' : 'text-white'}">${stockInt}</td>
            <td class="px-4 py-4 w-32">
                <div class="h-1.5 bg-admin-border rounded-full overflow-hidden">
                    <div class="h-full ${barColor} rounded-full transition-all duration-500" style="width:${pct}%"></div>
                </div>
            </td>
            <td class="px-4 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="adjustStock('${p.id}', -1)" class="w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-neutral-300 transition text-xs">-</button>
                    <span class="w-8 text-center text-xs font-bold" id="stock-display-${p.id}">${stockInt}</span>
                    <button onclick="adjustStock('${p.id}', 1)" class="w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-neutral-300 transition text-xs">+</button>
                    <button onclick="setStockManual('${p.id}')" class="px-3 h-7 rounded bg-gold/10 text-gold hover:bg-gold/20 transition text-[10px] uppercase font-bold border border-gold/20">D�finir</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function adjustStock(id, delta) {
    const p = STORE.products.find(p => p.id === id);
    if (!p) return;
    p.stock = Math.max(0, parseInt(p.stock) + delta);
    document.getElementById(`stock-display-${id}`).textContent = p.stock;
    AzavisionAPI.updateStock(id, p.stock).catch(() => {});
    persistDemoProducts();
    renderDashboard();
}

function setStockManual(id) {
    const val = prompt('Nouveau stock pour ce produit :');
    if (val !== null) {
        const newStock = Math.max(0, parseInt(val) || 0);
        const p = STORE.products.find(p => p.id === id);
        if (p) {
            p.stock = newStock;
            renderStocksTable();
            renderDashboard();
            showAdminToast(`Stock mis � jour : ${newStock} unit�s`);
            AzavisionAPI.updateStock(id, newStock).catch(() => {});
            persistDemoProducts();
        }
    }
}

// ============================================================
// PROMOTIONS
// ============================================================
function renderPromoCodes() {
    const list = document.getElementById('promo-codes-list');
    if (!list) return;
    list.innerHTML = '';
    STORE.promoCodes.forEach((pc, i) => {
        const isActive = pc.active;
        list.innerHTML += `
            <div class="px-6 py-4 flex items-center justify-between">
                <div>
                    <p class="text-xs font-bold text-gold font-mono tracking-widest">${pc.code}</p>
                    <p class="text-[10px] text-neutral-500">${pc.type === 'percent' ? '-' + pc.value + '%' : '-' + pc.value + ' EUR'} - ${pc.uses} utilisations${pc.maxUses > 0 ? ' / ' + pc.maxUses : ''}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="togglePromo(${i})" class="w-8 h-8 rounded-lg flex items-center justify-center transition text-xs ${isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-red-500/10 hover:text-red-400' : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-green-500/10 hover:text-green-400'}">
                        <i class="fa-solid fa-${isActive ? 'check' : 'ban'}"></i>
                    </button>
                    <button onclick="deletePromo(${i})" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 text-neutral-500 hover:text-red-400 flex items-center justify-center transition">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    });
}

function openPromoModal() { document.getElementById('promo-modal').classList.remove('hidden'); }
function closePromoModal() { document.getElementById('promo-modal').classList.add('hidden'); }

function savePromoCode() {
    const code = document.getElementById('promo-code').value.trim().toUpperCase();
    const type = document.getElementById('promo-type').value;
    const value = parseFloat(document.getElementById('promo-value').value);
    const maxUses = parseInt(document.getElementById('promo-uses').value) || 0;
    if (!code || isNaN(value)) { showAdminToast('Code et valeur requis.', true); return; }
    STORE.promoCodes.push({ code, type, value, uses:0, maxUses, active:true });
    persistDemoPromos();
    closePromoModal();
    renderPromoCodes();
    showAdminToast(`Code "${code}" cr�� !`);
}

function togglePromo(i) { STORE.promoCodes[i].active = !STORE.promoCodes[i].active; persistDemoPromos(); renderPromoCodes(); }
function deletePromo(i) { STORE.promoCodes.splice(i, 1); persistDemoPromos(); renderPromoCodes(); showAdminToast('Code supprim�.'); }

function toggleBannerActive(btn) {
    const isActive = btn.textContent.trim() === 'Active';
    btn.textContent = isActive ? 'Inactive' : 'Active';
    btn.className = isActive
        ? 'w-full h-10 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider'
        : 'w-full h-10 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-bold uppercase tracking-wider';
}

function saveBannerSettings() { showAdminToast('Param�tres de banni�re enregistr�s !'); }

// ============================================================
// ANALYTICS
// ============================================================
function renderAnalytics() {
    // Category chart
    const catDiv = document.getElementById('category-chart');
    catDiv.innerHTML = '';
    const cats = {};
    STORE.products.forEach(p => { cats[p.categorie] = (cats[p.categorie] || 0) + parseFloat(p.prix) * 0.5; });
    const maxCat = Math.max(...Object.values(cats), 1);
    Object.entries(cats).forEach(([cat, val]) => {
        const pct = Math.round((val / maxCat) * 100);
        catDiv.innerHTML += `
            <div>
                <div class="flex justify-between text-[10px] mb-1">
                    <span class="capitalize text-neutral-400 uppercase tracking-wider">${cat}</span>
                    <span class="text-neutral-300 font-semibold">${val.toFixed(0)} €</span>
                </div>
                <div class="h-2 bg-admin-border rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-gold-dark to-gold rounded-full" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    });

    // Revenue bar chart
    const revDiv = document.getElementById('revenue-chart');
    revDiv.innerHTML = '';
    const days = ['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'];
    const vals = [420, 289, 660, 110, 820, 349, 599];
    const maxV = Math.max(...vals);
    days.forEach((d, i) => {
        const pct = Math.round((vals[i] / maxV) * 100);
        revDiv.innerHTML += `
            <div class="flex-1 flex flex-col items-center gap-1">
                <span class="text-[9px] text-neutral-500">${vals[i]} €</span>
                <div class="w-full rounded-t bg-gold/20 border border-gold/30 relative" style="height:${pct}%">
                    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gold-dark to-gold rounded-t" style="height:100%"></div>
                </div>
                <span class="text-[9px] text-neutral-500 uppercase">${d}</span>
            </div>
        `;
    });
}

// ============================================================
// CONFIG SAVE
// ============================================================
function saveConfig() {
    const newPass = document.getElementById('cfg-new-pass').value;
    const confirm = document.getElementById('cfg-confirm-pass').value;
    const oldPass = document.getElementById('cfg-old-pass').value;
    if (newPass) {
        if (oldPass !== ADMIN_CONFIG.password) { showAdminToast('Mot de passe actuel incorrect.', true); return; }
        if (newPass !== confirm) { showAdminToast('Les mots de passe ne correspondent pas.', true); return; }
        if (newPass.length < 6) { showAdminToast('Mot de passe trop court (min. 6 caract�res).', true); return; }
        ADMIN_CONFIG.password = newPass;
        document.getElementById('cfg-old-pass').value = '';
        document.getElementById('cfg-new-pass').value = '';
        document.getElementById('cfg-confirm-pass').value = '';
    }
    const cfg = DemoStore.getConfig();
    cfg["Nom de l'enseigne"] = document.getElementById('cfg-name').value.trim() || 'Azavision';
    cfg["E-mail de contact client"] = document.getElementById('cfg-email').value.trim();
    cfg["TVA applicable (%)"] = (document.getElementById('cfg-tva').value || '23') + '%';
    cfg["Seuil livraison gratuite (€)"] = (document.getElementById('cfg-shipping').value || '150') + ' €';
    cfg["NIF Entreprise (Portugal)"] = document.getElementById('cfg-nif').value.trim();
    DemoStore.saveConfig(cfg);
    showAdminToast('Configuration enregistr�e avec succ�s !');
}

// ============================================================
// TOAST
// ============================================================
let toastTimer;
function showAdminToast(msg, isError = false) {
    clearTimeout(toastTimer);
    const toast = document.getElementById('admin-toast');
    document.getElementById('admin-toast-msg').textContent = msg;
    toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold transition-all duration-300 ${isError ? 'bg-red-950 border border-red-500/30 text-red-200' : 'bg-neutral-900 border border-gold/30 text-white'}`;
    toast.querySelector('i').className = `fa-solid ${isError ? 'fa-triangle-exclamation text-red-400' : 'fa-check text-gold'}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    toast.style.pointerEvents = 'auto';
    toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(16px)';
        toast.style.pointerEvents = 'none';
    }, 3500);
}

window.showTab = showTab;
window.syncData = syncData;
window.doLogin = doLogin;
window.togglePassVis = togglePassVis;
window.doLogout = doLogout;
window.toggleSidebarMobile = toggleSidebarMobile;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.saveProduct = saveProduct;
window.editProduct = editProduct;
window.duplicateProduct = duplicateProduct;
window.deleteProduct = deleteProduct;
window.filterProducts = filterProducts;
window.renderOrdersTable = renderOrdersTable;
window.filterOrders = filterOrders;
window.updateOrderStatus = updateOrderStatus;
window.exportOrders = exportOrders;
window.renderClientsTable = renderClientsTable;
window.adjustStock = adjustStock;
window.setStockManual = setStockManual;
window.openPromoModal = openPromoModal;
window.closePromoModal = closePromoModal;
window.savePromoCode = savePromoCode;
window.togglePromo = togglePromo;
window.deletePromo = deletePromo;
window.toggleBannerActive = toggleBannerActive;
window.saveBannerSettings = saveBannerSettings;
window.saveConfig = saveConfig;
window.showAdminToast = showAdminToast;
