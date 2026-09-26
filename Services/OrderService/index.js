import session from './security/session.cjs';
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/db.js";
import orderRoutes from "./routes/orderRoutes.js";

dotenv.config();

const app = express();

app.use(cors({origin: session.origins(), credentials: true}));
app.use(helmet());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/orders", orderRoutes);

app.get("/", (req, res) => res.send("Order Service Running"));

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`Order Service running on port ${PORT}`));