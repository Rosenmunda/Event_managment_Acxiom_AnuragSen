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

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    pass: String,
    role: String, // 'user', 'vendor', 'admin'
    address: String,
    city: String,
    contact: String,
    status: { type: String, default: 'active' }
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

// NEW: Request Schema (Fixes "Request not functional")
const requestSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    itemName: String,
    desc: String,
    targetVendorId: String, // Optional (specific vendor)
    neededBy: String,
    status: { type: String, default: 'Pending' }
});
const Request = mongoose.model('Request', requestSchema);

// --- ROUTES ---

// 1. AUTH
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

// 2. PRODUCTS
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

// 3. ORDERS
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

// 4. REQUESTS (New Routes)
app.post('/api/requests', async (req, res) => {
    const newReq = new Request(req.body);
    await newReq.save();
    res.json({ success: true });
});
app.get('/api/requests/:userId', async (req, res) => { // Get User's requests
    const reqs = await Request.find({ userId: req.params.userId });
    res.json(reqs);
});
app.get('/api/vendor-requests/:vendorId', async (req, res) => { // Get Vendor's requests
    // Find requests specifically for this vendor OR global requests (no target vendor)
    const reqs = await Request.find({ 
        $or: [ { targetVendorId: req.params.vendorId }, { targetVendorId: "" }, { targetVendorId: null } ]
    });
    res.json(reqs);
});

// 5. ADMIN UTILS
app.get('/api/users', async (req, res) => {
    const users = await User.find({ role: 'user' });
    res.json(users);
});
app.get('/api/vendors', async (req, res) => {
    const vendors = await User.find({ role: 'vendor' });
    res.json(vendors);
});

// ================================================================
// 4. DATABASE SEEDER (SAFE VERSION - NO DELETION)
// ================================================================
app.get('/api/seed', async (req, res) => {
    try {
        let messages = [];

        // 1. Check & Create Admin
        const adminExists = await User.findOne({ email: 'admin@ems.com' });
        if (!adminExists) {
            const admin = new User({ 
                name: 'Super Admin', email: 'admin@ems.com', pass: 'admin123', role: 'admin', status: 'active' 
            });
            await admin.save();
            messages.push("✅ Created Admin (admin@ems.com)");
        } else {
            messages.push("ℹ️ Admin already exists.");
        }

        // 2. Check & Create Default Vendor
        const vendorExists = await User.findOne({ email: 'tech@baz.com' });
        let vendorId = vendorExists ? vendorExists._id : null;
        
        if (!vendorExists) {
            const vendor = new User({ 
                name: 'TechBazaar', email: 'tech@baz.com', pass: 'pass123', role: 'vendor', contact: '9876543210', address: '22 MG Road', status: 'active' 
            });
            const savedVendor = await vendor.save();
            vendorId = savedVendor._id;
            messages.push("✅ Created Vendor (tech@baz.com)");
        } else {
            messages.push("ℹ️ Default Vendor already exists.");
        }

        // 3. Check & Create Default User
        const userExists = await User.findOne({ email: 'alice@mail.com' });
        if (!userExists) {
            const user = new User({ 
                name: 'Alice Kumar', email: 'alice@mail.com', pass: 'pass123', role: 'user', address: '12 Park St', city: 'Kolkata', status: 'active' 
            });
            await user.save();
            messages.push("✅ Created User (alice@mail.com)");
        } else {
            messages.push("ℹ️ Default User already exists.");
        }

        // 4. Create Sample Products (Only if Vendor was just created or products are empty)
        const productCount = await Product.countDocuments();
        if (productCount === 0 && vendorId) {
            await Product.create([
                { vendorId: vendorId.toString(), name: 'LED Stage Light', price: 1200, category: 'Lighting', image: '💡', status: 'active' },
                { vendorId: vendorId.toString(), name: 'Wireless Mic Set', price: 3500, category: 'Audio', image: '🎙️', status: 'active' },
                { vendorId: vendorId.toString(), name: 'Event Backdrop', price: 2800, category: 'Decor', image: '🎪', status: 'active' }
            ]);
            messages.push("✅ Created 3 Sample Products");
        } else {
            messages.push("ℹ️ Products already exist.");
        }

        res.send(`
            <h1>Database Status</h1>
            <ul>${messages.map(m => `<li>${m}</li>`).join('')}</ul>
            <p><strong>Admin Login:</strong> admin@ems.com / admin123</p>
            <br>
            <a href="/">Go Back</a>
        `);
    } catch (err) {
        res.status(500).send("Error seeding database: " + err.message);
    }
});

app.get('/', (req, res) => res.send("API is Running!"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));