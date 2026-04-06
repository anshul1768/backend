import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";
import Question from "../models/question-model.js";
import Session from "../models/session-model.js";
import {
  conceptExplainPrompt,
  questionAnswerPrompt,
} from "../utils/prompts-util.js";

const ai = new GoogleGenAI({ apiKey: "AIzaSyB_rK6A4-QhY-qBRz977VpVCn62uT1fV0w" });

// @desc    Generate + SAVE interview questions for a session
// @route   POST /api/ai/generate-questions
// @access  Private
// export const generateInterviewQuestions = async (req, res) => {
//   console.log("hi");
//   try {
//     const { sessionId } = req.body; //! read sessionId, not role/experience

//     if (!sessionId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "sessionId is required" });
//     }

//     //? 1. fetch session → get role, experience, topicsToFocus
//     const session = await Session.findById(sessionId);
//     if (!session) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Session not found" });
//     }

//     if (session.user.toString() !== req.user._id.toString()) {
//       return res
//         .status(403)
//         .json({ success: false, message: "Not authorized" });
//     }

//     const { role, experience, topicsToFocus } = session;
//     console.log("session: ", session);

//     //? 2. generate via Gemini
//     const prompt = questionAnswerPrompt(role, experience, topicsToFocus, 10);
//     const response = await ai.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: prompt,
//     });
//     console.log("response: ", response);

//     const parts = response.candidates?.[0]?.content?.parts ?? [];
//     const rawText = parts
//       .filter((p) => !p.thought) // gemini-2.5-flash includes thinking parts; skip them
//       .map((p) => p.text ?? "")
//       .join("");

//     const cleanedText = rawText
//       .replace(/^```json\s*/, "")
//       .replace(/^```\s*/, "")
//       .replace(/```$/, "")
//       .replace(/^json\s*/, "")
//       .trim();

//     let questions;
//     try {
//       questions = JSON.parse(cleanedText);
//     } catch {
//       const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
//       if (jsonMatch) questions = JSON.parse(jsonMatch[0]);
//       else throw new Error("Failed to parse AI response as JSON");
//     }

//     if (!Array.isArray(questions)) throw new Error("Response is not an array");

//     //! 4. save to DB — was completely missing before
//     const saved = await Question.insertMany(
//       questions.map((q) => ({
//         session: sessionId,
//         question: q.question,
//         answer: q.answer || "",
//         note: "",
//         isPinned: false,
//       })),
//     );

//     //! 5. attach IDs to session
//     session.questions.push(...saved.map((q) => q._id));
//     await session.save();

//     res.status(201).json({ success: true, data: saved });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to generate questions",
//       error: error.message,
//     });
//   }
// };
export const generateInterviewQuestions = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    // ✅ Get session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // ✅ Auth check
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const { role, experience, topicsToFocus } = session;

    // ✅ Generate prompt
    const prompt = questionAnswerPrompt(
      role,
      experience,
      topicsToFocus,
      10
    );

    // ✅ Gemini call (stable model)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    // ✅ SAFE TEXT EXTRACTION (FIXED)
    let rawText = "";

    if (response.candidates?.length) {
      rawText = response.candidates[0]?.content?.parts
        ?.filter((p) => !p.thought)
        .map((p) => p.text || "")
        .join("");
    }

    if (!rawText) {
      rawText = response.text || "";
    }

    console.log("RAW AI TEXT:", rawText);

    if (!rawText) {
      throw new Error("Empty response from AI");
    }

    // ✅ CLEAN TEXT
    const cleanedText = rawText
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```$/, "")
      .replace(/^json\s*/, "")
      .trim();

    // ✅ SAFE PARSE (VERY IMPORTANT)
    let questions;

    try {
      questions = JSON.parse(cleanedText);
    } catch {
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        // 🔥 fallback (NO CRASH)
        questions = cleanedText
          .split("\n")
          .filter((q) => q.trim())
          .map((q) => ({ question: q }));
      }
    }

    if (!Array.isArray(questions)) {
      throw new Error("AI response is not an array");
    }

    // ✅ SAVE QUESTIONS
    const saved = await Question.insertMany(
      questions.map((q) => ({
        session: sessionId,
        question: q.question || q, // 🔥 fix
        answer: q.answer || "",
        note: "",
        isPinned: false,
      }))
    );

    // ✅ LINK TO SESSION
    session.questions.push(...saved.map((q) => q._id));
    await session.save();

    // ✅ RESPONSE
    res.status(201).json({
      success: true,
      count: saved.length,
      data: saved,
    });

  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate questions",
    });
  }
};

// @desc    Generate explanation for an interview question
// @route   POST /api/ai/generate-explanation
// @access  Private
// export const generateConceptExplanation = async (req, res) => {
//   try {
//     const { question } = req.body;

//     if (!question) {
//       return res.status(400).json({
//         success: false,
//         message: "Question is required",
//       });
//     }

//     const prompt = conceptExplainPrompt(question);

//     const response = await ai.models.generateContent({
//       model: "gemini-2.0-flash-lite",
//       contents: prompt,
//     });

//     let rawText = response.text;

//     // Clean it: Remove backticks, json markers, and any extra formatting
//     const cleanedText = rawText
//       .replace(/^```json\s*/, "")
//       .replace(/^```\s*/, "")
//       .replace(/```$/, "")
//       .replace(/^json\s*/, "")
//       .trim();

//     // Parse the cleaned JSON
//     let explanation;
//     try {
//       explanation = JSON.parse(cleanedText);
//     } catch (parseError) {
//       // If parsing fails, try to extract JSON object from text
//       const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         explanation = JSON.parse(jsonMatch[0]);
//       } else {
//         throw new Error("Failed to parse AI response as JSON");
//       }
//     }

//     // Validate the response structure
//     if (!explanation.title || !explanation.explanation) {
//       throw new Error(
//         "Response missing required fields: title and explanation",
//       );
//     }

//     res.status(200).json({
//       success: true,
//       data: explanation,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to generate explanation",
//       error: error.message,
//     });
//   }
// };
export const generateConceptExplanation = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    const prompt = conceptExplainPrompt(question);

    // const response = await ai.models.generateContent({
    //   model: "gemini-1.5-flash", // ✅ stable
    //   contents: prompt,
    // });
    const response = await Promise.race([
  ai.models.generateContent({
    model: "gemini-2.0-flash", // safer
    contents: prompt,
  }),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("AI timeout")), 8000)
  ),
]);

    // ✅ SAFE TEXT EXTRACTION
    let rawText = "";

    if (response.candidates?.length) {
      rawText = response.candidates[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("");
    }

    if (!rawText) {
      rawText = response.text || "";
    }

    console.log("RAW EXPLANATION:", rawText);

    if (!rawText) {
      throw new Error("Empty AI response");
    }

    // ✅ CLEAN TEXT
    const cleanedText = rawText
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```$/, "")
      .replace(/^json\s*/, "")
      .trim();

    // ✅ SAFE PARSE
    let explanation;

    try {
      explanation = JSON.parse(cleanedText);
    } catch {
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        explanation = JSON.parse(jsonMatch[0]);
      } else {
        // 🔥 fallback (NO CRASH)
        explanation = {
          title: "Explanation",
          explanation: cleanedText,
        };
      }
    }

    // ✅ SAFE STRUCTURE (NO CRASH)
    const finalData = {
      title: explanation.title || "Concept Explanation",
      explanation: explanation.explanation || cleanedText,
    };

    res.status(200).json({
      success: true,
      data: finalData,
    });

  } catch (error) {
    console.error("EXPLANATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate explanation",
    });
  }
};
// export const getSessionById = async (req, res) => {
//   try {
//     const session = await Session.findById(req.params.id).populate("questions"); // ← this was missing

//     if (!session)
//       return res
//         .status(404)
//         .json({ success: false, message: "Session not found" });

//     res.status(200).json({ success: true, session });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
export const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate("questions");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.status(200).json({
      success: true,
      session,
    });

  } catch (error) {
    console.error("SESSION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};