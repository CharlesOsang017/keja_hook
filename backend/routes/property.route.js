import express from 'express'
import { createProperty } from '../controllers/property.controller.js'

const router = express.Router()

router.post("/create-property", createProperty)

export default router