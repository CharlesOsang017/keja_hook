import express from 'express'
import dotenv from  'dotenv'
import { connectDB } from './config/db.js'
import userRouter from './routes/user.route.js'

dotenv.config()

const app = express()


app.use("/api/users", userRouter)

const port = process.env.PORT || 6000

app.listen(port, async ()=>{
    await connectDB()
    console.log(`The app is running on port ${port}`)
})