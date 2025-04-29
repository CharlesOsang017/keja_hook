import express from 'express'
import dotenv from  'dotenv'
import { connectDB } from './config/db.js'
import userRouter from './routes/user.route.js'
import propertyRoute from './routes/property.route.js'

dotenv.config()

const app = express()

app.use(express.json())

app.use("/api/users", userRouter)
app.use("/api/properties", propertyRoute)

const port = process.env.PORT || 6000

app.listen(port, async ()=>{
    await connectDB()
    console.log(`The app is running on port ${port}`)
})