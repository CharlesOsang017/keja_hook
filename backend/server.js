import express from 'express'
import dotenv from  'dotenv'
import { connectDB } from './config/db.js'

dotenv.config()

const app = express()


const port = process.env.PORT || 6000

app.listen(port, async ()=>{
    await connectDB()
    console.log(`The app is running on port ${port}`)
})