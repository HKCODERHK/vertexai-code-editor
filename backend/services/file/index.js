import express from "express"
import dotenv from "dotenv"
import { connectDb } from "./config/db.js"
import router from "./routes/file.route.js"
dotenv.config()
import dns from "node:dns";

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

const port =process.env.PORT || 8003

const app=express()
app.use(express.json())
app.use("/",router)
app.get("/",(req,res)=>{
  res.json({"message":"hello from file service"})
})

app.listen(port,()=>{
    connectDb()
    console.log(`file service started at ${port}`)
})