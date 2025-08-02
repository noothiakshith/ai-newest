import jwt from "jsonwebtoken";

export const verifytoken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userid = decoded.userId; // ✅ This must match what's signed in login
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};
