import jwt from "jsonwebtoken";
import User from "../models/user-model.js";

// Middleware to protect routes
export const protect = async (req, res, next) => {
  console.log("AUTH HEADER:", req.headers.authorization);


  try {
    let token = req.headers.authorization;

    if (token && token.startsWith("Bearer ")) {
      token = token.split(" ")[1];

      const decoded = jwt.verify(token, "secret");
      console.log("DECODED:", decoded);
      req.user = await User.findById(decoded.userId).select("-password");
      console.log("USER:", req.user);


      next();
    } else {
      res.status(401).json({ message: "Not authorized, no token" });
    }
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Not authorized, invalid token" });
  }
};
