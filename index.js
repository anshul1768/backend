//! create an express server and check if it's working
import express from "express";
import cors from "cors"; // cross origin resource sharing (browser blocks the request which comes from anywhere but localhost:8000)
// 1) we are importing express module which we installed using npm i
import connectDB from "./db/connectDB.js";
import userRoutes from "./routes/auth-route.js";
import sessionRoutes from "./routes/session-route.js";
import aiRoutes from "./routes/ai-route.js";
// 2) call/invoke the function
let app = express(); // object = {listen}
const port=9000;
const allowedOrigin=["http://localhost:5173","https://frontend-yteh.vercel.app/"]
app.use(
  cors({
    origin: allowedOrigin,
  }),
);

app.use(express.urlencoded({ extended: true }));// this 
app.use(express.json());
app.get("/",(req,res)=>{
  res.send("hello");
})
app.use("/api/auth", userRoutes); // http://localhost:9001/api/auth/signup
app.use("/api/sessions",sessionRoutes);


app.use("/api/ai", aiRoutes);
// 3) assign a port number to our server
connectDB();

app.listen(port, () => {
  console.log(`server started at port ${port} `);
});
// app.listen(PORT_NUMBER, callback)

//! to check if the server is running, in cmd(git bash), goto backend folder and type "npx nodemon index.js"
// open browser -> localhost:PORT_NUMBER and press enter

// https://nodejs.org/en/ (/) =>  this is base url
// https://nodejs.org/en/blog => /blog is one endpoint
// https://nodejs.org/en/download

// https://github.com/Sarvesh-1999/NIGHT-CODING-MARATHON
