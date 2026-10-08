import express from "express"
import dotenv from "dotenv"
dotenv.config()
import cors from "cors"
import cookieParser from "cookie-parser"
import morgan from "morgan"
import proxy from "express-http-proxy"
import { protect } from "./middleware/protect.js"
import { getCurrentUser } from "./controllers/user.controller.js"
import { proxyWithHeader } from "./utils/proxyWithHeader.js"
import http from "http"
import httpProxy from "http-proxy"

const port = process.env.PORT || 8000

const app = express()
app.use(cors({
    origin: process.env.FRONTEND_URL,          //FRONTEND URL is defined in .env file isko cors me allow krne ke liye use kiya hai
    credentials: true
}))

app.use(cookieParser())
app.use(morgan("dev"))
const server = http.createServer(app)
//import proxy from "express-http-proxy" yeh route krne ke liye use hota hai jaise ki auth, project, file, ai, terminal, payment service ko gateway se route krne ke liye use hota hai
// agar user auth service ke liye request bhejta hai toh gateway usko auth service ke route pe bhej dega aur auth service ka response user ko wapas bhej dega

// similarly all other services ke liye bhi same kaam karega jaise ki project, file, ai, terminal, payment service ke liye bhi same kaam karega

// Free hosting (Render) puts idle services to sleep. Wake them all together on any request,
// and make a request wait until its own service is awake instead of failing with 502.
const SERVICES = [process.env.AUTH_SERVICE, process.env.PROJECT_SERVICE, process.env.FILE_SERVICE, process.env.AI_SERVICE, process.env.TERMINAL_SERVICE, process.env.PAYMENT_SERVICE].filter(Boolean)
const lastAwake = {}, pending = {}
const ensureAwake = (url) => {
    if (!url || Date.now() - (lastAwake[url] || 0) < 10 * 60 * 1000) return Promise.resolve()
    return pending[url] ||= (async () => {
        for (let i = 0; i < 15; i++) {
            try {
                // Render serves an HTML "Application loading" page while a service wakes; only a real JSON reply means it's up
                const r = await fetch(url === process.env.TERMINAL_SERVICE ? `${url}/health` : url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) })
                if (r.status < 500 && (r.headers.get("content-type") || "").includes("application/json")) { lastAwake[url] = Date.now(); return }
            } catch { }
            await new Promise(r => setTimeout(r, 4000))
        }
    })().finally(() => { delete pending[url] })
}
app.use((req, res, next) => { SERVICES.forEach(s => ensureAwake(s)); next() })
const wake = (url) => async (req, res, next) => { await ensureAwake(url); next() }

app.use("/api/auth", wake(process.env.AUTH_SERVICE), proxy(process.env.AUTH_SERVICE || "http://localhost:8001"))
app.use("/api/project", protect, wake(process.env.PROJECT_SERVICE), proxyWithHeader(process.env.PROJECT_SERVICE || "http://localhost:8002"))
app.use("/api/file", protect, wake(process.env.FILE_SERVICE), proxyWithHeader(process.env.FILE_SERVICE || "http://localhost:8003"))
app.use("/api/ai", protect, wake(process.env.AI_SERVICE), proxyWithHeader(process.env.AI_SERVICE || "http://localhost:8004"))
app.use("/api/terminal", protect, wake(process.env.TERMINAL_SERVICE), proxy(process.env.TERMINAL_SERVICE || "http://localhost:8005"))
app.use("/api/payment", protect, wake(process.env.PAYMENT_SERVICE), proxyWithHeader(process.env.PAYMENT_SERVICE || "http://localhost:8006"))
app.get("/api/me", protect, getCurrentUser)

app.get("/", (req, res) => {
    res.json({ "message": "hello from gateway" })
})

const socketProxy=httpProxy.createProxyServer({
    target:process.env.TERMINAL_SERVICE || "http://localhost:8005",
    ws:true
})

app.use("/socket.io",(req,res)=>{
   socketProxy.web(req,res,{
      target:process.env.TERMINAL_SERVICE || "http://localhost:8005"
   })
})

server.on("upgrade",(req,socket,head)=>{
    if(req.url.startsWith("/socket.io")){
        socketProxy.ws(req,socket,head,{
            target:process.env.TERMINAL_SERVICE || "http://localhost:8005"
        })
    }
})

server.listen(port,"0.0.0.0",() => {
    console.log(`gateway started at ${port}`)
    SERVICES.forEach(s => ensureAwake(s))
})