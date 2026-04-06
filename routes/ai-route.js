// import express from "express";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const router = express.Router();

// const genAI = new GoogleGenerativeAI("AIzaSyB_rK6A4-QhY-qBRz977VpVCn62uT1fV0w");

// router.post("/generate-questions", async (req, res) => {
//   try {
//     const { role, experience } = req.body;

//     const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//     const prompt = `Generate 5 interview questions for a ${role} with ${experience} experience.`;

//     const result = await model.generateContent(prompt);
//     const response = result.response.text();

//     res.json({
//       success: true,
//       questions: response,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "AI generation failed",
//     });
//   }
// });

// export default router;
import express from "express";
import { generateInterviewQuestions } from "../controller/ai-controller.js";
import { protect } from "../middlewares/auth-middleware.js";

const router = express.Router();

// ✅ Use controller (clean architecture)
router.post("/generate-questions", protect, generateInterviewQuestions);

export default router;