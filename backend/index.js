import express from 'express';
import courseRoutes from "./routes/courseroutes.js"
import authroutes from "./routes/authroutes.js"
const app = express();
app.use(express.json());
app.use('/api', courseRoutes);
app.use('/auth',authroutes)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
