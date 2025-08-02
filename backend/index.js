import express from 'express';
import authroutes from "./routes/authroutes.js"
import creationroutes from './routes/creation.js'
import moduleroutes from './routes/moduleroutes.js'
const app = express();
app.use(express.json());
app.use('/auth',authroutes)
app.use('/api',creationroutes)
app.use('/api',moduleroutes)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
