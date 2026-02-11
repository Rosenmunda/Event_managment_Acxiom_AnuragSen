require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ Connection error:", err));

// ================================================================
// 2. DATA MODELS (Schemas matching Flowchart)
// ================================================================

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    pass: String,
    role: String, // 'user', 'vendor', 'admin'
    address: String,
    city: String,
    contact: String,
    status: { type: String, default: 'active' },
    membershipId: String, // NEW: Link to membership
    membershipExpiry: Date // NEW: For Vendor validity
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    vendorId: String,
    name: String,
    price: Number,
    category: String,
    image: String,
    status: { type: String, default: 'active' }
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    email: String,
    items: Array,
    total: Number,
    address: String,
    payment: String,
    status: { type: String, default: 'Received' },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

const requestSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    itemName: String,
    desc: String,
    targetVendorId: String,
    neededBy: String,
    status: { type: String, default: 'Pending' }
});
const Request = mongoose.model('Request', requestSchema);

// --- NEW SCHEMAS FROM FLOWCHART ---

// 1. Guest List (User Branch)
const guestSchema = new mongoose.Schema({
    userId: String, // The user who owns this guest list
    name: String,
    contact: String,
    email: String,
    rsvpStatus: { type: String, default: 'Pending' } // Pending, Confirmed, Declined
});
const Guest = mongoose.model('Guest', guestSchema);

// 2. Membership (Admin Branch -> Maintenance)
const membershipSchema = new mongoose.Schema({
    name: String, // e.g., "Gold Vendor", "Basic User"
    price: Number,
    durationDays: Number,
    features: String
});
const Membership = mongoose.model('Membership', membershipSchema);


// ================================================================
// 3. API ROUTES
// ================================================================

// --- AUTH ---
app.post('/api/login', async (req, res) => {
    const { email, pass, role } = req.body;
    try {
        const user = await User.findOne({ email, pass, role });
        if (user) {
            if(user.status === 'inactive') return res.json({ success: false, message: "Account disabled" });
            res.json({ success: true, user });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch(e) { res.json({ success: false, message: "Server error" }); }
});

app.post('/api/signup', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (e) { res.json({ success: false, message: "Email already exists" }); }
});

// --- PRODUCTS (Vendor Branch) ---
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});
app.post('/api/products', async (req, res) => {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json({ success: true });
});
app.put('/api/products/:id', async (req, res) => {
    await Product.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
});
app.delete('/api/products/:id', async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- ORDERS (Transaction Branch) ---
app.get('/api/orders', async (req, res) => {
    const orders = await Order.find();
    res.json(orders);
});
app.get('/api/orders/:userId', async (req, res) => {
    const orders = await Order.find({ userId: req.params.userId });
    res.json(orders);
});
app.post('/api/orders', async (req, res) => {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.json({ success: true, orderId: newOrder._id });
});
app.put('/api/orders/:id', async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ success: true });
});

// --- REQUESTS ---
app.post('/api/requests', async (req, res) => {
    const newReq = new Request(req.body);
    await newReq.save();
    res.json({ success: true });
});
app.get('/api/requests/:userId', async (req, res) => {
    const reqs = await Request.find({ userId: req.params.userId });
    res.json(reqs);
});
app.get('/api/vendor-requests/:vendorId', async (req, res) => {
    const reqs = await Request.find({ 
        $or: [ { targetVendorId: req.params.vendorId }, { targetVendorId: "" }, { targetVendorId: null } ]
    });
    res.json(reqs);
});

// --- NEW: GUEST LIST ROUTES (Flowchart: User -> Guest List) ---
app.get('/api/guests/:userId', async (req, res) => {
    const guests = await Guest.find({ userId: req.params.userId });
    res.json(guests);
});
app.post('/api/guests', async (req, res) => {
    const newGuest = new Guest(req.body);
    await newGuest.save();
    res.json({ success: true });
});
app.put('/api/guests/:id', async (req, res) => { // Update
    await Guest.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
});
app.delete('/api/guests/:id', async (req, res) => { // Delete
    await Guest.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- NEW: ADMIN MAINTENANCE & MEMBERSHIP (Flowchart: Admin -> Maintenance) ---
app.get('/api/users', async (req, res) => {
    const users = await User.find({ role: 'user' });
    res.json(users);
});
app.get('/api/vendors', async (req, res) => {
    const vendors = await User.find({ role: 'vendor' });
    res.json(vendors);
});
// Admin: Toggle Status (Active/Inactive)
app.put('/api/users/:id/status', async (req, res) => {
    try {
        const { status } = req.body; 
        await User.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});
// Admin: Delete User/Vendor (Maintenance)
app.delete('/api/users/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// Admin: Membership Routes
app.get('/api/memberships', async (req, res) => {
    const mems = await Membership.find();
    res.json(mems);
});
app.post('/api/memberships', async (req, res) => { // Add Membership
    const newMem = new Membership(req.body);
    await newMem.save();
    res.json({ success: true });
});
app.put('/api/users/:id/membership', async (req, res) => { // Update Membership for Vendor
    const { membershipId } = req.body;
    // Calculate expiry (simple logic: current date + 30 days)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30); 
    
    await User.findByIdAndUpdate(req.params.id, { membershipId, membershipExpiry: expiry });
    res.json({ success: true });
});

// --- SEEDER ---
app.get('/api/seed', async (req, res) => {
    // ... (Keep your existing Safe Seeder code here, works fine) ...
    // For brevity, I am excluding the full seed code block, 
    // but keep the one I provided in the previous turn.
    res.send("Seed route hit. Ensure you kept the safe seed logic.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));