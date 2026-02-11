// ============================================================
//      CONFIG & STATE
// ============================================================
// 👇 REPLACE THIS WITH YOUR ACTUAL RENDER URL 👇
const API_URL = "https://your-render-url.onrender.com/api"; 

// State Management
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = []; // Local cache of fetched products
let guests = [];   // Local cache for Guest List
let users = [];    // Admin use only
let vendors = [];  // Admin use only

// ============================================================
//      NAVIGATION & INIT
// ============================================================

// Check session on load
window.onload = function() {
    if (currentUser) {
        updateCartBadge();
        // Redirect to correct dashboard based on role if on landing
        if (document.getElementById('screen-landing').classList.contains('active')) {
            if (currentUser.role === 'user') navigate('screen-user-portal');
            else if (currentUser.role === 'vendor') navigate('screen-vendor-dash');
            else if (currentUser.role === 'admin') navigate('screen-admin-dash');
        }
    }
};

function navigate(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // Show target screen
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');

    // Auto-fetch data based on screen
    if (screenId === 'screen-user-portal')    renderUserPortal();
    if (screenId === 'screen-products')       fetchAndRenderProducts();
    if (screenId === 'screen-cart')           renderCart();
    
    // Vendor Screens
    if (screenId === 'screen-vendor-dash')    renderVendorDash();
    if (screenId === 'screen-vendor-products') fetchVendorProducts();
    if (screenId === 'screen-vendor-orders')  fetchVendorOrders();
    if (screenId === 'screen-add-product')    resetProductForm();
    
    // Admin Screens
    if (screenId === 'screen-admin-dash')     renderAdminDash();
    if (screenId === 'screen-maintain-users')    fetchUsers();
    if (screenId === 'screen-maintain-vendors') fetchVendors();
    if (screenId === 'screen-admin-orders')   fetchAllOrders();
    
    // User Features
    if (screenId === 'screen-order-status')   fetchUserOrders();
    if (screenId === 'screen-request-item')   fetchRequests();
    if (screenId === 'screen-guest-list')     fetchGuests(); // NEW
}

// ============================================================
//      AUTH FUNCTIONS
// ============================================================

function showErr(id, msg) {
    const el = document.getElementById(id);
    if(el) {
        el.textContent = msg; el.style.display = 'block';
        setTimeout(() => el.style.display='none', 4000);
    } else {
        alert(msg);
    }
}

function validate(fields) {
    for(const [v,msg] of fields) if(!v||!v.toString().trim()) return msg;
    return null;
}

// Generic API Caller Helper
async function apiCall(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);
        
        const res = await fetch(`${API_URL}${endpoint}`, options);
        return await res.json();
    } catch (err) {
        console.error("API Error:", err);
        return { success: false, message: "Server connection failed" };
    }
}

async function handleLogin(role, emailId, passId, errId, destScreen) {
    const email = document.getElementById(emailId).value.trim();
    const pass = document.getElementById(passId).value;

    const data = await apiCall('/login', 'POST', { email, pass, role });

    if (data.success) {
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        navigate(destScreen);
    } else {
        showErr(errId, data.message || 'Invalid credentials');
    }
}

async function handleSignup(role, body, errId, destScreen) {
    const data = await apiCall('/signup', 'POST', { ...body, role });
    
    if (data.success) {
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        navigate(destScreen);
    } else {
        showErr(errId, data.message || 'Registration failed');
    }
}

function userLogin() { handleLogin('user', 'ul-email', 'ul-pass', 'user-login-err', 'screen-user-portal'); }
function vendorLogin() { handleLogin('vendor', 'vl-email', 'vl-pass', 'vendor-login-err', 'screen-vendor-dash'); }
function adminLogin() { handleLogin('admin', 'al-email', 'al-pass', 'admin-login-err', 'screen-admin-dash'); }

function userSignup() {
    const name = document.getElementById('ur-name').value.trim();
    const email = document.getElementById('ur-email').value.trim();
    const pass = document.getElementById('ur-pass').value;
    const address = document.getElementById('ur-addr').value.trim();
    const city = document.getElementById('ur-city').value.trim();

    const err = validate([[name,'Name required'],[email,'Email required'],[pass,'Password required']]);
    if (err) return showErr('user-reg-err', err);

    handleSignup('user', { name, email, pass, address, city, status:'active' }, 'user-reg-err', 'screen-user-portal');
}

function vendorSignup() {
    const name = document.getElementById('vr-name').value.trim();
    const email = document.getElementById('vr-email').value.trim();
    const pass = document.getElementById('vr-pass').value;
    const contact = document.getElementById('vr-phone').value.trim();
    const address = document.getElementById('vr-addr').value.trim();

    const err = validate([[name,'Name required'],[email,'Email required'],[pass,'Password required']]);
    if (err) return showErr('vendor-reg-err', err);

    handleSignup('vendor', { name, email, pass, contact, address, status:'active' }, 'vendor-reg-err', 'screen-vendor-dash');
}

function logout() {
    currentUser = null;
    cart = [];
    localStorage.clear();
    navigate('screen-landing');
}

// ============================================================
//      USER PORTAL LOGIC
// ============================================================

async function renderUserPortal() {
    if (!currentUser) return;
    document.getElementById('user-welcome').textContent = `Welcome, ${currentUser.name} 🎉`;
    
    // Fetch fresh stats
    const prods = await apiCall('/products');
    const myOrds = await apiCall(`/orders/${currentUser._id}`);
    
    document.getElementById('user-stats').innerHTML = `
        <div class="stat-card"><div class="stat-val" style="color:var(--accent)">${Array.isArray(prods)?prods.length:0}</div><div class="stat-lbl">Products</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--accent3)">${Array.isArray(myOrds)?myOrds.length:0}</div><div class="stat-lbl">My Orders</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--warning)">${cartCount()}</div><div class="stat-lbl">Cart Items</div></div>
    `;
    
    // Preview
    if(Array.isArray(prods)){
        const activeProds = prods.filter(p => p.status === 'active').slice(0, 4);
        document.getElementById('user-product-preview').innerHTML = activeProds.map(p => productCardHTML(p)).join('');
    }
}

// --- Product Browsing ---
let currentVendorFilter = null;

async function fetchAndRenderProducts() {
    // 1. Fetch
    const data = await apiCall('/products');
    products = Array.isArray(data) ? data : [];
    
    // 2. Build Vendor Tabs
    const allVendors = await apiCall('/vendors'); 
    
    const tabsEl = document.getElementById('vendor-tabs');
    tabsEl.innerHTML = `<button class="tab-btn active" onclick="filterVendor(null,this)">All Vendors</button>`;
    
    if (Array.isArray(allVendors)) {
        allVendors.forEach(v => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.textContent = v.name;
            btn.onclick = function(){ filterVendor(v._id, this); };
            tabsEl.appendChild(btn);
        });
    }

    renderProductsGrid();
    updateCartBadge();
}

function filterVendor(vendorId, btn) {
    currentVendorFilter = vendorId;
    document.querySelectorAll('#vendor-tabs .tab-btn').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    renderProductsGrid();
}

function renderProductsGrid() {
    const search = (document.getElementById('product-search')||{value:''}).value.toLowerCase();
    
    let prods = products.filter(p => p.status === 'active');
    
    if (currentVendorFilter) prods = prods.filter(p => p.vendorId === currentVendorFilter);
    if (search) prods = prods.filter(p => p.name.toLowerCase().includes(search));
    
    const grid = document.getElementById('products-grid');
    if (!prods.length) { 
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>No products found.</p></div>'; 
        return; 
    }
    grid.innerHTML = prods.map(p => productCardHTML(p)).join('');
}

function productCardHTML(p) {
    return `<div class="product-card" onclick="addToCart('${p._id}')">
        <div class="product-thumb">${p.image||'📦'}</div>
        <div class="product-info">
            <div class="pname">${p.name}</div>
            <div class="pprice">₹${p.price.toLocaleString()}</div>
            <div class="pvendor">${p.category}</div>
            <button class="btn btn-primary btn-sm" style="margin-top:10px;width:100%" onclick="event.stopPropagation();addToCart('${p._id}')">Add to Cart</button>
        </div>
    </div>`;
}

// ============================================================
//      CART LOGIC
// ============================================================

function addToCart(productId) {
    const p = products.find(p => p._id === productId);
    if (!p) return;
    
    const existing = cart.find(i => i.productId === productId);
    if (existing) existing.qty++;
    else cart.push({ productId: p._id, name: p.name, price: p.price, image: p.image, qty: 1 });
    
    saveCart();
    updateCartBadge();
    
    // Toast
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:24px;right:24px;background:var(--accent);color:#fff;padding:12px 20px;border-radius:10px;font-size:.9rem;z-index:999;animation:fadeIn .3s`;
    toast.textContent = `✓ ${p.name} added to cart`;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(), 2500);
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

function updateCartBadge() {
    const c = cart.reduce((s,i) => s+i.qty, 0);
    ['cart-badge','cart-badge2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = c > 0 ? c : '';
    });
}

function showCart() { navigate('screen-cart'); }

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const footer = document.getElementById('cart-footer');
    updateCartBadge();
    
    if (!cart.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🛒</div><p>Your cart is empty.</p></div>';
        footer.style.display = 'none'; 
        return;
    }
    
    container.innerHTML = `<div class="card">${cart.map(item => {
        return `<div class="cart-item">
            <div class="cart-item-thumb">${item.image||'📦'}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-vendor">₹${item.price}</div>
            </div>
            <div class="qty-ctrl">
                <button class="qty-btn" onclick="changeQty('${item.productId}',-1)">−</button>
                <span style="min-width:24px;text-align:center">${item.qty}</span>
                <button class="qty-btn" onclick="changeQty('${item.productId}',1)">+</button>
            </div>
            <div class="cart-item-price">₹${(item.price*item.qty).toLocaleString()}</div>
            <button class="btn btn-danger btn-sm" onclick="removeFromCart('${item.productId}')">✕</button>
        </div>`;
    }).join('')}</div>`;
    
    const total = cart.reduce((s,i) => s + (i.price*i.qty), 0);
    document.getElementById('cart-grand-total').textContent = `₹${total.toLocaleString()}`;
    footer.style.display = 'block';
}

function changeQty(productId, delta) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.productId !== productId);
    saveCart();
    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId !== productId);
    saveCart();
    renderCart();
}

function cartCount() { return cart.reduce((s,i) => s+i.qty, 0); }

// ============================================================
//      CHECKOUT & ORDERS
// ============================================================

function renderCheckout() {
    if (currentUser) {
        document.getElementById('co-name').value = currentUser.name||'';
        document.getElementById('co-email').value = currentUser.email||'';
        document.getElementById('co-address').value = currentUser.address||'';
        document.getElementById('co-city').value = currentUser.city||'';
    }
    
    const total = cart.reduce((s,i) => s + (i.price*i.qty), 0);
    const summary = document.getElementById('checkout-summary');
    
    summary.innerHTML = cart.map(item => {
        return `<div class="order-summary-item"><span>${item.name} × ${item.qty}</span><span>₹${(item.price*item.qty).toLocaleString()}</span></div>`;
    }).join('') + `<div class="order-summary-total"><span>Total</span><span>₹${total.toLocaleString()}</span></div>`;
}

async function placeOrder() {
    const name = document.getElementById('co-name').value.trim();
    const email = document.getElementById('co-email').value.trim();
    const address = document.getElementById('co-address').value.trim();
    const phone = document.getElementById('co-phone').value.trim();
    const payment = document.getElementById('co-payment').value;

    const err = validate([[name,'Name required'],[email,'Email required'],[address,'Address required'],[phone,'Phone required']]);
    if (err) return showErr('checkout-err', err);

    const total = cart.reduce((s,i) => s + (i.price*i.qty), 0);

    const orderData = {
        userId: currentUser ? currentUser._id : 'guest',
        userName: name,
        email,
        items: cart,
        total,
        address,
        payment,
        status: 'Received'
    };

    const res = await apiCall('/orders', 'POST', orderData);

    if (res.success) {
        document.getElementById('popup-total').textContent = `₹${total.toLocaleString()}`;
        cart = [];
        saveCart();
        document.getElementById('success-popup').style.display = 'flex';
    } else {
        showErr('checkout-err', 'Failed to place order.');
    }
}

function closeSuccess() {
    document.getElementById('success-popup').style.display = 'none';
    navigate('screen-order-status');
}

async function fetchUserOrders() {
    if(!currentUser) return;
    const myOrders = await apiCall(`/orders/${currentUser._id}`);
    
    const el = document.getElementById('order-status-list');
    if (!myOrders || !myOrders.length) { 
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>No orders yet.</p></div>'; 
        return; 
    }
    
    const steps = ['Received','Ready for Shipping','Shipped','Delivered'];
    
    el.innerHTML = myOrders.slice().reverse().map(o => {
        const idx = steps.indexOf(o.status);
        const timeline = steps.map((st,i) => `<div class="status-step ${i<idx?'done':''} ${i===idx?'active':''}"><strong>${st}</strong></div>`).join('');
        
        return `<div class="card" style="margin-bottom:18px">
            <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:12px">
                <div><div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700">Order #${o._id.slice(-6)}</div>
                <div style="color:var(--text-dim);font-size:.85rem">${new Date(o.createdAt).toLocaleDateString()}</div></div>
                <div style="display:flex;gap:10px;align-items:center">
                    <span class="badge ${o.status==='Delivered'?'badge-success':o.status==='Received'?'badge-warning':'badge-accent'}">${o.status}</span>
                    <strong style="font-size:1.1rem">₹${o.total.toLocaleString()}</strong>
                </div>
            </div>
            <div class="divider"></div>
            <div class="status-timeline">${timeline}</div>
        </div>`;
    }).join('');
}

// ============================================================
//      NEW: GUEST LIST (User Branch)
// ============================================================
async function fetchGuests() {
    if (!currentUser) return;
    const data = await apiCall(`/guests/${currentUser._id}`);
    guests = Array.isArray(data) ? data : [];
    renderGuestList();
}

function renderGuestList() {
    const el = document.getElementById('guest-list-container');
    if (!el) return;
    
    if (!guests.length) { el.innerHTML = '<p style="text-align:center;color:#888;margin-top:20px">No guests added yet.</p>'; return; }
    
    el.innerHTML = guests.map(g => `
        <div class="card-sm" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div>
                <div style="font-weight:bold">${g.name}</div>
                <div style="font-size:0.85rem;color:#888">${g.contact || 'No contact'}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
                <span class="badge badge-accent">${g.rsvpStatus||'Pending'}</span>
                <button class="btn btn-danger btn-sm" onclick="deleteGuest('${g._id}')">Remove</button>
            </div>
        </div>
    `).join('');
}

async function addGuest() {
    const name = document.getElementById('guest-name').value.trim();
    const contact = document.getElementById('guest-contact').value.trim();
    
    if(!name) return alert("Guest Name is required");
    
    await apiCall('/guests', 'POST', { userId: currentUser._id, name, contact });
    
    document.getElementById('guest-name').value = '';
    document.getElementById('guest-contact').value = '';
    fetchGuests();
}

async function deleteGuest(id) {
    if(confirm("Remove this guest from the list?")) {
        await apiCall(`/guests/${id}`, 'DELETE');
        fetchGuests();
    }
}

// ============================================================
//      REQUEST ITEM
// ============================================================
async function submitRequest() {
    const name = document.getElementById('req-name').value.trim();
    const desc = document.getElementById('req-desc').value.trim();
    const date = document.getElementById('req-date').value;
    const targetVendor = document.getElementById('req-vendor').value; 

    if (!name) return alert("Item name is required");

    const requestData = {
        userId: currentUser._id,
        userName: currentUser.name,
        itemName: name,
        desc: desc,
        neededBy: date,
        targetVendorId: targetVendor,
        status: 'Pending'
    };

    const res = await apiCall('/requests', 'POST', requestData);

    if (res.success) {
        document.getElementById('req-name').value = '';
        document.getElementById('req-desc').value = '';
        document.getElementById('req-ok').style.display = 'block';
        setTimeout(() => document.getElementById('req-ok').style.display = 'none', 3000);
        fetchRequests(); 
    } else {
        alert("Failed to submit request");
    }
}

async function fetchRequests() {
    if (!currentUser) return;
    const myReqs = await apiCall(`/requests/${currentUser._id}`);
    const el = document.getElementById('my-requests-list');
    
    if (!myReqs || !myReqs.length) { 
        el.innerHTML = '<div class="empty-state"><p>No requests yet.</p></div>'; 
        return; 
    }
    
    el.innerHTML = myReqs.map(r => `
        <div class="card-sm" style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between">
                <strong>${r.itemName}</strong>
                <span class="badge badge-warning">${r.status}</span>
            </div>
            <div style="color:var(--text-dim);font-size:.85rem;margin-top:5px">${r.desc||''}</div>
            <div style="color:var(--text-faint);font-size:.78rem;margin-top:4px">Needed by: ${r.neededBy||'N/A'}</div>
        </div>
    `).join('');
}

// ============================================================
//      VENDOR DASHBOARD
// ============================================================

async function renderVendorDash() {
    if (!currentUser) return;
    document.getElementById('vendor-welcome').textContent = `Welcome, ${currentUser.name}!`;
    
    const allProds = await apiCall('/products');
    const myProds = Array.isArray(allProds) ? allProds.filter(p => p.vendorId === currentUser._id) : [];
    
    const allOrders = await apiCall('/orders');
    const myOrders = Array.isArray(allOrders) ? allOrders.filter(o => o.items.some(i => i.productId && myProds.find(p => p._id === i.productId))) : [];
    
    const revenue = myOrders.reduce((acc, o) => {
        const myItemsRevenue = o.items.reduce((sum, item) => {
            return myProds.find(p => p._id === item.productId) ? sum + (item.price * item.qty) : sum;
        }, 0);
        return acc + myItemsRevenue;
    }, 0);

    document.getElementById('vendor-stats').innerHTML = `
        <div class="stat-card"><div class="stat-val" style="color:var(--accent)">${myProds.length}</div><div class="stat-lbl">Products</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--accent2)">${myOrders.length}</div><div class="stat-lbl">Orders</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--accent3)">₹${revenue.toLocaleString()}</div><div class="stat-lbl">Revenue</div></div>
    `;
}

async function fetchVendorProducts() {
    const allProds = await apiCall('/products');
    const myProds = Array.isArray(allProds) ? allProds.filter(p => p.vendorId === currentUser._id) : [];
    
    const el = document.getElementById('vendor-product-list');
    if (!myProds.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>No products yet.</p></div>'; return; }
    
    el.innerHTML = myProds.map(p => `<div class="vendor-item-row">
        <div class="item-icon">${p.image||'📦'}</div>
        <div class="item-details"><div class="item-name">${p.name}</div><div style="color:var(--text-dim);font-size:.82rem">${p.category}</div></div>
        <div class="item-price">₹${p.price.toLocaleString()}</div>
        <span class="badge ${p.status==='active'?'badge-success':'badge-danger'}">${p.status}</span>
        <div class="item-actions">
            <button class="btn btn-secondary btn-sm" onclick="editProduct('${p._id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p._id}')">Delete</button>
        </div>
    </div>`).join('');
}

function resetProductForm() {
    document.getElementById('edit-product-id').value = '';
    document.getElementById('add-prod-title').textContent = 'Add New Product';
    ['ap-name','ap-price','ap-image'].forEach(id => document.getElementById(id).value='');
    document.getElementById('ap-category').value = 'Lighting';
}

async function editProduct(id) {
    const all = await apiCall('/products');
    const p = all.find(x => x._id === id);
    if (!p) return;
    
    navigate('screen-add-product');
    document.getElementById('edit-product-id').value = p._id;
    document.getElementById('add-prod-title').textContent = 'Edit Product';
    document.getElementById('ap-name').value = p.name;
    document.getElementById('ap-price').value = p.price;
    document.getElementById('ap-category').value = p.category;
    document.getElementById('ap-image').value = p.image;
}

async function saveProduct() {
    const name = document.getElementById('ap-name').value.trim();
    const price = parseFloat(document.getElementById('ap-price').value);
    const category = document.getElementById('ap-category').value;
    const image = document.getElementById('ap-image').value.trim() || '📦';
    const id = document.getElementById('edit-product-id').value;
    
    if (!name || !price) return showErr('add-prod-err','Invalid input');

    const productData = { vendorId: currentUser._id, name, price, category, image, status:'active' };

    let res;
    if (id) {
        res = await apiCall(`/products/${id}`, 'PUT', productData);
    } else {
        res = await apiCall('/products', 'POST', productData);
    }

    if (res.success) navigate('screen-vendor-products');
    else showErr('add-prod-err', 'Failed to save product');
}

async function deleteProduct(id) {
    if(!confirm("Delete this product?")) return;
    await apiCall(`/products/${id}`, 'DELETE');
    fetchVendorProducts();
}

async function fetchVendorOrders() {
    const allOrders = await apiCall('/orders');
    const allProds = await apiCall('/products');
    const myProds = Array.isArray(allProds) ? allProds.filter(p => p.vendorId === currentUser._id) : [];
    const myProdIds = myProds.map(p => p._id);
    
    const myOrders = Array.isArray(allOrders) ? allOrders.filter(o => o.items.some(i => myProdIds.includes(i.productId))) : [];

    const el = document.getElementById('vendor-orders-table');
    const statuses = ['Received','Ready for Shipping','Shipped','Delivered'];
    
    if (!myOrders.length) { el.innerHTML='<div class="empty-state"><div class="empty-icon">🧾</div><p>No orders yet.</p></div>'; return; }
    
    el.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>` +
    myOrders.map(o => {
        const myItems = o.items.filter(i => myProdIds.includes(i.productId));
        return `<tr>
            <td style="font-family:monospace;font-size:.8rem">${o._id.slice(-6)}</td>
            <td>${o.userName}</td>
            <td>${myItems.map(i => i.name + ' ×' + i.qty).join(', ')}</td>
            <td>₹${o.total.toLocaleString()}</td>
            <td><span class="badge badge-accent">${o.status}</span></td>
            <td><select class="form-control" style="width:auto;padding:6px 10px;font-size:.82rem" onchange="updateOrderStatus('${o._id}',this.value)">
                ${statuses.map(st=>`<option ${o.status===st?'selected':''} value="${st}">${st}</option>`).join('')}
            </select></td>
        </tr>`;
    }).join('') + `</tbody></table></div>`;
}

async function updateOrderStatus(id, status) {
    await apiCall(`/orders/${id}`, 'PUT', { status });
}

// ============================================================
//      ADMIN DASHBOARD (Updated with Membership Logic)
// ============================================================

async function renderAdminDash() {
    const u = await apiCall('/users');
    const v = await apiCall('/vendors');
    const p = await apiCall('/products');
    const o = await apiCall('/orders');
    
    const usersCount = Array.isArray(u) ? u.length : 0;
    const vendorsCount = Array.isArray(v) ? v.length : 0;
    const productsCount = Array.isArray(p) ? p.length : 0;
    const ordersCount = Array.isArray(o) ? o.length : 0;
    const revenue = Array.isArray(o) ? o.reduce((s,x) => s + (x.total||0), 0) : 0;

    document.getElementById('admin-stats').innerHTML = `
        <div class="stat-card"><div class="stat-val" style="color:var(--accent)">${usersCount}</div><div class="stat-lbl">Users</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--accent2)">${vendorsCount}</div><div class="stat-lbl">Vendors</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--accent3)">${productsCount}</div><div class="stat-lbl">Products</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--warning)">${ordersCount}</div><div class="stat-lbl">Orders</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--success)">₹${revenue.toLocaleString()}</div><div class="stat-lbl">Revenue</div></div>
    `;
}

async function fetchUsers() {
    users = await apiCall('/users');
    const el = document.getElementById('users-table');
    el.innerHTML = `<table><thead><tr><th>Name</th><th>Email</th><th>Action</th></tr></thead><tbody>` +
    (Array.isArray(users) ? users.map(u => `<tr>
        <td>${u.name}</td><td>${u.email}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteUser('${u._id}')">Remove</button></td>
    </tr>`).join('') : '') + `</tbody></table>`;
}

async function fetchVendors() {
    vendors = await apiCall('/vendors');
    const el = document.getElementById('vendors-table');
    el.innerHTML = `<table><thead><tr><th>Name</th><th>Membership</th><th>Action</th></tr></thead><tbody>` +
    (Array.isArray(vendors) ? vendors.map(v => `<tr>
        <td>${v.name}</td>
        <td><span class="badge ${v.membershipId ? 'badge-success':'badge-warning'}">${v.membershipId ? 'Premium' : 'Standard'}</span></td>
        <td>
            <button class="btn btn-primary btn-sm" onclick="assignMembership('${v._id}')">Upgrade</button>
            <button class="btn btn-danger btn-sm" onclick="deleteUser('${v._id}')">Remove</button>
        </td>
    </tr>`).join('') : '') + `</tbody></table>`;
}

async function deleteUser(id) {
    if(confirm("Permanently delete this user/vendor?")) {
        await apiCall(`/users/${id}`, 'DELETE');
        fetchUsers();
        fetchVendors();
    }
}

async function assignMembership(vendorId) {
    if(confirm("Upgrade this vendor to Premium Membership (30 days)?")) {
        await apiCall(`/users/${vendorId}/membership`, 'PUT', { membershipId: 'premium_tier' });
        fetchVendors();
    }
}

async function fetchAllOrders() {
    const ords = await apiCall('/orders');
    const el = document.getElementById('admin-orders-table');
    el.innerHTML = `<table><thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Date</th><th>Status</th></tr></thead><tbody>` +
    (Array.isArray(ords) ? ords.map(o => `<tr>
        <td style="font-family:monospace;font-size:.8rem">${o._id.slice(-6)}</td>
        <td>${o.userName}</td>
        <td>₹${o.total.toLocaleString()}</td>
        <td style="font-size:.82rem">${new Date(o.createdAt).toLocaleDateString()}</td>
        <td><span class="badge badge-accent">${o.status}</span></td>
    </tr>`).join('') : '') + `</tbody></table>`;
}