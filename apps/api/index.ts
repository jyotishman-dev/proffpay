

import { configDotenv } from "dotenv";
import app from "./src/app";
import {createServer} from "http"
import { Server } from "socket.io";



configDotenv();

const PORT = process.env.PORT || 4001

const httpServer = createServer(app)

const io  = new  Server(httpServer , {
    cors : {origin:"http://localhost:3000"}
})

io.on("connection", (socket)=>{
   
    socket.on("job:watch"  ,  (jobId : string) => socket.join(`job:${jobId}`))
})






httpServer.listen(PORT , ()=>{
    console.log(`api on :${PORT}`)
})