require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 1. CONNECT TO MONGODB (Replace with your actual connection string)
mongoose.connect(process.env.MONGO_URI) // No options object needed!
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("Connection error:", err));

// 2. DEFINE DATA MODELS (Schemas)
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    pass: String,
    role: String, // 'user', 'vendor', 'admin'
    address: String,
    city: String
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
    items: Array, // [{ productId, qty, name, price }]
    total: Number,
    status: { type: String, default: 'Received' },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// 3. API ROUTES (The "Endpoints")

// -- Login Route --
app.post('/api/login', async (req, res) => {
    const { email, pass, role } = req.body;
    const user = await User.findOne({ email, pass, role });
    if (user) {
        res.json({ success: true, user });
    } else {
        res.json({ success: false, message: "Invalid credentials" });
    }
});

// -- Signup Route --
app.post('/api/signup', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (e) {
        res.json({ success: false, message: "Email already exists" });
    }
});

// -- Get All Products --
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// -- Add Product (Vendor) --
app.post('/api/products', async (req, res) => {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json({ success: true });
});

// -- Place Order --
app.post('/api/orders', async (req, res) => {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.json({ success: true, orderId: newOrder._id });
});

// -- Get User Orders --
app.get('/api/orders/:userId', async (req, res) => {
    const orders = await Order.find({ userId: req.params.userId });
    res.json(orders);
});

// Start Server
app.listen(5000, () => console.log("Server running on port 5000"));