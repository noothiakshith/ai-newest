import express from 'express';
import courseRoutes from "./routes/courseroutes.js"

const app = express();
app.use(express.json());
app.use('/api', courseRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
