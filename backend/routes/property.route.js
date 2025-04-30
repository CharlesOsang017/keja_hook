import express from 'express'
import { createProperty, getAllProperties } from '../controllers/property.controller.js'

const router = express.Router()

router.post("/create-property", createProperty)
router.get("/all-properties", getAllProperties)

export default router