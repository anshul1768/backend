import mongoose from "mongoose";

const connectDB=async()=>{
    try {
         const connect=await mongoose.connect("mongodb+srv://iamanshul2211_db_user:anshul9542@cluster0.m9g8peu.mongodb.net/?appName=Cluster0");

         console.log("mongodb connected");


    } catch (error) {
        console.log("mongo db error");
    }
    
}
export default connectDB;